import { formatDate, getFactions, getQuests } from "../calendar-service.mjs";

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
    const factionNames = new Map(getFactions().map((faction) => [faction.id, faction.name]));
    const quests = getQuests()
      .slice()
      .sort((a, b) => {
        const statusOrder = (a.status === "completed" ? 1 : 0) - (b.status === "completed" ? 1 : 0);
        return statusOrder || (Number(a.sort) - Number(b.sort)) || a.title.localeCompare(b.title);
      })
      .map((quest) => {
        const factionRewards = (quest.factionRewards ?? []).map((reward) => ({
          ...reward,
          name: factionNames.get(reward.factionId) ?? reward.factionName ?? "Unknown Faction",
          deltaLabel: Number(reward.delta) > 0 ? `+${Number(reward.delta)}` : String(Number(reward.delta) || 0)
        }));
        const completed = quest.status === "completed";
        const completionLabel = completed && quest.completionDate ? formatDate(quest.completionDate) : "";
        return {
          ...quest,
          completed,
          active: !completed,
          statusLabel: completed ? "Completed" : "Active",
          completionLabel,
          factionRewards,
          hasFactionRewards: factionRewards.length > 0,
          searchText: `${quest.title} ${quest.questGiver ?? ""} ${quest.description ?? ""} ${quest.reward ?? ""} ${completed ? "completed" : "active"} ${factionRewards.map((reward) => `${reward.name} ${reward.deltaLabel}`).join(" ")}`.toLowerCase()
        };
      });

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
