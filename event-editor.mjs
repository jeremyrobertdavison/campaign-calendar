import { createEvent, getAllEvents, getConfig, getCurrentDate, getFactions, normalizeDate, updateEvent } from "../calendar-service.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

function signed(value) {
  const number = Number(value) || 0;
  return number > 0 ? `+${number}` : String(number);
}

export class EventEditorApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ eventId = null, date = null } = {}, options = {}) {
    super({ id: eventId ? `campaign-calendar-event-${eventId}` : "campaign-calendar-event-new", ...options });
    this.eventId = eventId;
    this.initialDate = date;
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["campaign-calendar", "campaign-calendar-event-editor"],
    position: { width: 680, height: 820 },
    window: {
      title: "Campaign Calendar — Event",
      icon: "fa-solid fa-pen-to-square",
      resizable: true
    },
    actions: {
      addFactionChange: EventEditorApplication.addFactionChange,
      removeFactionChange: EventEditorApplication.removeFactionChange,
      addItemChange: EventEditorApplication.addItemChange,
      removeItemChange: EventEditorApplication.removeItemChange
    },
    form: {
      closeOnSubmit: true,
      submitOnChange: false,
      handler: EventEditorApplication.submit
    }
  };

  static PARTS = {
    main: {
      template: "modules/campaign-calendar/templates/event-editor.hbs",
      scrollable: [".cc-event-editor-content"]
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const config = getConfig();
    const factions = getFactions();
    const existing = this.eventId ? getAllEvents().find((event) => event.id === this.eventId) : null;
    const date = normalizeDate(existing?.date ?? this.initialDate ?? getCurrentDate(), config);
    const event = existing ?? {
      title: "",
      body: "",
      visibility: "public",
      pinned: false,
      xp: null,
      factionChanges: [],
      itemChanges: [],
      date
    };

    const factionChangeRows = (event.factionChanges ?? []).map((change) => {
      const missing = !factions.some((faction) => faction.id === change.factionId);
      const options = factions.map((faction) => ({
        ...faction,
        selected: faction.id === change.factionId
      }));
      if (missing && change.factionId) {
        options.unshift({
          id: change.factionId,
          name: `${change.factionName ?? "Removed Faction"} (removed)`,
          selected: true
        });
      }
      return { ...change, options, deltaDisplay: signed(change.delta) };
    });

    return {
      ...context,
      isEdit: Boolean(existing),
      event,
      date,
      hasXp: event.xp !== null && event.xp !== undefined,
      factions,
      hasFactions: factions.length > 0,
      factionChangeRows,
      itemChanges: event.itemChanges ?? [],
      months: config.months.map((month, index) => ({ ...month, index, selected: index === date.month }))
    };
  }

  _createFactionChangeRow() {
    const factions = getFactions();
    if (!factions.length) {
      ui.notifications.warn("Add at least one faction in the Campaign Calendar manager first.");
      return null;
    }
    const row = document.createElement("div");
    row.className = "cc-tracking-row";
    row.dataset.factionChangeRow = "";

    const select = document.createElement("select");
    select.dataset.role = "faction-id";
    for (const faction of factions) {
      const option = document.createElement("option");
      option.value = faction.id;
      option.textContent = faction.name;
      select.append(option);
    }

    const delta = document.createElement("input");
    delta.type = "number";
    delta.step = "1";
    delta.value = "1";
    delta.dataset.role = "faction-delta";
    delta.title = "Positive numbers increase reputation; negative numbers decrease it.";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "cc-icon-button danger";
    remove.dataset.action = "removeFactionChange";
    remove.title = "Remove faction change";
    remove.innerHTML = '<i class="fa-solid fa-trash"></i>';

    row.append(select, delta, remove);
    return row;
  }

  _createItemChangeRow() {
    const row = document.createElement("div");
    row.className = "cc-tracking-row cc-item-change-row";
    row.dataset.itemChangeRow = "";

    const name = document.createElement("input");
    name.type = "text";
    name.placeholder = "Item or equipment";
    name.dataset.role = "item-name";

    const quantity = document.createElement("input");
    quantity.type = "number";
    quantity.step = "1";
    quantity.value = "1";
    quantity.dataset.role = "item-quantity";
    quantity.title = "Use a positive quantity for gains and a negative quantity for losses.";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "cc-icon-button danger";
    remove.dataset.action = "removeItemChange";
    remove.title = "Remove item change";
    remove.innerHTML = '<i class="fa-solid fa-trash"></i>';

    row.append(name, quantity, remove);
    return row;
  }

  static addFactionChange() {
    const list = this.element.querySelector('[data-role="faction-changes"]');
    const row = this._createFactionChangeRow();
    if (list && row) list.append(row);
  }

  static removeFactionChange(event, target) {
    target.closest("[data-faction-change-row]")?.remove();
  }

  static addItemChange() {
    const list = this.element.querySelector('[data-role="item-changes"]');
    const row = this._createItemChangeRow();
    if (list && row) list.append(row);
  }

  static removeItemChange(event, target) {
    target.closest("[data-item-change-row]")?.remove();
  }

  static async submit(event, form, formData) {
    if (!game.user.isGM) return;
    const data = formData.object;
    const factionChanges = [...form.querySelectorAll("[data-faction-change-row]")].map((row) => {
      const select = row.querySelector('[data-role="faction-id"]');
      return {
        factionId: select?.value ?? "",
        factionName: select?.selectedOptions?.[0]?.textContent?.replace(/ \(removed\)$/, "") ?? "",
        delta: Number(row.querySelector('[data-role="faction-delta"]')?.value ?? 0)
      };
    });
    const itemChanges = [...form.querySelectorAll("[data-item-change-row]")].map((row) => ({
      name: row.querySelector('[data-role="item-name"]')?.value ?? "",
      quantity: Number(row.querySelector('[data-role="item-quantity"]')?.value ?? 0)
    }));

    const payload = {
      title: data.title,
      body: data.body ?? "",
      visibility: data.visibility,
      pinned: form.querySelector('[name="pinned"]')?.checked ?? false,
      xp: data.xp === "" ? null : data.xp,
      factionChanges,
      itemChanges,
      date: {
        year: Number(data.year),
        month: Number(data.month),
        day: Number(data.day),
        era: data.era ?? ""
      }
    };
    if (this.eventId) await updateEvent(this.eventId, payload);
    else await createEvent(payload);
    ui.notifications.info(this.eventId ? "Calendar event updated." : "Calendar event created.");
  }
}
