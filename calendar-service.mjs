import { DEFAULT_CONFIG, DEFAULT_DATE, DEFAULT_EVENTS, MODULE_ID, SOCKET_NAME } from "./constants.mjs";

function clone(value) {
  return foundry.utils.deepClone(value);
}

export function getConfig() {
  return clone(game.settings.get(MODULE_ID, "calendarConfig") ?? DEFAULT_CONFIG);
}

export function getCurrentDate() {
  return clone(game.settings.get(MODULE_ID, "currentDate") ?? DEFAULT_DATE);
}

let privateJournal = null;
let privateEventsCache = [];

function getPublicEvents() {
  const stored = game.settings.get(MODULE_ID, "events") ?? DEFAULT_EVENTS;
  return clone(Array.isArray(stored?.items) ? stored.items : []);
}

export function getAllEvents() {
  const publicEvents = getPublicEvents();
  if (!game.user?.isGM) return publicEvents;
  return [...publicEvents, ...clone(privateEventsCache)];
}

export async function initializePrivateStorage() {
  if (!game.user?.isGM) {
    privateJournal = null;
    privateEventsCache = [];
    return;
  }

  privateJournal = game.journal?.find((journal) => journal.getFlag(MODULE_ID, "privateStore") === true) ?? null;
  if (!privateJournal) {
    privateJournal = await JournalEntry.create({
      name: "[Campaign Calendar] GM Data",
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
      flags: {
        [MODULE_ID]: {
          privateStore: true,
          privateEvents: { items: [] }
        }
      }
    });
  }
  await reloadPrivateEvents();
}

export async function reloadPrivateEvents() {
  if (!game.user?.isGM) {
    privateEventsCache = [];
    return;
  }
  if (!privateJournal) {
    privateJournal = game.journal?.find((journal) => journal.getFlag(MODULE_ID, "privateStore") === true) ?? null;
  }
  const stored = privateJournal?.getFlag(MODULE_ID, "privateEvents") ?? { items: [] };
  privateEventsCache = clone(Array.isArray(stored?.items) ? stored.items : []);
}

export function makeDateKey(date) {
  const era = encodeURIComponent(String(date.era ?? ""));
  return `${Number(date.year)}:${Number(date.month)}:${Number(date.day)}:${era}`;
}

export function sameDate(a, b) {
  return Number(a.year) === Number(b.year)
    && Number(a.month) === Number(b.month)
    && Number(a.day) === Number(b.day)
    && String(a.era ?? "") === String(b.era ?? "");
}

export function normalizeDate(date, config = getConfig()) {
  const months = Array.isArray(config.months) && config.months.length ? config.months : DEFAULT_CONFIG.months;
  const month = Math.min(Math.max(Number.parseInt(date.month ?? 0, 10) || 0, 0), months.length - 1);
  const maxDay = Math.max(Number.parseInt(months[month]?.days ?? 1, 10) || 1, 1);
  const day = Math.min(Math.max(Number.parseInt(date.day ?? 1, 10) || 1, 1), maxDay);
  const year = Number.parseInt(date.year ?? 1, 10) || 1;
  return {
    year,
    month,
    day,
    era: String(date.era ?? config.defaultEra ?? "").trim()
  };
}

export function formatDate(date, config = getConfig()) {
  const normalized = normalizeDate(date, config);
  const monthName = config.months?.[normalized.month]?.name ?? `Month ${normalized.month + 1}`;
  const yearPrefix = normalized.era
    ? `${normalized.era} `
    : `${String(config.yearLabel ?? "Year").trim() || "Year"} `;
  return `${monthName} ${normalized.day}, ${yearPrefix}${normalized.year}`;
}

export function dateSortValue(date) {
  return (Number(date.year) * 10000) + (Number(date.month) * 100) + Number(date.day);
}

export function compareDatesDescending(a, b) {
  const eraA = String(a.era ?? "");
  const eraB = String(b.era ?? "");
  if (eraA !== eraB) return eraB.localeCompare(eraA);
  return dateSortValue(b) - dateSortValue(a);
}

export function shiftDate(date, delta, config = getConfig()) {
  const result = normalizeDate(date, config);
  let remaining = Number.parseInt(delta, 10) || 0;

  while (remaining > 0) {
    const daysInMonth = Math.max(Number(config.months[result.month]?.days ?? 1), 1);
    result.day += 1;
    if (result.day > daysInMonth) {
      result.day = 1;
      result.month += 1;
      if (result.month >= config.months.length) {
        result.month = 0;
        result.year += 1;
      }
    }
    remaining -= 1;
  }

  while (remaining < 0) {
    result.day -= 1;
    if (result.day < 1) {
      result.month -= 1;
      if (result.month < 0) {
        result.month = config.months.length - 1;
        result.year -= 1;
      }
      result.day = Math.max(Number(config.months[result.month]?.days ?? 1), 1);
    }
    remaining += 1;
  }

  return normalizeDate(result, config);
}

async function emitSync(reason = "update") {
  Hooks.callAll("campaignCalendarUpdated", { reason, sender: game.user?.id });
  if (game.socket) game.socket.emit(SOCKET_NAME, { type: "sync", reason, sender: game.user?.id });
}

function requireGM() {
  if (!game.user?.isGM) throw new Error("Campaign Calendar: GM permission required.");
}

export async function setCurrentDate(date) {
  requireGM();
  const normalized = normalizeDate(date);
  await game.settings.set(MODULE_ID, "currentDate", normalized);
  await emitSync("date");
  return normalized;
}

