import {
  advanceCurrentDate,
  deleteEvent,
  formatDate,
  getAllEvents,
  getConfig,
  getCurrentDate,
  makeDateKey,
  normalizeDate,
  parseDateKey,
  setCalendarConfig,
  setCurrentDate
} from "../calendar-service.mjs";
import { DayEventsApplication } from "./day-events.mjs";
import { EventEditorApplication } from "./event-editor.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

function plainText(html = "") {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").trim();
}

export class CalendarManagerApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "campaign-calendar-manager",
    classes: ["campaign-calendar", "campaign-calendar-manager"],
    position: { width: 760, height: 760 },
    window: {
      title: "Campaign Calendar — GM Manager",
      icon: "fa-solid fa-calendar-days",
      resizable: true
    },
    actions: {
      previousDay: CalendarManagerApplication.previousDay,
      nextDay: CalendarManagerApplication.nextDay,
      saveDate: CalendarManagerApplication.saveDate,
      newEvent: CalendarManagerApplication.newEvent,
      editEvent: CalendarManagerApplication.editEvent,
      deleteEvent: CalendarManagerApplication.deleteEvent,
      openDay: CalendarManagerApplication.openDay,
      saveConfig: CalendarManagerApplication.saveConfig,
      exportConfig: CalendarManagerApplication.exportConfig,
      importConfig: CalendarManagerApplication.importConfig
    }
  };

  static PARTS = {
    main: {
      template: "modules/campaign-calendar/templates/manager.hbs",
      scrollable: [".cc-manager-events"]
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
    const config = getConfig();
    const current = getCurrentDate();
    const events = getAllEvents()
      .sort((a, b) => {
        const ea = String(a.date?.era ?? "");
        const eb = String(b.date?.era ?? "");
        if (ea !== eb) return eb.localeCompare(ea);
        const va = (Number(a.date?.year) * 10000) + (Number(a.date?.month) * 100) + Number(a.date?.day);
        const vb = (Number(b.date?.year) * 10000) + (Number(b.date?.month) * 100) + Number(b.date?.day);
        return vb - va || Number(b.pinned) - Number(a.pinned);
      })
      .map((entry) => ({
        ...entry,
        dateLabel: formatDate(entry.date, config),
        dateKey: makeDateKey(entry.date),
        bodyPreview: plainText(entry.body).slice(0, 150),
        searchText: `${entry.title} ${plainText(entry.body)} ${formatDate(entry.date, config)}`.toLowerCase()
      }));

    return {
      ...context,
      config,
      current,
      currentLabel: formatDate(current, config),
      months: config.months.map((month, index) => ({ ...month, index, selected: index === current.month })),
      monthsText: config.months.map((month) => `${month.name}|${month.days}`).join("\n"),
      events
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const search = this.element.querySelector('[data-role="event-search"]');
    search?.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      for (const row of this.element.querySelectorAll("[data-event-search]")) {
        row.hidden = query && !row.dataset.eventSearch.includes(query);
      }
    });

    const importInput = this.element.querySelector('[data-role="config-file"]');
    importInput?.addEventListener("change", async () => {
      const file = importInput.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        await setCalendarConfig(parsed);
        ui.notifications.info("Calendar configuration imported.");
        this.render({ force: true });
      } catch (error) {
        console.error("Campaign Calendar | Import failed", error);
        ui.notifications.error(`Calendar import failed: ${error.message}`);
      } finally {
        importInput.value = "";
      }
    });
  }

  static async previousDay() {
    await advanceCurrentDate(-1);
    this.render({ force: true });
  }

  static async nextDay() {
    await advanceCurrentDate(1);
    this.render({ force: true });
  }

  static async saveDate() {
    const root = this.element;
    const date = normalizeDate({
      year: Number(root.querySelector('[name="current-year"]')?.value),
      month: Number(root.querySelector('[name="current-month"]')?.value),
      day: Number(root.querySelector('[name="current-day"]')?.value),
      era: root.querySelector('[name="current-era"]')?.value ?? ""
    });
    await setCurrentDate(date);
    ui.notifications.info("Current campaign date updated.");
    this.render({ force: true });
  }

  static newEvent() {
    new EventEditorApplication({ date: getCurrentDate() }).render({ force: true });
  }

  static editEvent(event, target) {
    new EventEditorApplication({ eventId: target.dataset.eventId }).render({ force: true });
  }

  static async deleteEvent(event, target) {
    const eventId = target.dataset.eventId;
    const record = getAllEvents().find((entry) => entry.id === eventId);
    if (!record) return;
    const confirmed = await DialogV2.confirm({
      window: { title: "Delete Calendar Event" },
      content: `<p>Delete <strong>${foundry.utils.escapeHTML(record.title)}</strong>? This cannot be undone.</p>`
    });
    if (!confirmed) return;
    await deleteEvent(eventId);
    ui.notifications.info("Calendar event deleted.");
    this.render({ force: true });
  }

  static openDay(event, target) {
    if (!target.dataset.dateKey) return;
    new DayEventsApplication(parseDateKey(target.dataset.dateKey)).render({ force: true });
  }

  static async saveConfig() {
    const root = this.element;
    const monthsRaw = root.querySelector('[name="months"]')?.value ?? "";
    const months = monthsRaw.split(/\r?\n/).map((line) => {
      const [name, days] = line.split("|");
      return { name: String(name ?? "").trim(), days: Number(days) };
    }).filter((month) => month.name);

    try {
      await setCalendarConfig({
        name: root.querySelector('[name="calendar-name"]')?.value,
        yearLabel: root.querySelector('[name="year-label"]')?.value,
        defaultEra: root.querySelector('[name="default-era"]')?.value,
        months
      });
      ui.notifications.info("Calendar configuration saved.");
      this.render({ force: true });
    } catch (error) {
      ui.notifications.error(error.message);
    }
  }

  static exportConfig() {
    const config = getConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "campaign-calendar-config.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  }

  static importConfig() {
    this.element.querySelector('[data-role="config-file"]')?.click();
  }
}
