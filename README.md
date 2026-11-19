# MeetGrid

MeetGrid is an event listing platform. The interface lives in `frontend` and talks to the Django API in `backend`.

The product name on screen is **happen.**

## Layout

- `frontend` — React, Vite, and Tailwind. Discovery, event pages, sign-in, tickets, and event creation.
- `backend` — Django. Accounts, events, RSVPs, saved events, and drafts.
- `.env` — stays at the project root and is not committed. Copy `.env.example` to `.env` before the first run.

The old Django templates are gone. The previous SQLite file at the project root is from that version and is not used by the new API.

## Run it

Copy the example environment file once, then fill in `SECRET_KEY`. Leave `DATABASE_URL` empty to use SQLite. Paste the Supabase Session pooler URI there when you want Django to use Supabase. That value stays in `.env`, so you do not have to set it again in every terminal.

From `backend`, with the virtual environment active:

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py seed
python manage.py runserver
```

`seed` creates the sample events and a demo account: `maya` / `HappenDemo1`. Run it only against the local SQLite database. It skips seeding if events already exist.

From `frontend`:

```bash
npm install
npm run dev
```

Open http://localhost:5173. The Vite server proxies `/api` to Django on port 8000.

## What lines up

| Screen | API |
| --- | --- |
| Event grid, search, category, this week | `GET /api/events/` |
| Event page | `GET /api/events/<slug>/` |
| Create event / save draft | `POST /api/events/` |
| Edit or delete your event | `PATCH` or `DELETE /api/events/<slug>/` |
| Get tickets / leave | `POST /api/events/<slug>/rsvp/` |
| Save heart | `POST /api/events/<slug>/save/` |
| My tickets | `GET /api/me/events/?kind=attending\|saved\|hosting` |
| Sign in, register, sign out | `POST /api/auth/login/`, `/register/`, `/logout/` |

Suggested categories are Music, Arts & culture, Food & drink, Business, Wellness, Community, University, Sports, Tech, Faith, Nightlife, Comedy, and Career. An organizer can write a category that is not on that list. Prices are stored as amounts and shown as `Free` or `₦5,000`. A flyer link is optional; a blank flyer uses the category photo. Paid events can be listed, and paying for a ticket is not available yet.
