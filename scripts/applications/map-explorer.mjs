import { getMaps } from "../calendar-service.mjs";
import { MapViewerApplication } from "./map-viewer.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class MapExplorerApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "campaign-calendar-map-explorer",
    classes: ["campaign-calendar", "campaign-calendar-map-explorer"],
    position: { width: 780, height: 700 },
    window: {
      title: "Campaign Calendar — Maps",
      icon: "fa-solid fa-map",
      resizable: true
    },
    actions: {
      openMap: MapExplorerApplication.openMap,
      manageMaps: MapExplorerApplication.manageMaps
    }
  };

  static PARTS = {
    main: {
      template: "modules/campaign-calendar/templates/map-explorer.hbs",
      scrollable: [".cc-map-grid"]
    }
  };

  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this._calendarUpdateHook = Hooks.on("campaignCalendarUpdated", ({ reason } = {}) => {
      if (this.rendered && (!reason || reason === "maps")) this.render({ force: true });
    });
  }

  async _onClose(options) {
    if (this._calendarUpdateHook) Hooks.off("campaignCalendarUpdated", this._calendarUpdateHook);
    return super._onClose(options);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const maps = getMaps()
      .slice()
      .sort((a, b) => (Number(a.sort) - Number(b.sort)) || a.name.localeCompare(b.name))
      .map((map) => ({
        ...map,
        searchText: `${map.name} ${map.description ?? ""}`.toLowerCase()
      }));

    return {
      ...context,
      maps,
      isGM: Boolean(game.user?.isGM)
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const search = this.element.querySelector('[data-role="map-search"]');
    search?.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      for (const card of this.element.querySelectorAll("[data-map-search]")) {
        card.hidden = Boolean(query && !card.dataset.mapSearch.includes(query));
      }
    });
  }

  static openMap(event, target) {
    const mapId = target.dataset.mapId ?? target.closest("[data-map-id]")?.dataset.mapId;
    if (!mapId) return;
    new MapViewerApplication({ mapId }).render({ force: true });
  }

  static async manageMaps() {
    if (!game.user?.isGM) return;
    const { CalendarManagerApplication } = await import("./manager.mjs");
    new CalendarManagerApplication().render({ force: true });
  }
}
