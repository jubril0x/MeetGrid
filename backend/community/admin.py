from django.contrib import admin

from .models import Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "date", "time", "location", "created_by")
    list_filter = ("category", "event_type", "is_free")
    search_fields = ("title", "location", "host_name")
    prepopulated_fields = {"slug": ("title",)}
