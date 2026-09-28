# Campaign Calendar for Foundry VTT

Campaign Calendar is a system-agnostic Foundry Virtual Tabletop module that keeps your campaign's current in-game date visible at the top of the screen and turns past dates into a browsable campaign history.

GMs can control the date, define a custom calendar, record rich-text events for any day, and track faction reputation, XP, and item/equipment changes tied to those events. Players can use the date dropdown to see events recorded for the current day, view current faction standings, revisit previous days that contain visible notes, open a window showing the events and historical faction scores for any listed date, open a GM-curated Map Explorer for campaign maps they have been given, browse a GM-curated Dossier of key NPCs, review a GM-maintained Quest Log, and raise their hand to alert the GM.

## Features

- **Always-visible current date** in a compact top-screen display.
- **GM date controls** for previous day, next day, or direct date entry.
- **Custom calendars** with configurable month names and days per month.
- **Optional eras/ages** such as `4th Age`, `Age of Adventure`, or any campaign-specific label.
- **Multiple events per day** with titles and rich-text details.
- **Player-visible or GM-only notes** on an event-by-event basis.
- **Pinned events** for major campaign moments.
- **Current-day event list** directly in the date dropdown, with one-click access to the full day record.
- **Faction tracking** with GM-configured faction names and starting scores.
- **Current faction standings** visible to players in the current-date dropdown.
- **Historical faction standings** reconstructed for past dates from the event ledger.
- **Faction changes per event**, including visible gain/loss values such as `+2` or `-5`.
- **XP per event**, including positive or negative adjustments.
- **Item and equipment gains/losses per event**, with signed quantities.
- **Quick history dropdown** showing recent previous dates with notes.
- **Full searchable history browser** for players and GMs.
- **GM event manager** with edit and delete controls.
- **JSON import/export** for calendar definitions.
- **Persistent world data** stored in Foundry world settings.
- **System agnostic**: no game system dependency.
- **Public API** so macros and other modules can advance the calendar or add events.
- **GM-curated Map Explorer** accessible directly from the date dropdown.
- **Self-service player maps**: players can open any map the GM has added without changing scenes or asking the GM to re-share it.
- **Foundry File Picker integration** for adding map image files from User Data, Public, or configured storage.
- **Map search and thumbnail browser** with optional short descriptions.
- **Interactive map viewer** with mouse-wheel zoom, click-drag panning, Fit, and 100% controls.
- **Key NPC Dossier** accessible from the date dropdown, with GM-curated names, portraits, and descriptions.
- **Dossier search** so players can quickly find a known NPC.
- **Quest Log** accessible from the date dropdown, with GM-managed title, quest giver, description, and reward fields.
- **Quest search** so players can quickly find a quest by title, giver, description, or reward.
- **Raise Hand** button for players that opens an immediate GM-side alert identifying the player.

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
- Open **Maps** to browse campaign map images the GM has made available.
- Open **Dossier** to browse key NPCs the GM has made available, including their portrait and description.
- Open **Quest Log** to review quests the GM has added, including the quest giver, description, and reward.
- Select **Raise Hand** to alert connected GMs that they have a question or want the GM's attention.
- See current faction scores directly in the date dropdown.
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
- XP gained or lost
- One or more faction score changes
- One or more item/equipment gains or losses

Several events can exist on the same date.

### Factions and Historical Scores

In the GM Manager, use the **Factions** panel to add a faction name and its starting score. Event records can then apply positive or negative changes to one or more factions.

Campaign Calendar calculates faction standings from the ledger instead of overwriting history. This means:

- The current date shows the current score after all visible events up to that date.
- Opening a previous date shows the score as it stood at the end of that historical day.
- Each event shows its own faction gain or loss.
- Editing or moving an event automatically changes the derived historical scores.
- GM-only event changes remain private: players only calculate faction standings from player-visible events, while GMs also see adjustments from GM-only events.

Item/equipment changes are a campaign-history ledger; they do not directly add or remove Items from Actor sheets.


### Campaign Maps

The date dropdown includes a **Maps** button for both players and GMs. It opens the Map Explorer, which contains only map images that have been explicitly added to Campaign Calendar by a GM. The module does not automatically expose Foundry Scenes, Tiles, Journals, or other image files.

To add maps as a GM:

1. Open **Manage** from the calendar dropdown.
2. Find the **Campaign Maps** panel.
3. Select **Add Map**.
4. Enter a map name and optional short description.
5. Use **Browse** to choose an image with Foundry's File Picker, or enter the Foundry asset path directly.
6. Select **Save Maps**.

