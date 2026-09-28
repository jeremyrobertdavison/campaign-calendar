import {
  advanceCurrentDate,
  deleteEvent,
  formatDate,
  getAllEvents,
  getConfig,
  getCurrentDate,
  getFactions,
  getMaps,
  makeDateKey,
  normalizeDate,
  parseDateKey,
  setCalendarConfig,
  setCurrentDate,
  setFactions,
  setMaps
} from "../calendar-service.mjs";
import { DayEventsApplication } from "./day-events.mjs";
import { EventEditorApplication } from "./event-editor.mjs";
import { MapExplorerApplication } from "./map-explorer.mjs";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

function plainText(html = "") {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").trim();
}

function randomId() {
  return foundry.utils.randomID?.() ?? crypto.randomUUID();
}

export class CalendarManagerApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "campaign-calendar-manager",
    classes: ["campaign-calendar", "campaign-calendar-manager"],
    position: { width: 820, height: 820 },
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
      addFaction: CalendarManagerApplication.addFaction,
      removeFaction: CalendarManagerApplication.removeFaction,
      saveFactions: CalendarManagerApplication.saveFactions,
      addMap: CalendarManagerApplication.addMap,
      removeMap: CalendarManagerApplication.removeMap,
      browseMap: CalendarManagerApplication.browseMap,
      saveMaps: CalendarManagerApplication.saveMaps,
      openMapExplorer: CalendarManagerApplication.openMapExplorer,
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
    const factions = getFactions();
    const maps = getMaps();
    const factionNames = new Map(factions.map((faction) => [faction.id, faction.name]));
    const events = getAllEvents()
      .sort((a, b) => {
        const ea = String(a.date?.era ?? "");
        const eb = String(b.date?.era ?? "");
        if (ea !== eb) return eb.localeCompare(ea);
        const va = (Number(a.date?.year) * 10000) + (Number(a.date?.month) * 100) + Number(a.date?.day);
        const vb = (Number(b.date?.year) * 10000) + (Number(b.date?.month) * 100) + Number(b.date?.day);
        return vb - va || Number(b.pinned) - Number(a.pinned);
      })
      .map((entry) => {
        const trackedText = [
          Number.isFinite(entry.xp) ? `${entry.xp} xp` : "",
          ...(entry.factionChanges ?? []).map((change) => `${factionNames.get(change.factionId) ?? change.factionName ?? "faction"} ${change.delta}`),
          ...(entry.itemChanges ?? []).map((change) => `${change.name} ${change.quantity}`)
        ].join(" ");
        return {
          ...entry,
          dateLabel: formatDate(entry.date, config),
          dateKey: makeDateKey(entry.date),
          bodyPreview: plainText(entry.body).slice(0, 150),
          searchText: `${entry.title} ${plainText(entry.body)} ${formatDate(entry.date, config)} ${trackedText}`.toLowerCase()
        };
      });

    return {
      ...context,
      config,
      current,
      currentLabel: formatDate(current, config),
      months: config.months.map((month, index) => ({ ...month, index, selected: index === current.month })),
      monthsText: config.months.map((month) => `${month.name}|${month.days}`).join("\n"),
      factions,
      maps,
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

  static addFaction() {
    const list = this.element.querySelector('[data-role="faction-list"]');
    if (!list) return;
    const row = document.createElement("div");
    row.className = "cc-faction-edit-row";
    row.dataset.factionId = randomId();

    const name = document.createElement("input");
    name.type = "text";
    name.dataset.role = "faction-name";
    name.placeholder = "Faction name";

    const score = document.createElement("input");
    score.type = "number";
    score.dataset.role = "faction-base-score";
    score.value = "0";
    score.title = "Starting score";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "cc-icon-button danger";
    remove.dataset.action = "removeFaction";
    remove.title = "Remove faction";
    remove.innerHTML = '<i class="fa-solid fa-trash"></i>';

    row.append(name, score, remove);
    list.append(row);
    name.focus();
  }

  static removeFaction(event, target) {
    target.closest(".cc-faction-edit-row")?.remove();
  }

  static async saveFactions() {
    const rows = [...this.element.querySelectorAll(".cc-faction-edit-row")];
    const factions = rows.map((row) => ({
      id: row.dataset.factionId,
      name: row.querySelector('[data-role="faction-name"]')?.value ?? "",
      baseScore: Number(row.querySelector('[data-role="faction-base-score"]')?.value ?? 0)
    }));
    await setFactions(factions);
    ui.notifications.info("Faction configuration saved.");
    this.render({ force: true });
  }

  static addMap() {
    const list = this.element.querySelector('[data-role="map-list"]');
    if (!list) return;

    const row = document.createElement("div");
    row.className = "cc-map-edit-row";
    row.dataset.mapId = randomId();
    row.dataset.addedAt = String(Date.now());
    row.innerHTML = `
      <div class="cc-map-edit-preview cc-map-edit-preview-empty" data-role="map-preview-wrap">
        <i class="fa-regular fa-map"></i>
        <img data-role="map-preview" alt="" hidden>
      </div>
      <div class="cc-map-edit-fields">
        <input type="text" data-role="map-name" placeholder="Map name">
        <div class="cc-map-path-row">
          <input type="text" data-role="map-path" placeholder="path/to/map.webp">
          <button type="button" class="cc-secondary-button" data-action="browseMap"><i class="fa-solid fa-folder-open"></i> Browse</button>
        </div>
        <input type="text" data-role="map-description" placeholder="Short description (optional)">
      </div>
      <button type="button" class="cc-icon-button danger" data-action="removeMap" title="Remove map"><i class="fa-solid fa-trash"></i></button>
    `;
    list.append(row);
    row.querySelector('[data-role="map-name"]')?.focus();
  }

  static removeMap(event, target) {
    target.closest(".cc-map-edit-row")?.remove();
  }

  static browseMap(event, target) {
    const row = target.closest(".cc-map-edit-row");
    const input = row?.querySelector('[data-role="map-path"]');
    if (!row || !input) return;

    const FilePickerClass = foundry.applications.apps.FilePicker?.implementation
      ?? foundry.applications.apps.FilePicker
      ?? globalThis.FilePicker;
    if (!FilePickerClass) {
      ui.notifications.error("Foundry's File Picker is not available.");
      return;
    }

    const picker = new FilePickerClass({
      type: "image",
      current: input.value,
      callback: (path) => {
        input.value = path;
        const preview = row.querySelector('[data-role="map-preview"]');
        const wrap = row.querySelector('[data-role="map-preview-wrap"]');
        if (preview && wrap) {
          preview.src = path;
          preview.hidden = false;
          wrap.classList.remove("cc-map-edit-preview-empty");
        }
      }
    });
    picker.render({ force: true });
  }

  static async saveMaps() {
    const rows = [...this.element.querySelectorAll(".cc-map-edit-row")];
    const maps = rows.map((row, index) => ({
      id: row.dataset.mapId,
      name: row.querySelector('[data-role="map-name"]')?.value ?? "",
      path: row.querySelector('[data-role="map-path"]')?.value ?? "",
      description: row.querySelector('[data-role="map-description"]')?.value ?? "",
      addedAt: Number(row.dataset.addedAt) || Date.now(),
      sort: index
    }));
    const saved = await setMaps(maps);
    ui.notifications.info(`${saved.length} campaign map${saved.length === 1 ? "" : "s"} saved.`);
    this.render({ force: true });
  }

  static openMapExplorer() {
    new MapExplorerApplication().render({ force: true });
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
