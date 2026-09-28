import { getEventsForDate, formatDate, makeDateKey } from "../calendar-service.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class DayEventsApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(date, options = {}) {
    const key = makeDateKey(date).replace(/[^a-zA-Z0-9_-]/g, "-");
    super({ id: `campaign-calendar-day-${key}`, ...options });
    this.date = date;
  }

  static DEFAULT_OPTIONS = {
    classes: ["campaign-calendar", "campaign-calendar-day-events"],
    position: { width: 560, height: 520 },
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
    const events = [];
    for (const event of getEventsForDate(this.date)) {
      events.push({
        ...event,
        bodyHtml: await TextEditor.enrichHTML(event.body ?? "", { secrets: game.user.isGM })
      });
    }
    events.sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.title.localeCompare(b.title));
    return {
      ...context,
      dateLabel: formatDate(this.date),
      isGM: game.user.isGM,
      events
    };
  }
}
