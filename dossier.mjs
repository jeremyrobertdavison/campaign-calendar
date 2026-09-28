import { getDossiers } from "../calendar-service.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class DossierApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "campaign-calendar-dossier",
    classes: ["campaign-calendar", "campaign-calendar-dossier"],
    position: { width: 820, height: 720 },
    window: {
      title: "Campaign Calendar — Dossier",
      icon: "fa-solid fa-address-book",
      resizable: true
    },
    actions: {
      manageDossier: DossierApplication.manageDossier
    }
  };

  static PARTS = {
    main: {
      template: "modules/campaign-calendar/templates/dossier.hbs",
      scrollable: [".cc-dossier-grid"]
    }
  };

  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this._calendarUpdateHook = Hooks.on("campaignCalendarUpdated", ({ reason } = {}) => {
      if (this.rendered && (!reason || reason === "dossiers")) this.render({ force: true });
    });
  }

  async _onClose(options) {
    if (this._calendarUpdateHook) Hooks.off("campaignCalendarUpdated", this._calendarUpdateHook);
    return super._onClose(options);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const dossiers = getDossiers()
      .slice()
      .sort((a, b) => (Number(a.sort) - Number(b.sort)) || a.name.localeCompare(b.name))
      .map((dossier) => ({
        ...dossier,
        searchText: `${dossier.name} ${dossier.description ?? ""}`.toLowerCase()
      }));

    return { ...context, dossiers, isGM: Boolean(game.user?.isGM) };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const search = this.element.querySelector('[data-role="dossier-search"]');
    search?.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      for (const card of this.element.querySelectorAll("[data-dossier-search]")) {
        card.hidden = Boolean(query && !card.dataset.dossierSearch.includes(query));
      }
    });
  }

  static async manageDossier() {
    if (!game.user?.isGM) return;
    const { CalendarManagerApplication } = await import("./manager.mjs");
    new CalendarManagerApplication().render({ force: true });
  }
}