export async function advanceCurrentDate(delta) {
  requireGM();
  const next = shiftDate(getCurrentDate(), delta);
  return setCurrentDate(next);
}

export async function setCalendarConfig(config) {
  requireGM();
  const cleanMonths = (config.months ?? [])
    .map((m) => ({
      name: String(m.name ?? "").trim(),
      days: Math.max(Number.parseInt(m.days ?? 1, 10) || 1, 1)
    }))
    .filter((m) => m.name);

  if (!cleanMonths.length) throw new Error("A calendar must contain at least one month.");

  const clean = {
    name: String(config.name ?? "Campaign Calendar").trim() || "Campaign Calendar",
    yearLabel: String(config.yearLabel ?? "Year").trim() || "Year",
    defaultEra: String(config.defaultEra ?? "").trim(),
    months: cleanMonths
  };

  await game.settings.set(MODULE_ID, "calendarConfig", clean);
  await game.settings.set(MODULE_ID, "currentDate", normalizeDate(getCurrentDate(), clean));
  await emitSync("config");
  return clean;
}

async function savePublicEvents(items) {
  requireGM();
  await game.settings.set(MODULE_ID, "events", { items });
}

async function savePrivateEvents(items) {
  requireGM();
  if (!privateJournal) await initializePrivateStorage();
  privateEventsCache = clone(items);
  await privateJournal.setFlag(MODULE_ID, "privateEvents", { items: privateEventsCache });
}

async function saveEventStores(publicItems, privateItems, reason = "events") {
  requireGM();
  await savePublicEvents(publicItems);
  await savePrivateEvents(privateItems);
  await emitSync(reason);
}

function randomId() {
  return foundry.utils.randomID?.() ?? crypto.randomUUID();
}

export async function createEvent(data) {
  requireGM();
  const publicItems = getPublicEvents();
  const privateItems = clone(privateEventsCache);
  const date = normalizeDate(data.date ?? getCurrentDate());
  const now = Date.now();
  const event = {
    id: randomId(),
    date,
    title: String(data.title ?? "Untitled Event").trim() || "Untitled Event",
    body: String(data.body ?? ""),
    visibility: data.visibility === "gm" ? "gm" : "public",
    pinned: Boolean(data.pinned),
    createdBy: game.user.id,
    createdAt: now,
    updatedAt: now
  };
  if (event.visibility === "gm") privateItems.push(event);
  else publicItems.push(event);
  await saveEventStores(publicItems, privateItems, "event-create");
  return event;
}

export async function updateEvent(id, data) {
  requireGM();
  const publicItems = getPublicEvents();
  const privateItems = clone(privateEventsCache);
  const existing = [...publicItems, ...privateItems].find((event) => event.id === id);
  if (!existing) throw new Error("Campaign Calendar event not found.");

  const updated = {
    ...existing,
    date: normalizeDate(data.date ?? existing.date),
    title: String(data.title ?? existing.title).trim() || "Untitled Event",
    body: String(data.body ?? existing.body ?? ""),
    visibility: data.visibility === "gm" ? "gm" : "public",
    pinned: Boolean(data.pinned),
    updatedAt: Date.now()
  };

  const nextPublic = publicItems.filter((event) => event.id !== id);
  const nextPrivate = privateItems.filter((event) => event.id !== id);
  if (updated.visibility === "gm") nextPrivate.push(updated);
  else nextPublic.push(updated);

  await saveEventStores(nextPublic, nextPrivate, "event-update");
  return updated;
}

export async function deleteEvent(id) {
  requireGM();
  const publicItems = getPublicEvents();
  const privateItems = clone(privateEventsCache);
  const nextPublic = publicItems.filter((event) => event.id !== id);
  const nextPrivate = privateItems.filter((event) => event.id !== id);
  if (nextPublic.length === publicItems.length && nextPrivate.length === privateItems.length) return false;
  await saveEventStores(nextPublic, nextPrivate, "event-delete");
  return true;
}

export function getVisibleEvents({ includeFuture = true } = {}) {
  const current = getCurrentDate();
  return getAllEvents().filter((event) => {
    if (!game.user?.isGM && event.visibility === "gm") return false;
    if (includeFuture) return true;
    if (String(event.date?.era ?? "") !== String(current.era ?? "")) return true;
    return dateSortValue(event.date) <= dateSortValue(current);
  });
}

export function getEventsForDate(date) {
  return getVisibleEvents().filter((event) => sameDate(event.date, date));
}

export function getDateGroups({ limit = null, includeFuture = true } = {}) {
  const config = getConfig();
  const map = new Map();
  for (const event of getVisibleEvents({ includeFuture })) {
    const key = makeDateKey(event.date);
    if (!map.has(key)) map.set(key, { key, date: event.date, events: [] });
    map.get(key).events.push(event);
  }

  let groups = [...map.values()];
  groups.sort((a, b) => compareDatesDescending(a.date, b.date));
  groups = groups.map((group) => ({
    ...group,
    label: formatDate(group.date, config),
    count: group.events.length,
    pinned: group.events.some((event) => event.pinned),
    hasGmOnly: group.events.some((event) => event.visibility === "gm")
  }));
  if (Number.isInteger(limit) && limit >= 0) groups = groups.slice(0, limit);
  return groups;
}

export function parseDateKey(key) {
  const [year, month, day, era = ""] = String(key).split(":");
  return normalizeDate({
    year: Number(year),
    month: Number(month),
    day: Number(day),
    era: decodeURIComponent(era)
  });
}
