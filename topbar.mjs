import { advanceCurrentDate, formatDate, getCurrentDate, getDateGroups, parseDateKey, sameDate } from "./calendar-service.mjs";
import { CalendarHistoryApplication } from "./applications/history.mjs";
import { CalendarManagerApplication } from "./applications/manager.mjs";
import { DayEventsApplication } from "./applications/day-events.mjs";

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
