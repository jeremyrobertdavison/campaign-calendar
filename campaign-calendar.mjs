import { DEFAULT_CONFIG, DEFAULT_DATE, DEFAULT_EVENTS, MODULE_ID, SOCKET_NAME } from "./constants.mjs";
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
  initializePrivateStorage,
  reloadPrivateEvents,
  setCalendarConfig,
  setCurrentDate,
  updateEvent
} from "./calendar-service.mjs";
import { CalendarTopBar } from "./topbar.mjs";
import { CalendarHistoryApplication } from "./applications/history.mjs";
import { CalendarManagerApplication } from "./applications/manager.mjs";
import { DayEventsApplication } from "./applications/day-events.mjs";

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
});

Hooks.once("ready", async () => {
  await initializePrivateStorage();
  CalendarTopBar.mount();

  game.socket.on(SOCKET_NAME, async (payload) => {
    if (payload?.sender === game.user.id) return;
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
