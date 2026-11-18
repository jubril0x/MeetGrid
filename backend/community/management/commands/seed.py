import datetime
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from community.models import Event


IMAGES = {
    "confetti": "https://images.unsplash.com/photo-1603910234616-3b5f4a6be2b4?auto=format&fit=crop&w=1000&q=80",
    "crowd": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1000&q=80",
    "studio": "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1000&q=80",
    "food": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1000&q=80",
    "conference": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80",
    "park": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80",
}


class Command(BaseCommand):
    help = "Create a demo organizer and the sample events shown in the new UI."

    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(
            username="maya",
            defaults={"first_name": "Maya"},
        )
        if created:
            user.set_password("HappenDemo1")
            user.save()
            self.stdout.write("Created demo user maya / HappenDemo1")
        else:
            self.stdout.write("Demo user maya already exists")

        if Event.objects.exists():
            self.stdout.write("Events already exist, so nothing was seeded.")
            return

        today = timezone.localdate()
        saturday = today + datetime.timedelta(days=(5 - today.weekday()) % 7 or 7)
        samples = [
            {
                "title": "Neon Fields Festival",
                "category": Event.Category.MUSIC,
                "date": saturday,
                "time": datetime.time(18, 0),
                "location": "The Foundry, Brooklyn",
                "price": Decimal("48"),
                "is_free": False,
                "image": IMAGES["confetti"],
                "tag": "Trending",
            },
            {
                "title": "Clay, Coffee & Conversation",
                "category": Event.Category.ARTS,
                "date": saturday + datetime.timedelta(days=1),
                "time": datetime.time(10, 30),
                "location": "Soft Earth Studio, Queens",
                "price": Decimal("24"),
                "is_free": False,
                "image": IMAGES["studio"],
                "tag": "Few spots left",
            },
            {
                "title": "The Good Food Social",
                "category": Event.Category.FOOD,
                "date": saturday + datetime.timedelta(days=6),
                "time": datetime.time(17, 0),
                "location": "Pier 17, Manhattan",
                "is_free": True,
                "image": IMAGES["food"],
                "tag": "Popular",
            },
            {
                "title": "Future of Creative Work",
                "category": Event.Category.BUSINESS,
                "date": saturday + datetime.timedelta(days=10),
                "time": datetime.time(9, 0),
                "location": "Civic Hall, New York",
                "price": Decimal("79"),
                "is_free": False,
                "image": IMAGES["conference"],
                "tag": "Promoted",
            },
            {
                "title": "Sounds After Sunset",
                "category": Event.Category.MUSIC,
                "date": saturday + datetime.timedelta(days=13),
                "time": datetime.time(19, 30),
                "location": "Elsewhere, Brooklyn",
                "price": Decimal("36"),
                "is_free": False,
                "image": IMAGES["crowd"],
                "tag": "New",
            },
            {
                "title": "Sunday Reset Club",
                "category": Event.Category.WELLNESS,
                "date": saturday + datetime.timedelta(days=15),
                "time": datetime.time(8, 30),
                "location": "Prospect Park, Brooklyn",
                "is_free": True,
                "image": IMAGES["park"],
                "tag": "Community pick",
            },
        ]

        for sample in samples:
            Event.objects.create(
                created_by=user,
                host_name="Common Ground",
                description=(
                    "Come be part of a gathering designed for great energy, new connections and "
                    "moments you'll want to remember."
                ),
                event_type=Event.EventType.IN_PERSON,
                **sample,
            )

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(samples)} events."))