Players can then open **Maps** whenever they want. Selecting a map opens an individual viewer on that player's client, so opening or inspecting a map does not change the active Scene for anyone else. The viewer supports mouse-wheel zoom, click-and-drag panning, **Fit**, **100%**, and double-click-to-fit.

Removing a map from the Campaign Maps panel removes it from the Map Explorer the next time clients synchronize. Removing it from this module does not delete the underlying image file from Foundry storage.


### Campaign Dossier

The date dropdown includes a **Dossier** button for both players and GMs. It opens a searchable reference screen containing only key NPCs that a GM has explicitly added to Campaign Calendar. Each dossier entry contains an NPC **name**, **image/portrait**, and **description**.

To add NPCs as a GM:

1. Open **Manage** from the calendar dropdown.
2. Find the **Campaign Dossier** panel.
3. Select **Add NPC**.
4. Enter the NPC's name and description.
5. Use **Browse** to select a portrait or other image with Foundry's File Picker, or enter the Foundry asset path directly.
6. Select **Save Dossier**.

Players can then open **Dossier** at any time without changing scenes or affecting another player's interface. Only NPCs saved in the Campaign Dossier panel are shown. Removing an NPC from the dossier does not delete the underlying image file from Foundry storage.

### Quest Log

The date dropdown includes a **Quest Log** button for both players and GMs. It opens a searchable campaign quest reference containing entries explicitly created by the GM. Each quest contains a **title**, **quest giver**, **description**, and **reward**.

To add quests as a GM:

1. Open **Manage** from the calendar dropdown.
2. Find the **Quest Log** panel.
3. Select **Add Quest**.
4. Enter the quest title, quest giver, description, and reward.
5. Select **Save Quest Log**.

Players can then open **Quest Log** whenever they want without changing scenes or affecting another player's interface. The search field matches the quest title, giver, description, and reward. Removing a quest from the manager removes it from the player-facing Quest Log after synchronization.

### Raise Hand

Players have a **Raise Hand** button at the bottom of the calendar dropdown. Clicking it immediately sends an alert over Foundry's module socket to every connected GM. The GM receives a pop-up such as:

```text
Player Alex has raised their hand.
```

The alert includes an **Acknowledge** button for the GM. If no GM is currently connected, the player is told that no GM is available. Raising a hand does not post to chat, alter calendar data, or create a persistent campaign record. The player's Foundry user name is used in the alert.

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

// Read current faction standings
const standings = game.modules.get("campaign-calendar").api.getFactionStandings(date);

// Read maps made available by the GM
const maps = game.modules.get("campaign-calendar").api.getMaps();

// Open the Map Explorer
game.modules.get("campaign-calendar").api.openMaps();

// Open one map by ID
game.modules.get("campaign-calendar").api.openMap(maps[0].id);

// Read key NPC dossier entries
const dossier = game.modules.get("campaign-calendar").api.getDossiers();

// Open the Dossier
game.modules.get("campaign-calendar").api.openDossier();

// Read quests made available by the GM
const quests = game.modules.get("campaign-calendar").api.getQuests();

// Open the Quest Log
game.modules.get("campaign-calendar").api.openQuestLog();

// Player: alert connected GMs
await game.modules.get("campaign-calendar").api.raiseHand();

// Add a player-visible event
await game.modules.get("campaign-calendar").api.createEvent({
  title: "Arrival at Ravenhiem",
  body: "<p>The party reached the western gate shortly before sunset.</p>",
  visibility: "public",
  pinned: false,
  xp: 500,
  factionChanges: [{ factionId: "exampleFactionId", delta: 2 }],
  itemChanges: [{ name: "Potion of Healing", quantity: 1 }],
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
4. Create a tag matching the module version, such as `v1.5.0`, and push it.
5. The included GitHub Actions workflow will create a GitHub Release and attach `campaign-calendar.zip` automatically.
6. Use the manifest URL shown above to install the module in Foundry.

For later versions, update the `version` field in `module.json`, update `CHANGELOG.md`, commit the changes, and push a new version tag such as `v1.5.0`.

## Data and Permissions

The current date, calendar definition, faction definitions, campaign map definitions, campaign dossier definitions, quest-log entries, and player-visible events are stored in Foundry world settings. GM-only events are stored separately in a private Journal Entry owned only by the GM role, rather than being sent as part of the public event store. Only GMs can modify calendar data. Players receive read-only access to events marked **Visible to Players**. Player-facing faction standings are derived only from those visible events, preventing GM-only event adjustments from leaking through faction totals.

As with any module that stores campaign data, back up your Foundry user data before major upgrades.

## License

Campaign Calendar is released under the [MIT License](LICENSE).

## Author

**Jeremy Davison**  
GitHub: [jeremyrobertdavison](https://github.com/jeremyrobertdavison)
