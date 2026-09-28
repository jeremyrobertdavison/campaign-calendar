import { getCurrentDate, getEventsForDate, formatDate, getFactions, getFactionStandings, makeDateKey, sameDate } from "../calendar-service.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function signed(value) {
  const number = Number(value) || 0;
  return number > 0 ? `+${number}` : String(number);
}

function deltaClass(value) {
  const number = Number(value) || 0;
  if (number > 0) return "positive";
  if (number < 0) return "negative";
  return "neutral";
}

export class DayEventsApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(date, options = {}) {
    const key = makeDateKey(date).replace(/[^a-zA-Z0-9_-]/g, "-");
    super({ id: `campaign-calendar-day-${key}`, ...options });
    this.date = date;
  }

  static DEFAULT_OPTIONS = {
    classes: ["campaign-calendar", "campaign-calendar-day-events"],
    position: { width: 620, height: 680 },
    window: {
      title: "Campaign Calendar — Day Events",
      icon: "fa-solid fa-calendar-day",
      resizable: true
    }
  };

  static PARTS = {
    main: {
      template: "modules/campaign-calendar/templates/day-events.hbs",
      scrollable: [".cc-day-event-list"]
    }
  };

  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this._calendarUpdateHook = Hooks.on("campaignCalendarUpdated", () => {
      if (this.rendered) this.render({ force: true });
    });
  }

  async _onClose(options) {
    if (this._calendarUpdateHook) Hooks.off("campaignCalendarUpdated", this._calendarUpdateHook);
    return super._onClose(options);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const factions = getFactions();
    const factionNames = new Map(factions.map((faction) => [faction.id, faction.name]));
    const events = [];
    for (const event of getEventsForDate(this.date)) {
      const factionChanges = (event.factionChanges ?? []).map((change) => ({
        ...change,
        name: factionNames.get(change.factionId) ?? change.factionName ?? "Unknown Faction",
        deltaDisplay: signed(change.delta),
        deltaClass: deltaClass(change.delta)
      }));
      const itemChanges = (event.itemChanges ?? []).map((change) => ({
        ...change,
        quantityDisplay: signed(change.quantity),
        deltaClass: deltaClass(change.quantity)
      }));
      events.push({
        ...event,
        hasXp: event.xp !== null && event.xp !== undefined,
        xpDisplay: signed(event.xp),
        xpClass: deltaClass(event.xp),
        factionChanges,
        itemChanges,
        hasTracking: (event.xp !== null && event.xp !== undefined) || factionChanges.length > 0 || itemChanges.length > 0,
        bodyHtml: await TextEditor.enrichHTML(event.body ?? "", { secrets: game.user.isGM })
      });
    }
    events.sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.title.localeCompare(b.title));
    const standings = getFactionStandings(this.date);
    const isCurrent = sameDate(this.date, getCurrentDate());
    return {
      ...context,
      dateLabel: formatDate(this.date),
      isGM: game.user.isGM,
      isCurrent,
      standingsTitle: isCurrent ? "Current Faction Standings" : "Faction Standings at End of Day",
      standings,
      events
    };
  }
}
