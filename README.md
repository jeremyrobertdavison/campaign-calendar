# Campaign Calendar for Foundry VTT

Campaign Calendar is a system-agnostic Foundry Virtual Tabletop module that keeps your campaign's current in-game date visible at the top of the screen and turns past dates into a browsable campaign history.

GMs can control the date, define a custom calendar, and record rich-text events for any day. Players can use the date dropdown to see events recorded for the current day, revisit previous days that contain visible notes, and open a window showing the events recorded for any listed date.

## Features

- **Always-visible current date** in a compact top-screen display.
- **GM date controls** for previous day, next day, or direct date entry.
- **Custom calendars** with configurable month names and days per month.
- **Optional eras/ages** such as `4th Age`, `Age of Adventure`, or any campaign-specific label.
- **Multiple events per day** with titles and rich-text details.
- **Player-visible or GM-only notes** on an event-by-event basis.
- **Pinned events** for major campaign moments.
- **Current-day event list** directly in the date dropdown, with one-click access to the full day record.
- **Quick history dropdown** showing recent previous dates with notes.
- **Full searchable history browser** for players and GMs.
- **GM event manager** with edit and delete controls.
- **JSON import/export** for calendar definitions.
- **Persistent world data** stored in Foundry world settings.
- **System agnostic**: no game system dependency.
- **Public API** so macros and other modules can advance the calendar or add events.

## Compatibility

- Foundry VTT **13 or newer**
- Verified against Foundry VTT **14**

Campaign Calendar uses Foundry's modern ApplicationV2 interfaces and the native ProseMirror editor.

## Installation

### Foundry Manifest URL

After the GitHub repository and first release are published, paste this URL into **Install Module → Manifest URL** in Foundry:

```text
https://raw.githubusercontent.com/jeremyrobertdavison/campaign-calendar/main/module.json
```

Then enable **Campaign Calendar** from **Manage Modules** in your world.

### Manual Installation

Download `campaign-calendar.zip` from the latest GitHub release and extract it into:

```text
<Data>/modules/campaign-calendar/
```

Restart Foundry if necessary and enable the module in your world.

## Using the Module

### Current Date

The current campaign date appears at the top center of the Foundry interface. Clicking it opens a dropdown.

Players can:

- See the current campaign date.
- See player-visible events recorded for the current day directly in the dropdown.
- Click a current-day event to open the complete event window for that date.
- Select recent previous dates that contain player-visible events.
- Open the full searchable campaign history.

GMs can also:

- Move the date backward one day.
- Move the date forward one day.
- Open the full GM calendar manager.

### Recording Events

Open **Manage** from the date dropdown and select **Add Event**.

Each event supports:

- Date
- Era/Age
- Title
- Rich-text event details
- Player-visible or GM-only visibility
- Pinned/important status

Several events can exist on the same date.

### Custom Calendar

The GM manager includes a calendar configuration section. Define months using one line per month:

```text
Frostfang|30
Icethorn|30
Rainshadow|31
```

The text before `|` is the month name. The number after it is the number of days in that month.

The calendar configuration can be exported to JSON and imported into another world.

## Module API

The module exposes an API at:

```javascript
game.modules.get("campaign-calendar").api
```

Examples:

```javascript
// Advance one day
await game.modules.get("campaign-calendar").api.advanceDay(1);

// Advance seven days
await game.modules.get("campaign-calendar").api.advanceDay(7);

// Move back one day
await game.modules.get("campaign-calendar").api.advanceDay(-1);

// Read the current date
const date = game.modules.get("campaign-calendar").api.getCurrentDate();

// Add a player-visible event
await game.modules.get("campaign-calendar").api.createEvent({
  title: "Arrival at Ravenhiem",
  body: "<p>The party reached the western gate shortly before sunset.</p>",
  visibility: "public",
  pinned: false,
  date
});
```

Write operations require a GM user.

## Publishing This Repository on GitHub

This repository is configured for:

```text
https://github.com/jeremyrobertdavison/campaign-calendar
```

1. Create a **public** GitHub repository named `campaign-calendar` under `jeremyrobertdavison`.
2. Upload the contents of this project so `module.json` is at the repository root.
3. Commit and push the files to the `main` branch.
4. Create a tag matching the module version, such as `v1.0.1`, and push it.
5. The included GitHub Actions workflow will create a GitHub Release and attach `campaign-calendar.zip` automatically.
6. Use the manifest URL shown above to install the module in Foundry.

For later versions, update the `version` field in `module.json`, update `CHANGELOG.md`, commit the changes, and push a new version tag such as `v1.1.0`.

## Data and Permissions

The current date, calendar definition, and player-visible events are stored in Foundry world settings. GM-only events are stored separately in a private Journal Entry owned only by the GM role, rather than being sent as part of the public event store. Only GMs can modify calendar data. Players receive read-only access to events marked **Visible to Players**.

As with any module that stores campaign data, back up your Foundry user data before major upgrades.

## License

Campaign Calendar is released under the [MIT License](LICENSE).

## Author

**Jeremy Davison**  
GitHub: [jeremyrobertdavison](https://github.com/jeremyrobertdavison)
