# Changelog

## 1.3.0 — Raise Hand

- Added a **Raise Hand** button to the player calendar dropdown.
- Clicking **Raise Hand** sends a socket alert to connected GMs without creating a chat message or changing campaign data.
- Each connected GM receives a native Foundry pop-up stating which Foundry user raised their hand.
- Added an **Acknowledge** button to dismiss the GM alert.
- Added `raiseHand()` to the public module API for future integrations.

## 1.2.0 — Campaign Map Explorer

- Added a **Maps** button to the calendar dropdown for players and GMs.
- Added a GM-managed **Campaign Maps** panel to the calendar manager.
- Maps are explicitly curated by the GM; the module does not automatically expose Scenes or unrelated Foundry assets.
- Added Foundry File Picker integration for selecting map image files.
- Added optional map names and short descriptions.
- Added a searchable, thumbnail-based Map Explorer for players.
- Added an individual Map Viewer with mouse-wheel zoom, click-drag panning, Fit, 100%, and double-click-to-fit controls.
- Opening a map is client-local and does not change the active Scene for other players.
- Added synchronized world storage for map definitions.
- Expanded the public API with `getMaps`, `setMaps`, `openMaps`, and `openMap`.

## 1.1.0 — Factions, XP, and Equipment Tracking

- Added GM-managed factions with stable IDs and configurable starting scores.
- Added current faction standings to the top-bar dropdown for players and GMs.
- Added historical faction score snapshots to previous-day event windows.
- Faction scores are derived from the event ledger, so editing or moving an event automatically updates history.
- Added per-event faction reputation gains and losses.
- Added optional per-event XP changes.
- Added per-event item/equipment gains and losses using signed quantities.
- GM-only event adjustments remain private and do not alter the faction totals shown to players.
- Added explicit Month, Day, Year, and Era/Age labels to the GM current-date controls.
- Expanded the public API with `getFactions`, `setFactions`, and `getFactionStandings`.


## 1.0.1 — Current Day Events

- Added a **Current Day Events** section to the top-bar dropdown.
- Current-day event titles are now visible immediately when the date control is opened.
- Clicking a current-day event opens the full day-events window for that date.
- Pinned current-day events display a pin indicator; GM-only events display a lock to GMs.
- Player views continue to show only player-visible events.

## 1.0.0 — Initial Release

- Compact current-date display at the top of the Foundry interface.
- GM controls to advance, reverse, or directly set the campaign date.
- Configurable calendar name, month names, month lengths, year label, and optional era/age.
- Multiple events per date.
- Player-visible and GM-only event visibility.
- Pinned important events.
- Foundry ProseMirror rich-text event editor.
- Player-facing previous-event dropdown and full searchable history browser.
- Day detail windows for reviewing all visible events on a selected date.
- GM event search, editing, and deletion.
- Calendar configuration JSON import/export.
- Public module API for macros and future module integrations.
- GitHub Actions release packaging.
