export type User = {
  id: number;
  username: string;
  firstName: string;
};

export type EventItem = {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
  eventType: string;
  date: string;
  dateLabel: string;
  month: string;
  day: number;
  time: string;
  location: string;
  price: string;
  isFree: boolean;
  image: string;
  tag: string;
  attendees: number;
  organizer: string;
  organizerInitials: string;
  inviter: string;
  isAttending: boolean;
  isSaved: boolean;
  isOwner: boolean;
  isPast: boolean;
  isPublished: boolean;
  detail?: string;
};

export type EventPage = {
  results: EventItem[];
  count: number;
  page: number;
  hasNext: boolean;
};

export type EventDraft = {
  title: string;
  category: string;
  eventType: string;
  date: string;
  time: string;
  location: string;
  isFree: boolean;
  price?: string;
  isPublished: boolean;
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;

  constructor(message: string, status: number, errors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

function csrfToken() {
  const row = document.cookie.split("; ").find((item) => item.startsWith("csrftoken="));
  return row ? decodeURIComponent(row.split("=")[1]) : "";
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const method = (options.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    if (!csrfToken()) {
      await fetch("/api/auth/session/", { credentials: "same-origin" });
    }
    headers.set("Content-Type", "application/json");
    const token = csrfToken();
    if (token) headers.set("X-CSRFToken", token);
  }

  const response = await fetch(path, { ...options, headers, credentials: "same-origin" });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new ApiError(data.detail || "Something went wrong.", response.status, data.errors);
  }
  return data as T;
}

export function getSession() {
  return api<{ user: User | null }>("/api/auth/session/");
}

export function login(username: string, password: string) {
  return api<{ user: User }>("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function register(username: string, password: string, passwordConfirm: string, firstName: string) {
  return api<{ user: User }>("/api/auth/register/", {
    method: "POST",
    body: JSON.stringify({ username, password, passwordConfirm, firstName }),
  });
}

export function logout() {
  return api<{ user: null }>("/api/auth/logout/", { method: "POST" });
}

export function listEvents(params: { search?: string; category?: string; timeframe?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.category && params.category !== "All events") query.set("category", params.category);
  if (params.timeframe) query.set("timeframe", params.timeframe);
  query.set("page", String(params.page ?? 1));
  return api<EventPage>(`/api/events/?${query}`);
}

export function getEvent(slug: string) {
  return api<EventItem>(`/api/events/${slug}/`);
}

export function createEvent(draft: EventDraft) {
  return api<EventItem>("/api/events/", { method: "POST", body: JSON.stringify(draft) });
}

export function rsvp(slug: string) {
  return api<EventItem>(`/api/events/${slug}/rsvp/`, { method: "POST" });
}

export function saveEvent(slug: string) {
  return api<EventItem>(`/api/events/${slug}/save/`, { method: "POST" });
}

export function myEvents(kind: "attending" | "saved" | "hosting") {
  return api<{ results: EventItem[]; count: number }>(`/api/me/events/?kind=${kind}`);
}
