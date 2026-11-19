import datetime
import json
from decimal import Decimal, InvalidOperation

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.core.paginator import Paginator
from django.db.models import Count, Exists, OuterRef, Q
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from .models import Event

FALLBACK_IMAGES = {
    Event.Category.MUSIC: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1000&q=80",
    Event.Category.ARTS: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1000&q=80",
    Event.Category.FOOD: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1000&q=80",
    Event.Category.BUSINESS: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80",
    Event.Category.WELLNESS: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1000&q=80",
    Event.Category.COMMUNITY: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80",
    Event.Category.UNIVERSITY: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1000&q=80",
    Event.Category.SPORTS: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1000&q=80",
    Event.Category.TECH: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80",
    Event.Category.FAITH: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1000&q=80",
    Event.Category.NIGHTLIFE: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&w=1000&q=80",
    Event.Category.COMEDY: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1000&q=80",
    Event.Category.CAREER: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=80",
}
DEFAULT_IMAGE = FALLBACK_IMAGES[Event.Category.COMMUNITY]

DEFAULT_DESCRIPTION = (
    "A gathering for curious people, bright ideas and the kind of energy that stays with you "
    "long after the night ends."
)


def health_check(request):
    return HttpResponse("OK", status=200)


def user_payload(user):
    if not user.is_authenticated:
        return None
    return {
        "id": user.id,
        "username": user.username,
        "firstName": user.first_name or user.username,
        "email": user.email,
    }


def price_amount(event):
    if event.price == event.price.to_integral():
        return str(int(event.price))
    return f"{event.price:.2f}"


def price_label(event):
    if event.is_free or event.price == 0:
        return "Free"
    if event.price == event.price.to_integral():
        return f"₦{int(event.price):,}"
    return f"₦{event.price:,.2f}"


def event_payload(event, user):
    host = event.host_name or event.created_by.get_full_name() or event.created_by.username
    initials = "".join(part[0] for part in host.split()[:2]).upper() or "H"
    attending = getattr(event, "user_attending", None)
    saved = getattr(event, "user_saved", None)
    if attending is None:
        attending = user.is_authenticated and event.attendees.filter(pk=user.pk).exists()
    if saved is None:
        saved = user.is_authenticated and event.saved_by.filter(pk=user.pk).exists()
    attendee_count = getattr(event, "attendee_count", None)
    if attendee_count is None:
        attendee_count = event.attendees.count()

    return {
        "id": event.id,
        "slug": event.slug,
        "title": event.title,
        "description": event.description or DEFAULT_DESCRIPTION,
        "descriptionText": event.description,
        "category": event.category,
        "eventType": event.get_event_type_display(),
        "date": event.date.isoformat(),
        "dateLabel": f"{event.date.strftime('%a').upper()}, {event.date.strftime('%b').upper()} {event.date.day}",
        "month": event.date.strftime("%b").upper(),
        "day": event.date.day,
        "time": event.time.strftime("%I:%M %p").lstrip("0"),
        "timeValue": event.time.strftime("%H:%M"),
        "location": event.location,
        "price": price_label(event),
        "priceAmount": price_amount(event),
        "isFree": event.is_free or event.price == 0,
        "image": event.image or FALLBACK_IMAGES.get(event.category, DEFAULT_IMAGE),
        "flyer": event.image,
        "tag": event.tag,
        "attendees": attendee_count,
        "organizer": host,
        "organizerInitials": initials,
        "inviter": event.created_by.first_name or event.created_by.username,
        "isAttending": bool(attending),
        "isSaved": bool(saved),
        "isOwner": user.is_authenticated and event.created_by_id == user.id,
        "isPast": event.is_past,
        "isPublished": event.is_published,
    }


