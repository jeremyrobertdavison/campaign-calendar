import { getMaps } from "../calendar-service.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export class MapViewerApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    const { mapId, ...appOptions } = options;
    super(appOptions);
    this.mapId = mapId;
    this._view = { scale: 1, x: 0, y: 0 };
    this._didInitialFit = false;
  }

  static DEFAULT_OPTIONS = {
    id: "campaign-calendar-map-viewer",
    classes: ["campaign-calendar", "campaign-calendar-map-viewer"],
    position: { width: 980, height: 760 },
    window: {
      title: "Campaign Map",
      icon: "fa-solid fa-map-location-dot",
      resizable: true
    },
    actions: {
      zoomIn: MapViewerApplication.zoomIn,
      zoomOut: MapViewerApplication.zoomOut,
      fitMap: MapViewerApplication.fitMap,
      actualSize: MapViewerApplication.actualSize
    }
  };

  static PARTS = {
    main: {
      template: "modules/campaign-calendar/templates/map-viewer.hbs"
    }
  };

  get title() {
    const map = getMaps().find((entry) => entry.id === this.mapId);
    return map?.name ? `Map — ${map.name}` : "Campaign Map";
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const map = getMaps().find((entry) => entry.id === this.mapId) ?? null;
    return { ...context, map };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const map = getMaps().find((entry) => entry.id === this.mapId);
    if (!map) {
      ui.notifications.warn("That campaign map is no longer available.");
      this.close();
      return;
    }

    const viewport = this.element.querySelector(".cc-map-viewer-viewport");
    const image = this.element.querySelector(".cc-map-viewer-image");
    if (!viewport || !image) return;

    const fit = () => {
      if (!this._didInitialFit) {
        this._fitToViewport();
        this._didInitialFit = true;
      } else {
        this._applyView();
      }
    };

    if (image.complete && image.naturalWidth) fit();
    else image.addEventListener("load", fit, { once: true });

    image.addEventListener("error", () => {
      ui.notifications.error(`Unable to load map image: ${map.name}`);
    }, { once: true });

    viewport.addEventListener("wheel", (event) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      const rect = viewport.getBoundingClientRect();
      this._zoomAt(
        this._view.scale * factor,
        event.clientX - rect.left,
        event.clientY - rect.top
      );
    }, { passive: false });

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    viewport.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      viewport.setPointerCapture?.(event.pointerId);
      viewport.classList.add("is-dragging");
    });

    viewport.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      this._view.x += event.clientX - lastX;
      this._view.y += event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      this._applyView();
    });

    const stopDrag = (event) => {
      dragging = false;
      viewport.classList.remove("is-dragging");
      if (event?.pointerId !== undefined) viewport.releasePointerCapture?.(event.pointerId);
    };
    viewport.addEventListener("pointerup", stopDrag);
    viewport.addEventListener("pointercancel", stopDrag);

    viewport.addEventListener("dblclick", () => this._fitToViewport());
  }

  _elements() {
    return {
      viewport: this.element?.querySelector(".cc-map-viewer-viewport"),
      image: this.element?.querySelector(".cc-map-viewer-image"),
      zoomLabel: this.element?.querySelector('[data-role="zoom-label"]')
    };
  }

  _applyView() {
    const { image, zoomLabel } = this._elements();
    if (!image) return;
    image.style.transform = `translate(${this._view.x}px, ${this._view.y}px) scale(${this._view.scale})`;
    if (zoomLabel) zoomLabel.textContent = `${Math.round(this._view.scale * 100)}%`;
  }

  _zoomAt(nextScale, centerX, centerY) {
    const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    const oldScale = this._view.scale || 1;
    const imageX = (centerX - this._view.x) / oldScale;
    const imageY = (centerY - this._view.y) / oldScale;
    this._view.scale = scale;
    this._view.x = centerX - imageX * scale;
    this._view.y = centerY - imageY * scale;
    this._applyView();
  }

  _zoomCentered(factor) {
    const { viewport } = this._elements();
    if (!viewport) return;
    this._zoomAt(
      this._view.scale * factor,
      viewport.clientWidth / 2,
      viewport.clientHeight / 2
    );
  }

  _fitToViewport() {
    const { viewport, image } = this._elements();
    if (!viewport || !image?.naturalWidth || !image?.naturalHeight) return;
    const availableWidth = Math.max(viewport.clientWidth - 24, 1);
    const availableHeight = Math.max(viewport.clientHeight - 24, 1);
    const scale = clamp(Math.min(
      availableWidth / image.naturalWidth,
      availableHeight / image.naturalHeight,
      1
    ), MIN_SCALE, MAX_SCALE);
    this._view.scale = scale;
    this._view.x = (viewport.clientWidth - image.naturalWidth * scale) / 2;
    this._view.y = (viewport.clientHeight - image.naturalHeight * scale) / 2;
    this._applyView();
  }

  _actualSize() {
    const { viewport, image } = this._elements();
    if (!viewport || !image?.naturalWidth || !image?.naturalHeight) return;
    this._view.scale = 1;
    this._view.x = (viewport.clientWidth - image.naturalWidth) / 2;
    this._view.y = (viewport.clientHeight - image.naturalHeight) / 2;
    this._applyView();
  }

  static zoomIn() {
    this._zoomCentered(1.2);
  }

  static zoomOut() {
    this._zoomCentered(1 / 1.2);
  }

  static fitMap() {
    this._fitToViewport();
  }

  static actualSize() {
    this._actualSize();
  }
}
