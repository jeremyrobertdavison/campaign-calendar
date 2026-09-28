import { getQuests } from "../calendar-service.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class QuestLogApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "campaign-calendar-quest-log",
    classes: ["campaign-calendar", "campaign-calendar-quest-log"],
    position: { width: 820, height: 720 },
    window: {
      title: "Campaign Calendar — Quest Log",
      icon: "fa-solid fa-scroll",
      resizable: true
    },
    actions: {
      manageQuestLog: QuestLogApplication.manageQuestLog
    }
  };

  static PARTS = {
    main: {
      template: "modules/campaign-calendar/templates/quest-log.hbs",
      scrollable: [".cc-quest-log-list"]
    }
  };

  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this._calendarUpdateHook = Hooks.on("campaignCalendarUpdated", ({ reason } = {}) => {
      if (this.rendered && (!reason || reason === "quests")) this.render({ force: true });
    });
  }

  async _onClose(options) {
    if (this._calendarUpdateHook) Hooks.off("campaignCalendarUpdated", this._calendarUpdateHook);
    return super._onClose(options);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const quests = getQuests()
      .slice()
      .sort((a, b) => (Number(a.sort) - Number(b.sort)) || a.title.localeCompare(b.title))
      .map((quest) => ({
        ...quest,
        searchText: `${quest.title} ${quest.questGiver ?? ""} ${quest.description ?? ""} ${quest.reward ?? ""}`.toLowerCase()
      }));

    return { ...context, quests, isGM: Boolean(game.user?.isGM) };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const search = this.element.querySelector('[data-role="quest-search"]');
    search?.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      for (const card of this.element.querySelectorAll("[data-quest-search]")) {
        card.hidden = Boolean(query && !card.dataset.questSearch.includes(query));
      }
    });
  }

  static async manageQuestLog() {
    if (!game.user?.isGM) return;
    const { CalendarManagerApplication } = await import("./manager.mjs");
    new CalendarManagerApplication().render({ force: true });
  }
}
