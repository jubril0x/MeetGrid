import { useEffect, useState } from "react";
import {
  ApiError,
  createEvent,
  getEvent,
  getSession,
  listEvents,
  login,
  logout,
  myEvents,
  register,
  rsvp,
  saveEvent,
  type EventDraft,
  type EventItem,
  type User,
} from "./api";

type IconName =
  | "arrow"
  | "calendar"
  | "check"
  | "chevron"
  | "close"
  | "heart"
  | "location"
  | "menu"
  | "search"
  | "share"
  | "sparkle"
  | "ticket"
  | "user";

function Icon({
  name,
  size = 20,
  filled = false,
}: {
  name: IconName;
  size?: number;
  filled?: boolean;
}) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m8 10 4 4 4-4" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    location: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    share: (
      <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
      </>
    ),
    sparkle: (
      <>
        <path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z" />
        <path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" />
      </>
    ),
    ticket: (
      <>
        <path d="M3 9a3 3 0 0 0 0 6v3h18v-3a3 3 0 0 0 0-6V6H3v3Z" />
        <path d="M13 6v3M13 15v3" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

const images = {
  hero: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1600&q=80",
  crowd: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1000&q=80",
  studio: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1000&q=80",
  food: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1000&q=80",
  conference: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80",
};

const categories = [
  { name: "All events", icon: "✦" },
  { name: "Music", icon: "♪" },
  { name: "Arts & culture", icon: "◐" },
  { name: "Food & drink", icon: "◇" },
  { name: "Business", icon: "↗" },
  { name: "Wellness", icon: "≈" },
  { name: "Community", icon: "◎" },
];

const emptyDraft: EventDraft = {
  title: "",
  category: "",
  eventType: "In person",
  date: "",
  time: "",
  location: "",
  isFree: true,
  price: "",
  isPublished: true,
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [activeCategory, setActiveCategory] = useState("All events");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [thisWeek, setThisWeek] = useState(false);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<EventDraft>(emptyDraft);
  const [draftError, setDraftError] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({
    username: "",
    password: "",
    passwordConfirm: "",
    firstName: "",
  });
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [ticketsOpen, setTicketsOpen] = useState(false);
  const [ticketKind, setTicketKind] = useState<"attending" | "saved" | "hosting">("attending");
  const [ticketEvents, setTicketEvents] = useState<EventItem[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const remember = (event: EventItem) => {
    setEvents((current) => current.map((item) => (item.slug === event.slug ? event : item)));
    setSelected((current) => (current?.slug === event.slug ? event : current));
    setTicketEvents((current) => current.map((item) => (item.slug === event.slug ? event : item)));
  };

  useEffect(() => {
    getSession()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listEvents({
      search,
      category: activeCategory,
      timeframe: thisWeek ? "this_week" : "anytime",
      page: 1,
    })
      .then((data) => {
        if (cancelled) return;
        setEvents(data.results);
        setPage(data.page);
        setHasNext(data.hasNext);
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setEvents([]);
        setHasNext(false);
        setLoadError(error instanceof Error ? error.message : "The event list could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, activeCategory, thisWeek]);

  useEffect(() => {
    const syncEventFromUrl = () => {
      const slug = window.location.pathname.match(/^\/events\/([^/]+)/)?.[1];
      if (!slug) {
        setSelected(null);
        return;
      }
      getEvent(decodeURIComponent(slug))
        .then(setSelected)
        .catch(() => setSelected(null));
    };
    syncEventFromUrl();
    window.addEventListener("popstate", syncEventFromUrl);
    return () => window.removeEventListener("popstate", syncEventFromUrl);
  }, []);

  useEffect(() => {
    if (!ticketsOpen || !user) return;
    setTicketsLoading(true);
    myEvents(ticketKind)
      .then((data) => setTicketEvents(data.results))
      .catch((error: unknown) => {
        setTicketEvents([]);
        notify(error instanceof Error ? error.message : "Could not load your tickets.");
      })
      .finally(() => setTicketsLoading(false));
  }, [ticketsOpen, ticketKind, user]);

  const requireUser = () => {
    if (user) return true;
    setAuthMode("login");
    setAuthError("");
    setAuthOpen(true);
    return false;
  };

  const shareEvent = async (event: EventItem) => {
    const url = `${window.location.origin}/events/${event.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      notify("Event link copied — ready to share.");
    } catch {
      notify(`Share link ready: ${url}`);
    }
  };

  const openEvent = (event: EventItem) => {
    window.history.pushState({}, "", `/events/${event.slug}`);
    setSelected(event);
    setTicketsOpen(false);
  };

  const closeEvent = () => {
    window.history.pushState({}, "", "/");
    setSelected(null);
  };

  const scrollToEvents = () =>
    document.getElementById("events")?.scrollIntoView({ behavior: "smooth" });

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await listEvents({
        search,
        category: activeCategory,
        timeframe: thisWeek ? "this_week" : "anytime",
        page: page + 1,
      });
      setEvents((current) => [...current, ...data.results]);
      setPage(data.page);
      setHasNext(data.hasNext);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not load more events.");
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleSave = async (event: EventItem) => {
    if (!requireUser()) return;
    try {
      const updated = await saveEvent(event.slug);
      remember(updated);
      notify(updated.detail || (updated.isSaved ? "Event saved." : "Removed from saved events."));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) requireUser();
      else notify(error instanceof Error ? error.message : "Could not save that event.");
    }
  };

  const toggleRsvp = async (event: EventItem) => {
    if (!requireUser()) return;
    try {
      const updated = await rsvp(event.slug);
      remember(updated);
      notify(updated.detail || "Ticket updated.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) requireUser();
      else notify(error instanceof Error ? error.message : "Could not update your ticket.");
    }
  };

  const submitEvent = async (publish: boolean) => {
    if (!requireUser()) return;
    setSavingEvent(true);
    setDraftError("");
    try {
      const created = await createEvent({ ...draft, isPublished: publish });
      setCreateOpen(false);
      setDraft(emptyDraft);
      if (publish) {
        setEvents((current) => [created, ...current.filter((item) => item.slug !== created.slug)]);
        openEvent(created);
        notify("Your event is live.");
      } else {
        notify("Draft saved. Find it under My tickets, then Hosting.");
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) requireUser();
      setDraftError(error instanceof Error ? error.message : "Could not save the event.");
    } finally {
      setSavingEvent(false);
    }
  };

  const submitAuth = async () => {
    setAuthBusy(true);
    setAuthError("");
    try {
      const result =
        authMode === "login"
          ? await login(authForm.username, authForm.password)
          : await register(
              authForm.username,
              authForm.password,
              authForm.passwordConfirm,
              authForm.firstName,
            );
      setUser(result.user);
      setAuthOpen(false);
      setAuthForm({ username: "", password: "", passwordConfirm: "", firstName: "" });
      notify(`Welcome, ${result.user.firstName}.`);
      const data = await listEvents({
        search,
        category: activeCategory,
        timeframe: thisWeek ? "this_week" : "anytime",
        page: 1,
      });
      setEvents(data.results);
      setHasNext(data.hasNext);
      setPage(data.page);
      if (selected) remember(await getEvent(selected.slug));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not sign you in.");
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    await logout();
    setUser(null);
    setTicketsOpen(false);
    notify("Signed out.");
    const data = await listEvents({
      search,
      category: activeCategory,
      timeframe: thisWeek ? "this_week" : "anytime",
      page: 1,
    });
    setEvents(data.results);
  };

  const openTickets = () => {
    if (!requireUser()) return;
    setTicketKind("attending");
    setTicketsOpen(true);
    setMenuOpen(false);
  };

  const filterCount = (activeCategory !== "All events" ? 1 : 0) + (thisWeek ? 1 : 0);

  return (
    <div className="min-h-screen overflow-hidden bg-[#F6F3ED] text-[#181816]">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-black/8 bg-[#F6F3ED]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 md:px-8 lg:px-12">
          <button
            onClick={() => {
              closeEvent();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="font-display text-[26px] font-bold tracking-[-.06em]"
          >
            happen<span className="text-[#FF5833]">.</span>
          </button>
          <nav className="hidden items-center gap-8 text-sm font-semibold lg:flex">
            <button onClick={scrollToEvents} className="nav-link">
              Discover
            </button>
            <button onClick={openTickets} className="nav-link">
              My tickets
            </button>
            <button onClick={() => setCreateOpen(true)} className="nav-link">
              For organizers
            </button>
          </nav>
          <div className="hidden items-center gap-3 sm:flex">
            {user ? (
              <>
                <span className="text-sm font-semibold">{user.firstName}</span>
                <button onClick={signOut} className="rounded-full px-4 py-2.5 text-sm font-semibold hover:bg-black/5">
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setAuthMode("login");
                  setAuthOpen(true);
                }}
                className="rounded-full px-4 py-2.5 text-sm font-semibold hover:bg-black/5"
              >
                Sign in
              </button>
            )}
            <button onClick={() => setCreateOpen(true)} className="button-dark">
              <span className="text-lg leading-none">＋</span> Create event
            </button>
          </div>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-full border border-black/10 bg-white p-2.5 sm:hidden"
            aria-label="Open menu"
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-black/8 bg-[#F6F3ED] p-5 sm:hidden">
            <div className="flex flex-col gap-2 font-semibold">
              <button
                onClick={() => {
                  scrollToEvents();
                  setMenuOpen(false);
                }}
                className="rounded-xl px-4 py-3 text-left hover:bg-white"
              >
                Discover events
              </button>
              <button onClick={openTickets} className="rounded-xl px-4 py-3 text-left hover:bg-white">
                My tickets
              </button>
              <button
                onClick={() => {
                  setAuthMode("login");
                  setAuthOpen(true);
                  setMenuOpen(false);
                }}
                className="rounded-xl px-4 py-3 text-left hover:bg-white"
              >
                {user ? user.firstName : "Sign in"}
              </button>
              <button
                onClick={() => {
                  setCreateOpen(true);
                  setMenuOpen(false);
                }}
                className="button-orange mt-2 justify-center"
              >
                Create event
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="hero-grain relative mx-3 mt-[88px] min-h-[680px] overflow-hidden rounded-[28px] bg-[#201F1B] md:mx-5 md:min-h-[710px] lg:mx-6">
          <img
            src={images.hero}
            alt="A crowd enjoying a live music performance"
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,15,13,.88)_0%,rgba(16,15,13,.54)_52%,rgba(16,15,13,.12)_100%)]" />
          <div className="absolute -right-8 top-16 h-52 w-52 rounded-full border-[36px] border-[#FF5833]/80 mix-blend-screen md:right-20 md:h-64 md:w-64" />
          <div className="relative z-10 mx-auto flex min-h-[680px] max-w-[1344px] flex-col justify-center px-6 py-20 md:min-h-[710px] md:px-12 lg:px-16">
            <div className="mb-6 flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-white backdrop-blur-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#C8FF5A]" />
              Live near New York
            </div>
            <h1 className="font-display max-w-[840px] text-[clamp(3.4rem,7vw,7.4rem)] font-semibold leading-[.88] tracking-[-.065em] text-white">
              Your next great{" "}
              <span className="font-serif font-normal italic text-[#C8FF5A]">story</span> starts here.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/76 md:text-lg">
              Discover concerts, workshops, food pop-ups and unforgettable gatherings happening around you.
            </p>
            <div className="mt-10 flex max-w-[900px] flex-col gap-2 rounded-2xl bg-white p-2.5 shadow-2xl md:flex-row md:rounded-full">
              <label className="flex min-w-0 flex-1 items-center gap-3 px-4">
                <Icon name="search" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && scrollToEvents()}
                  placeholder="Search events, artists or places"
                  className="h-12 w-full bg-transparent text-sm font-medium outline-none placeholder:text-black/42"
                />
              </label>
              <div className="hidden w-px bg-black/10 md:block" />
              <button className="flex items-center gap-3 px-4 text-sm font-semibold md:min-w-[180px]">
                <Icon name="location" size={19} />
                New York, NY
                <Icon name="chevron" size={16} />
              </button>
              <button onClick={scrollToEvents} className="button-orange h-12 justify-center px-7">
                Find events <Icon name="arrow" size={18} />
              </button>
            </div>
            <div className="mt-5 flex items-center gap-3 text-xs font-semibold text-white/66">
              <div className="flex -space-x-2">
                {[images.studio, images.food, images.conference].map((img) => (
                  <img key={img} src={img} className="h-8 w-8 rounded-full border-2 border-[#29251f] object-cover" alt="" />
                ))}
              </div>
              <span>Find a plan, save it, and keep the ticket in one place.</span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 py-20 md:px-8 lg:px-12 lg:py-28">
          <div className="mb-9 flex items-end justify-between">
            <div>
              <p className="eyebrow">Explore your interests</p>
              <h2 className="section-title">
                Something for <span>everyone.</span>
              </h2>
            </div>
            <button onClick={scrollToEvents} className="hidden items-center gap-2 text-sm font-bold md:flex">
              Browse all <Icon name="arrow" size={17} />
            </button>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-3">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => {
                  setActiveCategory(category.name);
                  window.setTimeout(scrollToEvents, 50);
                }}
                className={`category-pill ${activeCategory === category.name ? "category-pill-active" : ""}`}
              >
                <span className="text-xl">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </section>

        <section id="events" className="bg-[#E9E5DC] py-20 lg:py-28">
          <div className="mx-auto max-w-[1440px] px-5 md:px-8 lg:px-12">
            <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="eyebrow">What’s happening</p>
                <h2 className="section-title">
                  {search ? "Search results" : activeCategory === "All events" ? "Trending near you." : activeCategory}
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setThisWeek((value) => !value)}
                  className={`filter-button ${thisWeek ? "bg-[#181816] text-white" : ""}`}
                >
                  This week <Icon name="chevron" size={16} />
                </button>
                <button className="filter-button">
                  Filters
                  {filterCount > 0 && (
                    <span className="rounded-full bg-black px-1.5 py-0.5 text-[10px] text-white">{filterCount}</span>
                  )}
                </button>
              </div>
            </div>
            {loading ? (
              <div className="rounded-[24px] border border-black/10 bg-white/50 p-16 text-center">
                <h3 className="font-display text-3xl font-semibold">Looking for events</h3>
              </div>
            ) : events.length > 0 ? (
              <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((event, index) => (
                  <article key={event.id} className="event-card group">
                    <div className="relative aspect-[1.18] overflow-hidden rounded-[22px] bg-black/10">
                      <img
                        src={event.image}
                        alt={event.title}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                      <button
                        onClick={() => openEvent(event)}
                        className="absolute inset-0"
                        aria-label={`View ${event.title}`}
                      />
                      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
                        {event.tag ? (
                          <span
                            className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.08em] ${index === 0 ? "bg-[#C8FF5A]" : "bg-white/90 backdrop-blur"}`}
                          >
                            {event.tag}
                          </span>
                        ) : (
                          <span />
                        )}
                        <button
                          onClick={() => toggleSave(event)}
                          className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/90 transition hover:scale-105"
                          aria-label="Save event"
                        >
                          <span className={event.isSaved ? "text-[#FF5833]" : ""}>
                            <Icon name="heart" filled={event.isSaved} />
                          </span>
                        </button>
                      </div>
                    </div>
                    <button onClick={() => openEvent(event)} className="block w-full pt-5 text-left">
                      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[.13em] text-[#E24929]">
                        {event.dateLabel} · {event.time}
                      </p>
                      <h3 className="font-display text-[25px] font-semibold leading-tight tracking-[-.035em] transition group-hover:text-[#E24929]">
                        {event.title}
                      </h3>
                      <div className="mt-3 flex items-center justify-between gap-3 text-sm text-black/56">
                        <span className="truncate">{event.location}</span>
                        <strong className="shrink-0 text-black">{event.price}</strong>
                      </div>
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-black/10 bg-white/50 p-16 text-center">
                <h3 className="font-display text-3xl font-semibold">No events found</h3>
                <p className="mt-2 text-black/55">
                  {loadError || "Try another search or browse all events."}
                </p>
                <button
                  onClick={() => {
                    setQuery("");
                    setSearch("");
                    setActiveCategory("All events");
                    setThisWeek(false);
                  }}
                  className="button-dark mx-auto mt-6"
                >
                  Reset filters
                </button>
              </div>
            )}
            {hasNext && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="mx-auto mt-14 flex items-center gap-2 rounded-full border border-black/20 px-6 py-3.5 text-sm font-bold transition hover:bg-black hover:text-white disabled:opacity-60"
              >
                {loadingMore ? "Loading" : "Load more events"} <Icon name="arrow" size={17} />
              </button>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 py-20 md:px-8 lg:px-12 lg:py-28">
          <div className="relative overflow-hidden rounded-[30px] bg-[#6E42E5] p-7 text-white md:p-12 lg:p-16">
            <div className="absolute -right-14 -top-20 h-72 w-72 rounded-full border-[48px] border-[#C8FF5A]" />
            <div className="absolute bottom-[-80px] left-[45%] h-44 w-44 rotate-12 rounded-[30px] bg-[#FF5833]" />
            <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[1.2fr_.8fr]">
              <div>
                <div className="mb-6 flex w-fit items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-xs font-bold uppercase tracking-widest">
                  <Icon name="sparkle" size={16} />
                  For organizers
                </div>
                <h2 className="font-display max-w-2xl text-[clamp(2.8rem,5vw,5.4rem)] font-semibold leading-[.94] tracking-[-.055em]">
                  Turn your idea into a <span className="font-serif font-normal italic text-[#C8FF5A]">full house.</span>
                </h2>
                <p className="mt-6 max-w-xl text-base leading-7 text-white/72">
                  Publish your event, keep the guest list, and share a link people can open immediately.
                </p>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="mt-8 flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-extrabold text-black transition hover:bg-[#C8FF5A]"
                >
                  Start creating—it’s free <Icon name="arrow" size={18} />
                </button>
              </div>
              <div className="relative mx-auto w-full max-w-[390px]">
                <div className="rotate-3 rounded-[24px] bg-[#FFF9EC] p-4 text-black shadow-2xl">
                  <img src={images.crowd} alt="Concert event banner preview" className="aspect-[1.4] w-full rounded-[16px] object-cover" />
                  <div className="p-4">
                    <div className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-[#E24929]">Friday · 7:30 PM</div>
                    <h3 className="font-display text-2xl font-bold">Sounds After Sunset</h3>
                    <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-3 text-xs font-bold">
                      <span>Elsewhere, Brooklyn</span>
                      <span>$36</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-5 -left-6 -rotate-6 rounded-xl bg-[#C8FF5A] px-4 py-3 text-sm font-extrabold text-black shadow-xl">
                  Share-ready ↗
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/10 px-5 py-8 md:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1344px] flex-col items-center justify-between gap-5 text-sm md:flex-row">
          <div className="font-display text-2xl font-bold tracking-[-.06em]">
            happen<span className="text-[#FF5833]">.</span>
          </div>
          <p className="text-black/50">Make plans. Make memories.</p>
          <div className="flex gap-6 font-semibold">
            <button onClick={() => notify("MeetGrid is the project behind happen.")}>About</button>
            <button onClick={() => notify("Sign in, then use My tickets for your plans.")}>Help</button>
            <button onClick={() => notify("Instagram is not connected yet.")}>Instagram</button>
          </div>
        </div>
      </footer>

      {selected && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#19261F] text-[#F7F4ED]">
          <div className="sticky top-0 z-30 border-b border-white/8 bg-[#19261F]/90 backdrop-blur-xl">
            <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 md:px-8 lg:px-12">
              <button onClick={closeEvent} className="font-display text-[25px] font-bold tracking-[-.06em]">
                happen<span className="text-[#C8FF5A]">.</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => shareEvent(selected)}
                  className="flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2.5 text-xs font-bold transition hover:bg-white/15"
                >
                  <Icon name="share" size={17} />
                  <span className="hidden sm:inline">Share event</span>
                </button>
                <button
                  onClick={closeEvent}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white text-black transition hover:bg-[#C8FF5A]"
                  aria-label="Close event page"
                >
                  <Icon name="close" size={19} />
                </button>
              </div>
            </div>
          </div>

          <div className="mx-auto grid max-w-[1344px] gap-12 px-5 py-10 md:px-8 lg:grid-cols-[430px_1fr] lg:gap-16 lg:px-12 lg:py-16">
            <aside>
              <div className="event-poster group relative aspect-[4/5] overflow-hidden rounded-[26px] bg-[#6E42E5] shadow-[0_30px_80px_rgba(0,0,0,.32)]">
                <img src={selected.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-72" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,15,13,.08),rgba(12,15,13,.26)_38%,rgba(12,15,13,.94)_100%)]" />
                <div className="absolute -right-12 top-12 h-44 w-44 rounded-full border-[28px] border-[#C8FF5A]/90 mix-blend-screen" />
                <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[.16em] backdrop-blur">
                  <Icon name="sparkle" size={14} /> {selected.category}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-7 md:p-9">
                  <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#C8FF5A]">
                    A {selected.organizer} experience
                  </p>
                  <h2 className="font-display text-[clamp(2.5rem,5vw,4.3rem)] font-semibold leading-[.88] tracking-[-.06em]">
                    {selected.title}
                  </h2>
                  <div className="mt-7 grid grid-cols-[auto_1fr] gap-4 border-t border-white/18 pt-5">
                    <div className="rounded-xl bg-[#C8FF5A] px-3 py-2 text-center text-black">
                      <span className="block text-[9px] font-extrabold uppercase">{selected.month}</span>
                      <strong className="font-display text-2xl leading-none">{selected.day}</strong>
                    </div>
                    <div className="flex flex-col justify-center text-xs font-semibold leading-5 text-white/82">
                      <span>{selected.dateLabel}</span>
                      <span>
                        {selected.time} · {selected.location}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-7 flex items-center justify-between border-b border-white/10 pb-6">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#6E42E5] font-display text-sm font-black">
                    {selected.organizerInitials}
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-widest text-white/44">Presented by</span>
                    <strong className="text-sm">{selected.organizer}</strong>
                  </div>
                </div>
                <button
                  onClick={() => notify(`You're viewing events from ${selected.organizer}.`)}
                  className="rounded-full bg-white/8 px-4 py-2 text-xs font-bold transition hover:bg-white/15"
                >
                  Follow
                </button>
              </div>

              <div className="mt-6">
                <p className="text-xs font-semibold text-white/55">{selected.attendees} going</p>
                <div className="mt-3 flex items-center">
                  <div className="flex -space-x-2.5">
                    {[images.studio, images.food, images.conference, images.hero].map((image) => (
                      <img key={image} src={image} alt="" className="h-9 w-9 rounded-full border-2 border-[#19261F] object-cover" />
                    ))}
                  </div>
                  <span className="ml-3 text-xs text-white/50">Join the community</span>
                </div>
              </div>
            </aside>

            <div className="min-w-0 pt-1 lg:pt-5">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/7 px-4 py-2 text-xs font-semibold text-white/70">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[#FF5833] font-serif text-[11px] text-white">
                  {selected.inviter.slice(0, 1).toUpperCase()}
                </span>
                {selected.inviter} <span className="text-[#D7B8FF]">invites you to join</span>
              </div>

              <h1 className="font-display max-w-[800px] text-[clamp(3rem,6vw,6.4rem)] font-semibold leading-[.91] tracking-[-.065em]">
                {selected.title}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/58">{selected.description}</p>

              <div className="mt-9 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.045] p-4">
                  <span className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/5 text-[#C8FF5A]">
                    <Icon name="calendar" />
                  </span>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-white/38">Date & time</span>
                    <strong className="mt-1 block text-sm">
                      {selected.dateLabel} · {selected.time}
                    </strong>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.045] p-4">
                  <span className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/5 text-[#C8FF5A]">
                    <Icon name="location" />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-white/38">Location</span>
                    <strong className="mt-1 block truncate text-sm">{selected.location}</strong>
                  </div>
                </div>
              </div>

              <section className="mt-7 overflow-hidden rounded-[22px] border border-white/11 bg-white/[.055]">
                <div className="flex items-center justify-between border-b border-white/9 px-6 py-4">
                  <span className="text-xs font-bold uppercase tracking-[.13em] text-white/46">Registration</span>
                  <span className="rounded-full bg-[#C8FF5A]/12 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#C8FF5A]">
                    {selected.isPast ? "Event ended" : selected.isAttending ? "You're going" : "Spots available"}
                  </span>
                </div>
                <div className="flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-display text-2xl font-semibold">
                      {selected.isAttending ? "Your spot is saved" : "Save your spot"}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                      {selected.isAttending
                        ? "This ticket is listed under My tickets."
                        : "Your ticket is saved to your account as soon as you register."}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <div>
                      <span className="block text-[10px] text-white/40">From</span>
                      <strong className="text-xl">{selected.price}</strong>
                    </div>
                    <button
                      onClick={() => toggleRsvp(selected)}
                      disabled={selected.isPast}
                      className="flex items-center gap-2 rounded-full bg-[#C8FF5A] px-6 py-3.5 text-xs font-extrabold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Icon name="ticket" size={17} />
                      {selected.isAttending ? "Leave event" : selected.isFree ? "Register free" : "Get tickets"}
                    </button>
                  </div>
                </div>
              </section>

              <section className="mt-10 border-t border-white/10 pt-8">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-2xl font-semibold">About the event</h3>
                  <button
                    onClick={() => shareEvent(selected)}
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white/65 hover:bg-white/10 hover:text-white"
                    aria-label="Copy event link"
                  >
                    <Icon name="share" size={18} />
                  </button>
                </div>
                <p className="mt-5 max-w-3xl text-[15px] leading-7 text-white/58">{selected.description}</p>
                <p className="mt-4 max-w-3xl text-[15px] leading-7 text-white/58">
                  {selected.eventType}. Doors open 30 minutes before the listed start time.
                </p>
              </section>

              <button
                onClick={() => shareEvent(selected)}
                className="mt-10 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[.035] p-4 text-left transition hover:bg-white/[.07]"
              >
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-white/35">Shareable event link</span>
                  <strong className="mt-1 block text-sm">happen.co/events/{selected.slug}</strong>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/8 text-[#C8FF5A]">
                  <Icon name="share" size={18} />
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onMouseDown={() => setCreateOpen(false)}>
          <div onMouseDown={(e) => e.stopPropagation()} className="my-8 w-full max-w-[660px] rounded-[28px] bg-[#F6F3ED] p-6 shadow-2xl md:p-9">
            <div className="mb-8 flex items-start justify-between">
              <div>
                <p className="eyebrow">Organizer studio</p>
                <h2 className="font-display text-4xl font-semibold tracking-[-.04em]">Create an event</h2>
                <p className="mt-2 text-sm text-black/50">Add the essentials now. You can refine it before publishing.</p>
              </div>
              <button onClick={() => setCreateOpen(false)} className="rounded-full border border-black/10 p-2.5">
                <Icon name="close" />
              </button>
            </div>
            <div className="grid gap-5">
              <label className="field">
                <span>Event title</span>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Give your event a great name"
                />
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="field">
                  <span>Category</span>
                  <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                    <option value="">Choose category</option>
                    {categories.slice(1).map((category) => (
                      <option key={category.name}>{category.name}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Event type</span>
                  <select value={draft.eventType} onChange={(e) => setDraft({ ...draft, eventType: e.target.value })}>
                    <option>In person</option>
                    <option>Online</option>
                    <option>Hybrid</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="field">
                  <span>Date</span>
                  <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
                </label>
                <label className="field">
                  <span>Start time</span>
                  <input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} />
                </label>
              </div>
              <label className="field">
                <span>Venue or online link</span>
                <input
                  value={draft.location}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                  placeholder="Search for a venue or add a link"
                />
              </label>
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="text-sm">This is a paid event</strong>
                    <p className="mt-1 text-xs text-black/45">Set a ticket price. Free events stay at zero.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, isFree: !draft.isFree })}
                    className={`toggle ${draft.isFree ? "" : "toggle-on"}`}
                    aria-pressed={!draft.isFree}
                  >
                    <span />
                  </button>
                </div>
                {!draft.isFree && (
                  <label className="field mt-4">
                    <span>Ticket price</span>
                    <input
                      inputMode="decimal"
                      value={draft.price}
                      onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                      placeholder="48"
                    />
                  </label>
                )}
              </div>
              {draftError && <p className="text-sm font-semibold text-[#E24929]">{draftError}</p>}
            </div>
            <div className="mt-8 flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <button onClick={() => submitEvent(false)} disabled={savingEvent} className="rounded-full px-6 py-3 text-sm font-bold">
                Save draft
              </button>
              <button onClick={() => submitEvent(true)} disabled={savingEvent} className="button-orange justify-center px-7">
                {savingEvent ? "Saving" : "Publish"} <Icon name="arrow" size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {authOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={() => setAuthOpen(false)}>
          <div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-[440px] rounded-[28px] bg-[#F6F3ED] p-6 shadow-2xl md:p-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="eyebrow">{authMode === "login" ? "Welcome back" : "Create your account"}</p>
                <h2 className="font-display text-4xl font-semibold tracking-[-.04em]">
                  {authMode === "login" ? "Sign in" : "Join happen"}
                </h2>
              </div>
              <button onClick={() => setAuthOpen(false)} className="rounded-full border border-black/10 p-2.5">
                <Icon name="close" />
              </button>
            </div>
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                submitAuth();
              }}
            >
              {authMode === "register" && (
                <label className="field">
                  <span>Your name</span>
                  <input
                    value={authForm.firstName}
                    onChange={(e) => setAuthForm({ ...authForm, firstName: e.target.value })}
                    placeholder="Maya"
                  />
                </label>
              )}
              <label className="field">
                <span>Username</span>
                <input
                  value={authForm.username}
                  onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                  autoComplete="username"
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                />
              </label>
              {authMode === "register" && (
                <label className="field">
                  <span>Confirm password</span>
                  <input
                    type="password"
                    value={authForm.passwordConfirm}
                    onChange={(e) => setAuthForm({ ...authForm, passwordConfirm: e.target.value })}
                    autoComplete="new-password"
                  />
                </label>
              )}
              {authError && <p className="text-sm font-semibold text-[#E24929]">{authError}</p>}
              <button type="submit" disabled={authBusy} className="button-orange mt-2 justify-center">
                {authBusy ? "Please wait" : authMode === "login" ? "Sign in" : "Create account"}
              </button>
            </form>
            <button
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setAuthError("");
              }}
              className="mt-4 text-sm font-semibold text-black/60"
            >
              {authMode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      )}

      {ticketsOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onMouseDown={() => setTicketsOpen(false)}>
          <div onMouseDown={(e) => e.stopPropagation()} className="my-8 w-full max-w-[720px] rounded-[28px] bg-[#F6F3ED] p-6 shadow-2xl md:p-9">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="eyebrow">Your plans</p>
                <h2 className="font-display text-4xl font-semibold tracking-[-.04em]">My tickets</h2>
              </div>
              <button onClick={() => setTicketsOpen(false)} className="rounded-full border border-black/10 p-2.5">
                <Icon name="close" />
              </button>
            </div>
            <div className="mb-6 flex gap-2">
              {(
                [
                  ["attending", "Going"],
                  ["saved", "Saved"],
                  ["hosting", "Hosting"],
                ] as const
              ).map(([kind, label]) => (
                <button
                  key={kind}
                  onClick={() => setTicketKind(kind)}
                  className={`rounded-full px-4 py-2 text-sm font-bold ${ticketKind === kind ? "bg-[#181816] text-white" : "bg-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {ticketsLoading ? (
              <p className="py-10 text-center text-sm font-semibold text-black/50">Loading your events</p>
            ) : ticketEvents.length === 0 ? (
              <p className="py-10 text-center text-sm text-black/55">Nothing here yet.</p>
            ) : (
              <div className="grid gap-3">
                {ticketEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => openEvent(event)}
                    className="flex items-center gap-4 rounded-2xl bg-white p-3 text-left"
                  >
                    <img src={event.image} alt="" className="h-16 w-16 rounded-xl object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-lg font-semibold">{event.title}</span>
                      <span className="block truncate text-xs font-semibold text-black/50">
                        {event.dateLabel} · {event.location}
                        {!event.isPublished ? " · Draft" : ""}
                      </span>
                    </span>
                    <strong className="text-sm">{event.price}</strong>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#181816] px-5 py-3 text-sm font-semibold text-white shadow-2xl">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#C8FF5A] text-black">
            <Icon name="check" size={13} />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