def event_queryset(user):
    queryset = Event.objects.select_related("created_by").annotate(
        attendee_count=Count("attendees", distinct=True)
    )
    if user.is_authenticated:
        through_attending = Event.attendees.through.objects.filter(
            event_id=OuterRef("pk"),
            user_id=user.pk,
        )
        through_saved = Event.saved_by.through.objects.filter(
            event_id=OuterRef("pk"),
            user_id=user.pk,
        )
        queryset = queryset.annotate(
            user_attending=Exists(through_attending),
            user_saved=Exists(through_saved),
        )
    return queryset


def read_json(request):
    try:
        body = request.body.decode() or "{}"
        data = json.loads(body)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    if not isinstance(data, dict):
        return None
    return data


def json_error(message, status=400, errors=None):
    payload = {"detail": message}
    if errors:
        payload["errors"] = errors
    return JsonResponse(payload, status=status)


def apply_event_data(event, data, partial=False):
    errors = {}

    def provided(key):
        return key in data or not partial

    if provided("title"):
        title = str(data.get("title", "")).strip()
        if not title:
            errors["title"] = "Give your event a name."
        elif len(title) > 140:
            errors["title"] = "Keep the title under 140 characters."
        else:
            event.title = title

    if provided("category"):
        category = " ".join(str(data.get("category", "")).split())
        if not category or category.lower() in {"all events", "write your own"}:
            errors["category"] = "Choose a category, or write your own."
        elif len(category) > 48:
            errors["category"] = "Keep the category under 48 characters."
        else:
            event.category = category

    if provided("eventType"):
        labels = {label: value for value, label in Event.EventType.choices}
        raw = str(data.get("eventType", "")).strip()
        event_type = labels.get(raw, raw)
        if event_type not in Event.EventType.values:
            errors["eventType"] = "Choose an event type."
        else:
            event.event_type = event_type

    if provided("date"):
        try:
            event.date = datetime.date.fromisoformat(str(data.get("date", "")))
        except ValueError:
            errors["date"] = "Choose a valid date."

    if provided("time"):
        raw_time = str(data.get("time", "")).strip()
        parsed = None
        for fmt in ("%H:%M", "%H:%M:%S"):
            try:
                parsed = datetime.datetime.strptime(raw_time, fmt).time()
                break
            except ValueError:
                continue
        if parsed is None:
            errors["time"] = "Choose a start time."
        else:
            event.time = parsed

    if provided("location"):
        location = str(data.get("location", "")).strip()
        if not location:
            errors["location"] = "Add a venue or link."
        elif len(location) > 200:
            errors["location"] = "Keep the location under 200 characters."
        else:
            event.location = location

    if "description" in data or not partial:
        description = str(data.get("description", "")).strip()
        if len(description) > 2000:
            errors["description"] = "Keep the description under 2,000 characters."
        else:
            event.description = description

    if "image" in data or not partial:
        image = str(data.get("image", "")).strip()
        if image and not image.startswith(("http://", "https://")):
            errors["image"] = "Paste a flyer link that starts with http:// or https://."
        elif len(image) > 200:
            errors["image"] = "That flyer link is too long."
        else:
            event.image = image

    if "tag" in data:
        event.tag = str(data.get("tag", "")).strip()[:40]

    if "hostName" in data or not partial:
        host_name = str(data.get("hostName", "")).strip()
        if len(host_name) > 80:
            errors["hostName"] = "Keep the host name under 80 characters."
        else:
            event.host_name = host_name

    is_free = data.get("isFree", True) if provided("isFree") else event.is_free
    if isinstance(is_free, str):
        is_free = is_free.lower() in {"1", "true", "yes", "on"}
    event.is_free = bool(is_free)

    if event.is_free:
        event.price = Decimal("0")
    elif provided("price") or "price" in data:
        try:
            raw_price = str(data.get("price", "")).replace("$", "").replace("₦", "").replace(",", "").strip()
            price = Decimal(raw_price)
        except (InvalidOperation, AttributeError):
            errors["price"] = "Enter a ticket price."
            price = None
        if price is not None and price <= 0:
            errors["price"] = "Enter a ticket price above zero, or mark the event as free."
        elif price is not None:
            event.price = price.quantize(Decimal("0.01"))

    return errors


