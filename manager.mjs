import {
  advanceCurrentDate,
  deleteEvent,
  formatDate,
  getAllEvents,
  getConfig,
  getCurrentDate,
  getDossiers,
  getFactions,
  getMaps,
  getQuests,
  makeDateKey,
  normalizeDate,
  parseDateKey,
  setCalendarConfig,
  setCurrentDate,
  setDossiers,
  setFactions,
  setMaps,
  setQuests
} from "../calendar-service.mjs";
import { DayEventsApplication } from "./day-events.mjs";
import { EventEditorApplication } from "./event-editor.mjs";
import { MapExplorerApplication } from "./map-explorer.mjs";
import { DossierApplication } from "./dossier.mjs";
import { QuestLogApplication } from "./quest-log.mjs";

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
      addDossier: CalendarManagerApplication.addDossier,
      removeDossier: CalendarManagerApplication.removeDossier,
      browseDossier: CalendarManagerApplication.browseDossier,
      saveDossiers: CalendarManagerApplication.saveDossiers,
      openDossier: CalendarManagerApplication.openDossier,
      addQuest: CalendarManagerApplication.addQuest,
      removeQuest: CalendarManagerApplication.removeQuest,
      addQuestFactionReward: CalendarManagerApplication.addQuestFactionReward,
      removeQuestFactionReward: CalendarManagerApplication.removeQuestFactionReward,
      saveQuests: CalendarManagerApplication.saveQuests,
      openQuestLog: CalendarManagerApplication.openQuestLog,
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
    const dossiers = getDossiers();
    const quests = getQuests().map((quest) => ({
      ...quest,
      status: quest.status === "completed" ? "completed" : "active",
      factionRewardRows: (quest.factionRewards ?? []).map((reward) => {
        const missing = !factions.some((faction) => faction.id === reward.factionId);
        const options = factions.map((faction) => ({
          ...faction,
          selected: faction.id === reward.factionId
        }));
        if (missing && reward.factionId) {
          options.unshift({
            id: reward.factionId,
            name: `${reward.factionName ?? "Removed Faction"} (removed)`,
            selected: true
          });
        }
        return { ...reward, options };
      })
    }));
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
      dossiers,
      quests,
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

  static addDossier() {
    const list = this.element.querySelector('[data-role="dossier-list"]');
    if (!list) return;

    const row = document.createElement("div");
    row.className = "cc-dossier-edit-row";
    row.dataset.dossierId = randomId();
    row.dataset.addedAt = String(Date.now());
    row.innerHTML = `
      <div class="cc-dossier-edit-preview cc-dossier-edit-preview-empty" data-role="dossier-preview-wrap">
        <i class="fa-solid fa-user"></i>
        <img data-role="dossier-preview" alt="" hidden>
      </div>
      <div class="cc-dossier-edit-fields">
        <input type="text" data-role="dossier-name" placeholder="NPC name">
        <div class="cc-dossier-path-row">
          <input type="text" data-role="dossier-path" placeholder="path/to/npc.webp">
          <button type="button" class="cc-secondary-button" data-action="browseDossier"><i class="fa-solid fa-folder-open"></i> Browse</button>
        </div>
        <textarea data-role="dossier-description" rows="3" placeholder="NPC description"></textarea>
      </div>
      <button type="button" class="cc-icon-button danger" data-action="removeDossier" title="Remove NPC"><i class="fa-solid fa-trash"></i></button>
    `;
    list.append(row);
    row.querySelector('[data-role="dossier-name"]')?.focus();
  }

  static removeDossier(event, target) {
    target.closest(".cc-dossier-edit-row")?.remove();
  }

  static browseDossier(event, target) {
    const row = target.closest(".cc-dossier-edit-row");
    const input = row?.querySelector('[data-role="dossier-path"]');
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
        const preview = row.querySelector('[data-role="dossier-preview"]');
        const wrap = row.querySelector('[data-role="dossier-preview-wrap"]');
        if (preview && wrap) {
          preview.src = path;
          preview.hidden = false;
          wrap.classList.remove("cc-dossier-edit-preview-empty");
        }
      }
    });
    picker.render({ force: true });
  }

  static async saveDossiers() {
    const rows = [...this.element.querySelectorAll(".cc-dossier-edit-row")];
    const dossiers = rows.map((row, index) => ({
      id: row.dataset.dossierId,
      name: row.querySelector('[data-role="dossier-name"]')?.value ?? "",
      path: row.querySelector('[data-role="dossier-path"]')?.value ?? "",
      description: row.querySelector('[data-role="dossier-description"]')?.value ?? "",
      addedAt: Number(row.dataset.addedAt) || Date.now(),
      sort: index
    }));
    const saved = await setDossiers(dossiers);
    ui.notifications.info(`${saved.length} dossier entr${saved.length === 1 ? "y" : "ies"} saved.`);
    this.render({ force: true });
  }

  static openDossier() {
    new DossierApplication().render({ force: true });
  }

  static _createQuestFactionRewardRow(selectedFactionId = "", delta = 0, fallbackName = "") {
    const factions = getFactions();
    if (!factions.length) {
      ui.notifications.warn("Add at least one faction before adding a faction reward.");
      return null;
    }

    const row = document.createElement("div");
    row.className = "cc-quest-faction-reward-row";
    row.dataset.questFactionRewardRow = "";

    const select = document.createElement("select");
    select.dataset.role = "quest-faction-id";
    let found = false;
    for (const faction of factions) {
      const option = document.createElement("option");
      option.value = faction.id;
      option.textContent = faction.name;
      if (faction.id === selectedFactionId) {
        option.selected = true;
        found = true;
      }
      select.append(option);
    }
    if (selectedFactionId && !found) {
      const option = document.createElement("option");
      option.value = selectedFactionId;
      option.textContent = `${fallbackName || "Removed Faction"} (removed)`;
      option.selected = true;
      select.prepend(option);
    }

    const points = document.createElement("input");
    points.type = "number";
    points.step = "1";
    points.value = String(Number(delta) || 0);
    points.dataset.role = "quest-faction-delta";
    points.title = "Faction points awarded when the quest is completed";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "cc-icon-button danger";
    remove.dataset.action = "removeQuestFactionReward";
    remove.title = "Remove faction reward";
    remove.innerHTML = '<i class="fa-solid fa-trash"></i>';

    row.append(select, points, remove);
    return row;
  }

  static addQuest() {
    const list = this.element.querySelector('[data-role="quest-list"]');
    if (!list) return;

    const row = document.createElement("div");
    row.className = "cc-quest-edit-row";
    row.dataset.questId = randomId();
    row.dataset.addedAt = String(Date.now());
    row.innerHTML = `
      <div class="cc-quest-edit-fields">
        <input type="text" data-role="quest-title" placeholder="Quest title">
        <input type="text" data-role="quest-giver" placeholder="Quest giver">
        <label class="cc-quest-status-field">
          <span>Status</span>
          <select data-role="quest-status">
            <option value="active" selected>Active</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <textarea data-role="quest-description" rows="4" placeholder="Quest description"></textarea>
        <textarea data-role="quest-reward" rows="2" placeholder="Reward"></textarea>
        <div class="cc-quest-faction-rewards">
          <div class="cc-quest-faction-rewards-header">
            <div>
              <strong>Faction Point Rewards</strong>
              <small>These points affect standings only after the quest is marked Completed.</small>
            </div>
            <button type="button" class="cc-secondary-button" data-action="addQuestFactionReward"><i class="fa-solid fa-plus"></i> Add Faction Reward</button>
          </div>
          <div class="cc-quest-faction-reward-list" data-role="quest-faction-reward-list"></div>
        </div>
      </div>
      <button type="button" class="cc-icon-button danger" data-action="removeQuest" title="Remove quest"><i class="fa-solid fa-trash"></i></button>
    `;
    list.append(row);
    row.querySelector('[data-role="quest-title"]')?.focus();
  }

  static removeQuest(event, target) {
    target.closest(".cc-quest-edit-row")?.remove();
  }

  static addQuestFactionReward(event, target) {
    const questRow = target.closest(".cc-quest-edit-row");
    const list = questRow?.querySelector('[data-role="quest-faction-reward-list"]');
    if (!list) return;
    const row = this._createQuestFactionRewardRow();
    if (row) list.append(row);
  }

  static removeQuestFactionReward(event, target) {
    target.closest("[data-quest-faction-reward-row]")?.remove();
  }

  static async saveQuests() {
    const rows = [...this.element.querySelectorAll(".cc-quest-edit-row")];
    const quests = rows.map((row, index) => ({
      id: row.dataset.questId,
      title: row.querySelector('[data-role="quest-title"]')?.value ?? "",
      questGiver: row.querySelector('[data-role="quest-giver"]')?.value ?? "",
      description: row.querySelector('[data-role="quest-description"]')?.value ?? "",
      reward: row.querySelector('[data-role="quest-reward"]')?.value ?? "",
      status: row.querySelector('[data-role="quest-status"]')?.value === "completed" ? "completed" : "active",
      factionRewards: [...row.querySelectorAll("[data-quest-faction-reward-row]")].map((rewardRow) => {
        const select = rewardRow.querySelector('[data-role="quest-faction-id"]');
        return {
          factionId: select?.value ?? "",
          factionName: select?.selectedOptions?.[0]?.textContent?.replace(/ \(removed\)$/, "") ?? "",
          delta: Number(rewardRow.querySelector('[data-role="quest-faction-delta"]')?.value ?? 0)
        };
      }),
      addedAt: Number(row.dataset.addedAt) || Date.now(),
      sort: index
    }));
    const saved = await setQuests(quests);
    ui.notifications.info(`${saved.length} quest${saved.length === 1 ? "" : "s"} saved.`);
    this.render({ force: true });
  }

  static openQuestLog() {
    new QuestLogApplication().render({ force: true });
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
