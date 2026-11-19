from django.urls import path

from . import views

urlpatterns = [
    path("api/auth/session/", views.session_view, name="session"),
    path("api/auth/login/", views.login_view, name="login"),
    path("api/auth/logout/", views.logout_view, name="logout"),
    path("api/auth/register/", views.register_view, name="register"),
    path("api/auth/profile/", views.profile_view, name="profile"),
    path("api/events/", views.events_view, name="events"),
    path("api/events/<slug:slug>/", views.event_detail_view, name="event_detail"),
    path("api/events/<slug:slug>/rsvp/", views.rsvp_view, name="rsvp"),
    path("api/events/<slug:slug>/save/", views.save_view, name="save_event"),
    path("api/me/events/", views.my_events_view, name="my_events"),
]