@ensure_csrf_cookie
@require_http_methods(["GET"])
def session_view(request):
    return JsonResponse({"user": user_payload(request.user)})


@require_http_methods(["POST"])
def login_view(request):
    data = read_json(request)
    if data is None:
        return json_error("Send a JSON body.")
    user = authenticate(
        request,
        username=str(data.get("username", "")).strip(),
        password=data.get("password", ""),
    )
    if user is None:
        return json_error("Those sign-in details don't match an account.")
    login(request, user)
    return JsonResponse({"user": user_payload(user)})


@require_http_methods(["PATCH"])
def profile_view(request):
    if not request.user.is_authenticated:
        return json_error("Sign in to update your account.", status=401)
    data = read_json(request)
    if data is None:
        return json_error("Send a JSON body.")

    first_name = str(data.get("firstName", "")).strip()
    email = str(data.get("email", "")).strip()
    if not first_name:
        return json_error("Add your name.")
    if len(first_name) > 150:
        return json_error("Keep your name under 150 characters.")
    if email:
        try:
            validate_email(email)
        except ValidationError:
            return json_error("Enter a valid email address.")
        if User.objects.exclude(pk=request.user.pk).filter(email__iexact=email).exists():
            return json_error("That email is already used by another account.")

    request.user.first_name = first_name
    request.user.email = email
    request.user.save(update_fields=["first_name", "email"])
    return JsonResponse({"user": user_payload(request.user)})


@require_http_methods(["POST"])
def logout_view(request):
    logout(request)
    return JsonResponse({"user": None})


@require_http_methods(["POST"])
def register_view(request):
    data = read_json(request)
    if data is None:
        return json_error("Send a JSON body.")

    username = str(data.get("username", "")).strip()
    password = data.get("password", "")
    confirm = data.get("passwordConfirm", "")
    first_name = str(data.get("firstName", "")).strip()

    if not username:
        return json_error("Choose a username.")
    if password != confirm:
        return json_error("Passwords do not match.")
    if User.objects.filter(username__iexact=username).exists():
        return json_error("That username is already taken.")

    user = User(username=username, first_name=first_name)
    try:
        validate_password(password, user)
    except ValidationError as exc:
        return json_error(exc.messages[0])

    user.set_password(password)
    user.save()
    login(request, user)
    return JsonResponse({"user": user_payload(user)}, status=201)


@require_http_methods(["GET", "POST"])
def events_view(request):
    if request.method == "POST":
        if not request.user.is_authenticated:
            return json_error("Sign in to create an event.", status=401)
        data = read_json(request)
        if data is None:
            return json_error("Send a JSON body.")
        event = Event(created_by=request.user)
        errors = apply_event_data(event, data)
        if errors:
            return json_error("Check the highlighted fields.", errors=errors)
        if not event.host_name:
            event.host_name = request.user.get_full_name() or request.user.username
        event.is_published = data.get("isPublished", True) is not False
        event.save()
        event = event_queryset(request.user).get(pk=event.pk)
        return JsonResponse(event_payload(event, request.user), status=201)

    events = event_queryset(request.user)
    search = request.GET.get("search", "").strip()
    category = request.GET.get("category", "").strip()
    timeframe = request.GET.get("timeframe", "anytime").strip()

    if search:
        events = events.filter(
            Q(title__icontains=search)
            | Q(location__icontains=search)
            | Q(category__icontains=search)
            | Q(host_name__icontains=search)
            | Q(description__icontains=search)
        )
    if category and category != "All events":
        events = events.filter(category=category)

    price_filter = request.GET.get("price", "").strip()
    if price_filter == "free":
        events = events.filter(Q(is_free=True) | Q(price=0))
    elif price_filter == "paid":
        events = events.filter(is_free=False, price__gt=0)

    event_type = request.GET.get("eventType", "").strip()
    type_labels = {label: value for value, label in Event.EventType.choices}
    if event_type in type_labels:
        events = events.filter(event_type=type_labels[event_type])

    today = timezone.localdate()
    if timeframe == "this_week":
        events = events.filter(date__range=[today, today + datetime.timedelta(days=7)])
    else:
        events = events.filter(date__gte=today)

    events = events.filter(is_published=True).order_by("date", "time")

    paginator = Paginator(events, 6)
    page = paginator.get_page(request.GET.get("page"))
    return JsonResponse(
        {
            "results": [event_payload(event, request.user) for event in page.object_list],
            "count": paginator.count,
            "page": page.number,
            "hasNext": page.has_next(),
        }
    )


