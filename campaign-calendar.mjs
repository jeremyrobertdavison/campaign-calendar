import { DEFAULT_CONFIG, DEFAULT_DATE, DEFAULT_EVENTS, DEFAULT_FACTIONS, DEFAULT_MAPS, MODULE_ID, SOCKET_NAME } from "./constants.mjs";
import {
  advanceCurrentDate,
  createEvent,
  deleteEvent,
  formatDate,
  getAllEvents,
  getConfig,
  getCurrentDate,
  getDateGroups,
  getEventsForDate,
  getFactions,
  getFactionStandings,
  getMaps,
  initializePrivateStorage,
  reloadPrivateEvents,
  raiseHand,
  setCalendarConfig,
  setCurrentDate,
  setFactions,
  setMaps,
  updateEvent
} from "./calendar-service.mjs";
import { CalendarTopBar } from "./topbar.mjs";
import { CalendarHistoryApplication } from "./applications/history.mjs";
import { CalendarManagerApplication } from "./applications/manager.mjs";
import { DayEventsApplication } from "./applications/day-events.mjs";
import { MapExplorerApplication } from "./applications/map-explorer.mjs";
import { MapViewerApplication } from "./applications/map-viewer.mjs";

function showRaisedHandDialog(payload) {
  const playerName = String(payload?.playerName ?? "Unknown");
  const content = document.createElement("div");
  content.className = "cc-raised-hand-dialog";

  const icon = document.createElement("i");
  icon.className = "fa-solid fa-hand cc-raised-hand-dialog-icon";
  icon.setAttribute("aria-hidden", "true");

  const message = document.createElement("p");
  message.textContent = `Player ${playerName} has raised their hand.`;

  content.append(icon, message);

  const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
  if (DialogV2) {
    new DialogV2({
      window: { title: "Raised Hand" },
      content,
      modal: false,
      buttons: [{
        action: "acknowledge",
        label: "Acknowledge",
        icon: "fa-solid fa-check",
        default: true
      }]
    }).render({ force: true });
    return;
  }

  ui.notifications?.info(`Player ${playerName} has raised their hand.`, { permanent: true });
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "calendarConfig", {
    name: "Calendar Configuration",
    scope: "world",
    config: false,
    type: Object,
    default: DEFAULT_CONFIG
  });

  game.settings.register(MODULE_ID, "currentDate", {
    name: "Current Campaign Date",
    scope: "world",
    config: false,
    type: Object,
    default: DEFAULT_DATE
  });

  game.settings.register(MODULE_ID, "events", {
    name: "Calendar Events",
    scope: "world",
    config: false,
    type: Object,
    default: DEFAULT_EVENTS
  });

  game.settings.register(MODULE_ID, "factions", {
    name: "Campaign Factions",
    scope: "world",
    config: false,
    type: Object,
    default: DEFAULT_FACTIONS
  });

  game.settings.register(MODULE_ID, "maps", {
    name: "Campaign Maps",
    scope: "world",
    config: false,
    type: Object,
    default: DEFAULT_MAPS
  });
});

Hooks.once("ready", async () => {
  await initializePrivateStorage();
  CalendarTopBar.mount();

  game.socket.on(SOCKET_NAME, async (payload) => {
    if (payload?.sender === game.user.id) return;

    if (payload?.type === "raise-hand") {
      if (game.user.isGM) showRaisedHandDialog(payload);
      return;
    }

    if (game.user.isGM) await reloadPrivateEvents();
    Hooks.callAll("campaignCalendarUpdated", payload ?? { type: "sync" });
  });

  Hooks.on("campaignCalendarUpdated", () => CalendarTopBar.refresh());

  const module = game.modules.get(MODULE_ID);
  if (module) {
    module.api = {
      getConfig,
      getCurrentDate,
      setCurrentDate,
      advanceDay: (days = 1) => advanceCurrentDate(days),
      formatDate,
      getEvents: getAllEvents,
      getEventsForDate,
      getDateGroups,
      createEvent,
      updateEvent,
      deleteEvent,
      setCalendarConfig,
      getFactions,
      setFactions,
      getFactionStandings,
      getMaps,
      setMaps,
      raiseHand,
      openMaps: () => new MapExplorerApplication().render({ force: true }),
      openMap: (mapId) => new MapViewerApplication({ mapId }).render({ force: true }),
      openHistory: () => new CalendarHistoryApplication().render({ force: true }),
      openManager: () => {
        if (!game.user.isGM) return ui.notifications.warn("Only a GM can manage the campaign calendar.");
        return new CalendarManagerApplication().render({ force: true });
      },
      openDate: (date) => new DayEventsApplication(date).render({ force: true })
    };
  }

  console.log("Campaign Calendar | Ready");
});
