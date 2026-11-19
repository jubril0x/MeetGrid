import datetime

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class Event(models.Model):
    class Category(models.TextChoices):
        MUSIC = "Music", "Music"
        ARTS = "Arts & culture", "Arts & culture"
        FOOD = "Food & drink", "Food & drink"
        BUSINESS = "Business", "Business"
        WELLNESS = "Wellness", "Wellness"
        COMMUNITY = "Community", "Community"
        UNIVERSITY = "University", "University"
        SPORTS = "Sports", "Sports"
        TECH = "Tech", "Tech"
        FAITH = "Faith", "Faith"
        NIGHTLIFE = "Nightlife", "Nightlife"
        COMEDY = "Comedy", "Comedy"
        CAREER = "Career", "Career"

    class EventType(models.TextChoices):
        IN_PERSON = "in_person", "In person"
        ONLINE = "online", "Online"
        HYBRID = "hybrid", "Hybrid"

    title = models.CharField(max_length=140)
    slug = models.SlugField(max_length=160, unique=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=48)
    event_type = models.CharField(
        max_length=16,
        choices=EventType.choices,
        default=EventType.IN_PERSON,
    )
    date = models.DateField()
    time = models.TimeField()
    location = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    is_free = models.BooleanField(default=True)
    image = models.URLField(blank=True)
    tag = models.CharField(max_length=40, blank=True)
    host_name = models.CharField(max_length=80, blank=True)
    is_published = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="hosted_events")
    created_at = models.DateTimeField(auto_now_add=True)
    attendees = models.ManyToManyField(User, related_name="attending_events", blank=True)
    saved_by = models.ManyToManyField(User, related_name="saved_events", blank=True)

    class Meta:
        ordering = ["date", "time"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self.title)
        super().save(*args, **kwargs)

    @property
    def is_past(self):
        event_datetime = datetime.datetime.combine(self.date, self.time)
        event_datetime = timezone.make_aware(event_datetime, timezone.get_current_timezone())
        return event_datetime < timezone.now()


def unique_slug(title, exclude_pk=None):
    base = slugify(title)[:140] or "event"
    slug = base
    number = 2
    queryset = Event.objects.all()
    if exclude_pk:
        queryset = queryset.exclude(pk=exclude_pk)
    while queryset.filter(slug=slug).exists():
        slug = f"{base}-{number}"
        number += 1
    return slug