@require_http_methods(["GET", "PATCH", "DELETE"])
def event_detail_view(request, slug):
    event = event_queryset(request.user).filter(slug=slug).first()
    if event is None or (
        not event.is_published and event.created_by_id != getattr(request.user, "id", None)
    ):
        return json_error("That event could not be found.", status=404)

    if request.method == "GET":
        return JsonResponse(event_payload(event, request.user))

    if not request.user.is_authenticated:
        return json_error("Sign in to manage this event.", status=401)
    if event.created_by_id != request.user.id:
        return json_error("Only the organizer can change this event.", status=403)
    if event.is_past and request.method == "PATCH":
        return json_error("Past events cannot be edited.")

    if request.method == "DELETE":
        event.delete()
        return JsonResponse({"detail": "Event deleted."})

    data = read_json(request)
    if data is None:
        return json_error("Send a JSON body.")
    errors = apply_event_data(event, data, partial=True)
    if errors:
        return json_error("Check the highlighted fields.", errors=errors)
    if "isPublished" in data:
        event.is_published = data.get("isPublished") is not False
    event.save()
    event = event_queryset(request.user).get(pk=event.pk)
    return JsonResponse(event_payload(event, request.user))


@require_http_methods(["POST"])
def rsvp_view(request, slug):
    if not request.user.is_authenticated:
        return json_error("Sign in to get a ticket.", status=401)
    event = event_queryset(request.user).filter(slug=slug, is_published=True).first()
    if event is None:
        return json_error("That event could not be found.", status=404)
    if event.is_past:
        return json_error("This event has already ended.")
    if not event.is_free and event.price > 0 and not event.attendees.filter(pk=request.user.pk).exists():
        return json_error("Ticket payment opens in the app soon. You can still save this event.")

    if event.attendees.filter(pk=request.user.pk).exists():
        event.attendees.remove(request.user)
        message = f"You left {event.title}."
    else:
        event.attendees.add(request.user)
        message = "You're registered. Your ticket is saved under My tickets."

    event = event_queryset(request.user).get(pk=event.pk)
    payload = event_payload(event, request.user)
    payload["detail"] = message
    return JsonResponse(payload)


@require_http_methods(["POST"])
def save_view(request, slug):
    if not request.user.is_authenticated:
        return json_error("Sign in to save an event.", status=401)
    event = event_queryset(request.user).filter(slug=slug, is_published=True).first()
    if event is None:
        return json_error("That event could not be found.", status=404)

    if event.saved_by.filter(pk=request.user.pk).exists():
        event.saved_by.remove(request.user)
        message = "Removed from saved events."
    else:
        event.saved_by.add(request.user)
        message = "Saved. Find it under My tickets."

    event = event_queryset(request.user).get(pk=event.pk)
    payload = event_payload(event, request.user)
    payload["detail"] = message
    return JsonResponse(payload)


@require_http_methods(["GET"])
def my_events_view(request):
    if not request.user.is_authenticated:
        return json_error("Sign in to see your tickets.", status=401)

    kind = request.GET.get("kind", "attending")
    events = event_queryset(request.user)
    if kind == "hosting":
        events = events.filter(created_by=request.user)
    elif kind == "saved":
        events = events.filter(saved_by=request.user)
    else:
        events = events.filter(attendees=request.user)

    results = [event_payload(event, request.user) for event in events]
    return JsonResponse({"results": results, "count": len(results), "kind": kind})
