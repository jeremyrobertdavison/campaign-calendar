import { getDateGroups, parseDateKey } from "../calendar-service.mjs";
import { DayEventsApplication } from "./day-events.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CalendarHistoryApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "campaign-calendar-history",
    classes: ["campaign-calendar", "campaign-calendar-history"],
    position: { width: 620, height: 650 },
    window: {
      title: "Campaign Calendar — History",
      icon: "fa-solid fa-book-open",
      resizable: true
    },
    actions: {
      openDay: CalendarHistoryApplication.openDay
    }
  };

  static PARTS = {
    main: {
      template: "modules/campaign-calendar/templates/history.hbs",
      scrollable: [".cc-history-list"]
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
    return {
      ...context,
      isGM: game.user.isGM,
      groups: getDateGroups()
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const search = this.element.querySelector('[data-role="search"]');
    search?.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      for (const row of this.element.querySelectorAll("[data-search]")) {
        row.hidden = query && !row.dataset.search.toLowerCase().includes(query);
      }
    });
  }

  static openDay(event, target) {
    const key = target.dataset.dateKey;
    if (!key) return;
    new DayEventsApplication(parseDateKey(key)).render({ force: true });
  }
}
