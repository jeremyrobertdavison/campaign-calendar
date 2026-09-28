import { createEvent, getAllEvents, getConfig, getCurrentDate, normalizeDate, updateEvent } from "../calendar-service.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class EventEditorApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ eventId = null, date = null } = {}, options = {}) {
    super({ id: eventId ? `campaign-calendar-event-${eventId}` : "campaign-calendar-event-new", ...options });
    this.eventId = eventId;
    this.initialDate = date;
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["campaign-calendar", "campaign-calendar-event-editor"],
    position: { width: 600, height: 650 },
    window: {
      title: "Campaign Calendar — Event",
      icon: "fa-solid fa-pen-to-square",
      resizable: true
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
      scrollable: [""]
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const config = getConfig();
    const existing = this.eventId ? getAllEvents().find((event) => event.id === this.eventId) : null;
    const date = normalizeDate(existing?.date ?? this.initialDate ?? getCurrentDate(), config);
    const event = existing ?? {
      title: "",
      body: "",
      visibility: "public",
      pinned: false,
      date
    };
    return {
      ...context,
      isEdit: Boolean(existing),
      event,
      date,
      months: config.months.map((month, index) => ({ ...month, index, selected: index === date.month }))
    };
  }

  static async submit(event, form, formData) {
    if (!game.user.isGM) return;
    const data = formData.object;
    const payload = {
      title: data.title,
      body: data.body ?? "",
      visibility: data.visibility,
      pinned: form.querySelector('[name="pinned"]')?.checked ?? false,
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
