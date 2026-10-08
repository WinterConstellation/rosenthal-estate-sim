# Local Script Editing Index Design

## Status

Approved direction: use Understand Anything as the codebase visualization map, then add a separate localhost-only editing layer for project-owned script and tuning data.

Implementation is not started. This spec must be reviewed before an implementation plan is written.

## Problem

The project is growing toward large script packs, manifest indexes, and data-driven storylets. Understand Anything can show where files, functions, and data modules relate to each other, but it should not become the first place that writes this game project directly.

The desired authoring flow is:

1. View the codebase structure visually.
2. Select script or tuning data that is safe to edit.
3. Edit text or numbers directly.
4. Save to the actual local project file.
5. Verify that the game still loads and the script indexes remain valid.

## Goals

- Let the user directly edit dialogue, script bodies, choice text, event data, manifest metadata, and balance numbers.
- Keep engine and screen code read-only in the first version.
- Keep editing local to `127.0.0.1`.
- Generate a clear edit index so each editable item has an id, source file, line or object path, category, and validation hints.
- Save changes to local files using structured writes where practical.
- Rebuild the edit index after save so the visible editor state matches disk.
- Provide a narrow verification path after saves.

## Non-Goals

- Do not fork Understand Anything in the first version.
- Do not allow general source editing in the first version.
- Do not edit `src/App.jsx`, `src/engine/`, save migration code, build config, or deployment config through this tool.
- Do not introduce a database for script edits.
- Do not treat generated indexes as source of truth. Source files remain the truth.

## Architecture

The system has three separate parts.

1. Understand Anything dashboard
   - Runs independently.
   - Visualizes `.understand-anything/knowledge-graph.json`.
   - Remains read-only.

2. Script edit index generator
   - Scans approved content files.
   - Produces `.script-edit/index.json`.
   - Produces entries for editable script, choice, manifest, storylet, and tuning data.
   - Refuses files outside the configured allowlist.

3. Local script edit server
   - Runs on `127.0.0.1`.
   - Serves a small editor UI.
   - Reads and writes only allowlisted files.
   - Writes through structured parsers or tightly scoped text ranges.
   - Runs validation after save when requested.

## Editable Scope

First version editable categories:

- Script body packs such as `src/data/scriptPacks/*.js`.
- Manifest metadata such as `src/data/scriptManifest.js`.
- Content data in `src/data/rosenthalContent.js` where entries are stable and id-based.
- Tutorial or fixed script text in `src/rules/tutorialRules.js`.
- Tuning data in `src/rules/systemRules.js` when it is declarative data, not helper logic.

First version locked categories:

- `src/App.jsx`.
- `src/engine/**`.
- `src/components/**`, except future explicitly editable text-only presentation data if separated.
- `scripts/**`, except the edit tool's own scripts.
- `electron/**`.
- `package.json`, `vite.config.js`, build config, deployment config, and save migration logic.

## Edit Index Shape

Each editable item should be represented by an entry like:

```json
{
  "id": "script-pack:special-event-groups:group-1:stage-2",
  "kind": "dialogue",
  "label": "Special Event Group 1 / Stage 2",
  "sourceFile": "src/data/scriptPacks/specialEventGroups.js",
  "locator": {
    "type": "export-object-path",
    "exportName": "SPECIAL_EVENT_GROUPS",
    "path": ["0", "stages", "1", "text"]
  },
  "editableFields": [
    {
      "name": "text",
      "type": "multilineText"
    }
  ],
  "verify": ["npm.cmd run verify"]
}
```

The exact ids may change during implementation, but every entry must be stable enough to survive normal text edits.

## Editing Model

The editor should not perform blind string replacement as the default path.

Preferred write order:

1. Parse a known JS data module.
2. Locate the export and object path for the editable item.
3. Replace only the selected field.
4. Preserve UTF-8 without BOM and LF.
5. Re-run the index generator.

If a file cannot be safely parsed, the item should become read-only until an explicit parser path is added.

## UI Flow

The local editor opens as a focused authoring tool, not a landing page.

Expected first version layout:

- Left: searchable editable index grouped by kind and source file.
- Center: text or JSON field editor for the selected item.
- Right: source context, related manifest/storylet metadata, and validation status.
- Footer or top toolbar: save, discard, re-index, run verify.

The UI should show locked files as context only when useful, but it must not offer a save action for them.

## Safety

- Bind to `127.0.0.1` only.
- Require a one-time token in the URL, similar to Understand Anything.
- Reject absolute paths from the client.
- Normalize every requested path and verify it stays inside the project root.
- Require that write targets exist in `.script-edit/config.json` allowlist and `.script-edit/index.json`.
- Create a small backup or recoverable patch record before overwriting a source file.
- Report exactly which file changed after save.
- Never write source or docs through PowerShell redirection.

## Configuration

`.script-edit/config.json` should hold the first version policy:

```json
{
  "allow": [
    "src/data/scriptPacks/*.js",
    "src/data/scriptManifest.js",
    "src/data/rosenthalContent.js",
    "src/rules/tutorialRules.js",
    "src/rules/systemRules.js"
  ],
  "deny": [
    "src/App.jsx",
    "src/engine/**",
    "electron/**",
    "scripts/**",
    "package.json",
    "vite.config.js"
  ],
  "verify": ["npm.cmd run verify"]
}
```

Implementation may generate this file if missing, but it should not silently broaden permissions.

## Validation

Initial verification:

- `npm.cmd run verify` after index generator changes.
- `npm.cmd run build` when the server/UI changes or dynamic import behavior is touched.
- Save-path tests for allowlisted write, denied write, path traversal rejection, and malformed input rejection.
- Index tests for `scriptManifest.js` and `specialEventGroups.js`.

## Rollout

Phase 1:

- Add config and index generator.
- Generate editable entries for `scriptManifest.js` and `specialEventGroups.js`.
- Keep UI/server out of scope until index output is stable.

Phase 2:

- Add localhost edit server and simple UI.
- Allow viewing and saving safe fields from the generated index.
- Re-index after save.

Phase 3:

- Add more data modules and balance/tuning fields.
- Add validation status in the UI.

Phase 4:

- Consider optional integration buttons or links from Understand Anything.
- Consider carefully scoped advanced source editing only after script/data editing is proven stable.

## Acceptance Criteria

- The user can open a local editing UI and edit an allowlisted script or tuning item.
- Saving changes the real local source file.
- Denied files cannot be written through the editor.
- The edit index is regenerated after a successful save.
- The editor reports changed file paths and validation results.
- `npm.cmd run verify` passes after the first implementation slice.
