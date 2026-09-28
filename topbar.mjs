import {
  advanceCurrentDate,
  formatDate,
  getCurrentDate,
  getDateGroups,
  getEventsForDate,
  getFactionStandings,
  parseDateKey,
  raiseHand,
  sameDate
} from "./calendar-service.mjs";
import { CalendarHistoryApplication } from "./applications/history.mjs";
import { CalendarManagerApplication } from "./applications/manager.mjs";
import { DayEventsApplication } from "./applications/day-events.mjs";
import { MapExplorerApplication } from "./applications/map-explorer.mjs";
import { DossierApplication } from "./applications/dossier.mjs";
import { QuestLogApplication } from "./applications/quest-log.mjs";

export class CalendarTopBar {
  static mount() {
    this.unmount();
    const root = document.createElement("div");
    root.id = "campaign-calendar-topbar";
    root.className = "campaign-calendar-topbar";
    root.innerHTML = `
      <button type="button" class="cc-date-button" aria-haspopup="true" aria-expanded="false">
        <i class="fa-solid fa-calendar-day" aria-hidden="true"></i>
        <span class="cc-current-date"></span>
        <i class="fa-solid fa-chevron-down cc-chevron" aria-hidden="true"></i>
      </button>
      <div class="cc-topbar-dropdown" hidden></div>
    `;
    document.body.append(root);

    const button = root.querySelector(".cc-date-button");
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const dropdown = root.querySelector(".cc-topbar-dropdown");
      const willOpen = dropdown.hidden;
      dropdown.hidden = !willOpen;
      button.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) this.renderDropdown();
    });

    document.addEventListener("click", this._documentClick ??= (event) => {
      const existing = document.getElementById("campaign-calendar-topbar");
      if (!existing || existing.contains(event.target)) return;
      const dropdown = existing.querySelector(".cc-topbar-dropdown");
      if (dropdown) dropdown.hidden = true;
      existing.querySelector(".cc-date-button")?.setAttribute("aria-expanded", "false");
    });

    this.refresh();
  }

  static unmount() {
    document.getElementById("campaign-calendar-topbar")?.remove();
  }

  static refresh() {
    const root = document.getElementById("campaign-calendar-topbar");
    if (!root) return;
    root.querySelector(".cc-current-date").textContent = formatDate(getCurrentDate());
    if (!root.querySelector(".cc-topbar-dropdown")?.hidden) this.renderDropdown();
  }

  static renderDropdown() {
    const root = document.getElementById("campaign-calendar-topbar");
    const dropdown = root?.querySelector(".cc-topbar-dropdown");
    if (!dropdown) return;
    dropdown.replaceChildren();

    const current = getCurrentDate();
    const header = document.createElement("div");
    header.className = "cc-dropdown-current";
    const label = document.createElement("strong");
    label.textContent = formatDate(current);
    header.append(label);
    dropdown.append(header);

    if (game.user.isGM) {
      const controls = document.createElement("div");
      controls.className = "cc-dropdown-controls";
      const previous = this.makeButton("fa-solid fa-minus", "Previous Day", async () => {
        await advanceCurrentDate(-1);
        this.refresh();
      });
      const manage = this.makeButton("fa-solid fa-gear", "Manage", () => {
        new CalendarManagerApplication().render({ force: true });
        this.closeDropdown();
      });
      const next = this.makeButton("fa-solid fa-plus", "Next Day", async () => {
        await advanceCurrentDate(1);
        this.refresh();
      });
      controls.append(previous, manage, next);
      dropdown.append(controls);
    }

    const currentDivider = document.createElement("div");
    currentDivider.className = "cc-dropdown-divider";
    dropdown.append(currentDivider);

    const currentTitle = document.createElement("div");
    currentTitle.className = "cc-dropdown-heading";
    currentTitle.textContent = "Current Day Events";
    dropdown.append(currentTitle);

    const currentEvents = getEventsForDate(current)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.title.localeCompare(b.title));

    if (!currentEvents.length) {
      const empty = document.createElement("div");
      empty.className = "cc-dropdown-empty cc-current-events-empty";
      empty.textContent = "No events recorded for the current date.";
      dropdown.append(empty);
    } else {
      for (const event of currentEvents.slice(0, 6)) {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "cc-history-row cc-current-event-row";
        row.title = "Open all events for the current date";

        const left = document.createElement("span");
        left.className = "cc-current-event-title";
        left.textContent = event.title;

        const right = document.createElement("span");
        right.className = "cc-history-meta cc-current-event-meta";
        if (event.pinned) {
          const pin = document.createElement("i");
          pin.className = "fa-solid fa-thumbtack";
          pin.title = "Pinned";
          right.append(pin);
        }
        if (game.user.isGM && event.visibility === "gm") {
          const lock = document.createElement("i");
          lock.className = "fa-solid fa-lock";
          lock.title = "GM Only";
          right.append(lock);
        }

        row.append(left, right);
        row.addEventListener("click", () => {
          new DayEventsApplication(current).render({ force: true });
          this.closeDropdown();
        });
        dropdown.append(row);
      }

      if (currentEvents.length > 6) {
        const more = document.createElement("button");
        more.type = "button";
        more.className = "cc-current-events-more";
        more.textContent = `View all ${currentEvents.length} current-day events`;
        more.addEventListener("click", () => {
          new DayEventsApplication(current).render({ force: true });
          this.closeDropdown();
        });
        dropdown.append(more);
      }
    }

    const factionDivider = document.createElement("div");
    factionDivider.className = "cc-dropdown-divider";
    dropdown.append(factionDivider);

    const factionTitle = document.createElement("div");
    factionTitle.className = "cc-dropdown-heading";
    factionTitle.textContent = "Current Faction Standings";
    dropdown.append(factionTitle);

    const standings = getFactionStandings(current);
    if (!standings.length) {
      const empty = document.createElement("div");
      empty.className = "cc-dropdown-empty cc-current-events-empty";
      empty.textContent = game.user.isGM ? "No factions configured yet." : "No factions are being tracked yet.";
      dropdown.append(empty);
    } else {
      for (const faction of standings.slice(0, 8)) {
        const row = document.createElement("div");
        row.className = "cc-faction-standings-row";
        row.title = `Starting score: ${faction.baseScore}`;
        const name = document.createElement("span");
        name.textContent = faction.name;
        const score = document.createElement("strong");
        score.textContent = String(faction.score);
        row.append(name, score);
        dropdown.append(row);
      }
      if (standings.length > 8) {
        const more = document.createElement("button");
        more.type = "button";
        more.className = "cc-current-events-more";
        more.textContent = `View all ${standings.length} factions`;
        more.addEventListener("click", () => {
          new DayEventsApplication(current).render({ force: true });
          this.closeDropdown();
        });
        dropdown.append(more);
      }
    }

    const divider = document.createElement("div");
    divider.className = "cc-dropdown-divider";
    dropdown.append(divider);

    const title = document.createElement("div");
    title.className = "cc-dropdown-heading";
    title.textContent = "Previous Events";
    dropdown.append(title);

    const groups = getDateGroups({ limit: 12, includeFuture: false }).filter((group) => !sameDate(group.date, current)).slice(0, 10);
    if (!groups.length) {
      const empty = document.createElement("div");
      empty.className = "cc-dropdown-empty";
      empty.textContent = "No visible calendar notes yet.";
      dropdown.append(empty);
    } else {
      for (const group of groups) {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "cc-history-row";
        row.title = `${group.count} event${group.count === 1 ? "" : "s"}`;
        const left = document.createElement("span");
        left.textContent = group.label;
        const right = document.createElement("span");
        right.className = "cc-history-meta";
        right.textContent = `${group.pinned ? "★ " : ""}${group.count}`;
        row.append(left, right);
        row.addEventListener("click", () => {
          new DayEventsApplication(parseDateKey(group.key)).render({ force: true });
          this.closeDropdown();
        });
        dropdown.append(row);
      }
    }

    const browse = this.makeButton("fa-solid fa-book-open", "Browse Full History", () => {
      new CalendarHistoryApplication().render({ force: true });
      this.closeDropdown();
    });
    browse.classList.add("cc-browse-button");
    dropdown.append(browse);

    const maps = this.makeButton("fa-solid fa-map", "Maps", () => {
      new MapExplorerApplication().render({ force: true });
      this.closeDropdown();
    });
    maps.classList.add("cc-browse-button", "cc-maps-button");
    dropdown.append(maps);

    const dossier = this.makeButton("fa-solid fa-address-book", "Dossier", () => {
      new DossierApplication().render({ force: true });
      this.closeDropdown();
    });
    dossier.classList.add("cc-browse-button", "cc-dossier-button");
    dropdown.append(dossier);

    const questLog = this.makeButton("fa-solid fa-scroll", "Quest Log", () => {
      new QuestLogApplication().render({ force: true });
      this.closeDropdown();
    });
    questLog.classList.add("cc-browse-button", "cc-quest-log-button");
    dropdown.append(questLog);

    if (!game.user.isGM) {
      const raise = this.makeButton("fa-solid fa-hand", "Raise Hand", async () => {
        await raiseHand();
        this.closeDropdown();
      });
      raise.classList.add("cc-browse-button", "cc-raise-hand-button");
      dropdown.append(raise);
    }
  }

  static makeButton(iconClass, label, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cc-inline-button";
    const icon = document.createElement("i");
    icon.className = iconClass;
    icon.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.textContent = label;
    button.append(icon, text);
    button.addEventListener("click", handler);
    return button;
  }

  static closeDropdown() {
    const root = document.getElementById("campaign-calendar-topbar");
    const dropdown = root?.querySelector(".cc-topbar-dropdown");
    if (dropdown) dropdown.hidden = true;
    root?.querySelector(".cc-date-button")?.setAttribute("aria-expanded", "false");
  }
}
