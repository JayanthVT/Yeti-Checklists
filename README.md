# YETI Flight Checklists

A tablet-friendly web app that replaces the handwritten pre-flight and post-flight checklists for the YETI UAV flight trials at ideaForge. Operators fill the checklist on a tablet, tap through it step by step, sign on screen, and share a PDF that looks like the original printed form (straight to Google Drive from the share sheet).

It also includes a **BMS Diagnostic Lookup**: a searchable reference of the Module and PDU diagnostic IDs and BMS states.

It is a plain website: **no server, no database, no build step.** Everything runs in the browser, and every answer stays on the tablet until the operator shares the PDF.

---

## What is in it

| Card on the home screen | What it is | Source document |
|---|---|---|
| **Flight Trial GO / NO-GO Decision Matrix** | 22 checks in 10 categories. For each: GO or NO-GO, the person's name, and a signature. | `IF_YETI_TD0_FTR_SOP_002` |
| **Daily Airworthiness Checklist** | 58 checks in 9 sections. Each is Pass / Fail / Not Available, with remarks. Also weight and CG values, readings, photos and a checker signature. | `IF_YETI_TD0_FTR_CKT_005` |
| **BMS Diagnostic Lookup** | Search 88 Module diag IDs, 54 PDU diag IDs and the BMS state numbers by name, number or description. | Module Diag ID, PDU Diag ID and BMS state PDFs |

### What the operator experiences
1. Pick a checklist. The first page asks for UAV ID, UAV name, trial phase, trial stage, place, date and time. Last-used values are filled in, and date and time default to now.
2. Go through the pages with **Next / Back**. Big buttons are used throughout.
3. If a page still has unchecked items, a pop-up lists them by serial number. The operator can **Go back & fix** or **Continue anyway**.
4. The **Review** page shows a summary and a PDF preview. **Save to Google Drive / Share PDF** opens the tablet's share sheet.
5. The app remembers the draft on the tablet, so the next day the operator only changes what differs.

A badge at the top shows **Connected to internet / Offline**, because sharing to Drive needs internet.

---

## Files in this repo

```
index.html          the whole app (HTML + CSS + JavaScript + data)
sw.js               service worker: keeps the app on the tablet so it opens offline
lib/
  jspdf.umd.min.js              jsPDF 2.5.1 (builds the PDF)
  jspdf.plugin.autotable.min.js jspdf-autotable 3.8.2 (draws the tables in the PDF)
README.md           this file
```

The app is deliberately **one file** (`index.html`), so it is easy to host and to hand to an AI assistant. The two libraries are copies of the official releases, stored here so the app does not depend on another website.

---

## Hosting and updating (GitHub Pages)

- The app is served by **GitHub Pages** from the `main` branch. The URL never changes.
- To update: change the files and push to `main`. Pages rebuilds within a few minutes.
- Tablets pick up the new version the next time the app is opened with internet. The service worker checks the server on every open and only uses its saved copy when there is no signal (or the signal is very slow, over 4 seconds).
- If you change anything in `lib/`, also change `CACHE='yeti-app-v1'` in `sw.js` (for example to `v2`) so tablets download the new library files.
- On iPad, use Safari, then Share, then **Add to Home Screen** for an app-like icon.

### Offline use
After the app has been opened once with internet, it opens offline. Building a PDF works offline. **Saving to Drive needs internet**; the operator can build the PDF offline and share it later.

---

## How `index.html` is organised

The `<script>` is laid out in this order. Search for the `/* ---------- NAME ---------- */` comments, or for the function names below.

| Section | What is in it |
|---|---|
| `<head>` + `<style>` | Page settings, Add-to-Home-Screen tags and the CSS. Colours are CSS variables (`--bg`, `--card`, `--accent`, `--pass`, `--fail`, ...) with a dark-mode override. |
| `<body>` | A top bar (logo, title, online badge) and empty containers: `#home`, `#lookup`, `#wizard`, `#review`, `#navrow` (Home / Back / Next). Everything inside them is built by JavaScript. |
| **DATA** | The checklist content: `GNG_HEADER`, `GNG`, `DLY_HEADER`, `DLY`. **This is where you edit checklist items.** |
| Helpers | `isCheckItem`, `updateNet` (online badge), `LOGO_DATA_URL` (read from the logo in the top bar). |
| **STATE** | `cur` (which checklist), `stepIdx` (which page), `steps` (the pages), `data` (all answers). Draft saving: `loadDraft`, `saveDraft`, `LS_KEY`. |
| Photo and signature | `resizeImageFile` and `mountPhotoPicker` (photos shrunk to 1000 px JPEG), `mountSigPad` (finger / mouse signature on a canvas). |
| **BMS LOOKUP** | `BMS_DATA` (the diag tables), `lkMatch` / `lkResults` (search), `renderLookup`, `openLookup`. |
| **HOME** | `renderHome` builds the three cards. |
| **BUILD STEPS** | `buildSteps` turns the DATA into wizard pages: a header page, one page per category or section, and a Review page. |
| Wizard | `start`, `renderStep` (draws the current page), `missingFor` (finds unchecked items), `next` / `advance` / `back`, `goHome`. |
| **REVIEW** | `renderReview` (summary and preview), `prepareCurrentPdf`. |
| **PDF** | `buildPdf` plus `pageHeader`, `fitImage`, `checklistBox`. Builds the PDF so it mirrors the printed form. |
| Sharing | `sharePdfToDrive` (opens the share sheet, or downloads the file if the browser cannot share files), `fallbackDownload`. |
| Last lines | `renderHome()` starts the app, then the service worker is registered. |

### The answers: the `data` object
All answers live in one flat object, saved to the browser as JSON.

| Key | Holds |
|---|---|
| `uavId`, `uavName`, `trialPhase`, `trialStage`, `flightPlace`, `flightDate`, `flightTime`, `filledBy` | First-page details |
| `gng_<category>_<parameter>` | `{decision:'GO'/'NO-GO', name, sign}` (`sign` is a PNG data URL) |
| `dly_<sl>` (for example `dly_3.2`) | `{result:'pass'/'fail'/'na', remarks, ...extra fields}` |

### Browser storage keys
| Key | Purpose |
|---|---|
| `yeti_draft_gng` | GO / NO-GO draft |
| `yeti_draft_dly_v2` | Daily Airworthiness draft |
| `yeti_last_values` | Remembered UAV ID, name, phase, stage and place |

Storage is limited to a few MB per site, mostly used up by photos. If saving fails, the app shows "Could not save draft".

---

## How to change things

### Add, remove or reword a Daily Airworthiness item
Edit the `DLY` array. It is a list of sections: `["Section title", [items...]]`. An item looks like:

```js
{sl:"3.2", text:"UAV positioned at the center of the test area."}
```

| Field | Meaning |
|---|---|
| `sl` | Serial number shown on screen and in the PDF. **Must be unique.** It is also the key in `data` (`dly_3.2`). |
| `text` | The checklist wording. |
| `group` | Optional. Items with the same `group` in a row are merged under one group label in the PDF. |
| `extra` | Optional. Extra input boxes under the item: `extra:[["pwm","PWM %"]]` is `[key, label]`. Use a third value `"sig"` for a signature pad. |
| `type:"values"` + `fields` | A data row instead of Pass/Fail, such as weight or CG: `fields:[["cgX","along x","num"]]`. The third value `"area"` makes a big text box, anything else a normal one-line box. (All boxes accept letters and numbers.) |
| `type:"photo"` | The photo picker. |
| `footer:true` | Goes in the "Other details / remarks" box at the end, not in the checklist table. |

To renumber items, change the `sl` values and **change the draft key** in `LS_KEY` (for example `_v2` to `_v3`). Otherwise saved drafts from the old numbering will be mixed into the new form.

The repeated wing checks use the `WING` list and the `wing(n, group)` helper.

### Add or change a GO / NO-GO row
Edit `GNG`. Each row is `[parameter, GO condition, NO-GO condition, responsible person]` inside a category: `["Weather", [ [...], [...] ]]`.

### Change the first-page fields
Edit `GNG_HEADER` or `DLY_HEADER`. Each entry is `[key, label]`. The same list is used on screen and in the PDF header table. `flightDate` shows a date picker and `flightTime` a time picker; the rest are text boxes.

### Change the PDF
Edit `buildPdf`. Things you may want to change:
- document numbers and titles: `docNo` and `title` at the top of each branch,
- brand colours: `BRAND_GREEN` and `BRAND_DARK`,
- table column widths: `columnStyles`,
- the photo grid: `cellW`, `cellH`, `gap`, `perRow`,
- the file name: the `fname` lines (for example `DailyAirworthiness_<UAV>_<Phase>_<Stage>_<date>.pdf`).

jsPDF's built-in font has no `<=` / `>=` symbols, so use the ASCII forms `<=` and `>=` in text that goes into the PDF.

### Update the BMS lookup data
`BMS_DATA` holds three lists:
- `module` and `pdu` rows: `[enum, "DIAG_ID_NAME", "description", "severity", delayMs]`,
- `states.module` and `states.pdu`: `[number, "BMS_STATEMACH_NAME"]`.

Module and PDU use different numbers for some states (for example 8 is DISCHARGE on Module but PRECHARGE on PDU), so they are stored separately. In the source PDFs some severity cells look blank but contain white "Fatal Error" text; the lookup shows **Fatal Error** for them.

### Change the logo
The logo is a base64 image inside the `<img>` in the top bar. The PDF reuses the same image, so replace it only there. The Add-to-Home-Screen icon is a separate base64 image in the `<link rel="apple-touch-icon">` tag.

### Change colours or sizes
All of it is in the `<style>` block at the top. Change the CSS variables in `:root` (there is a second set for dark mode).

---

## Rules to keep it working (read before editing, especially with AI)

1. **Keep `index.html` as one file.** Do not split the JavaScript into modules or add a build tool unless you want to rebuild how the app is deployed.
2. **Put text in the page safely.** Anything typed by the operator must go through `esc(...)` before it is placed inside an HTML template string (inside `value="..."` or between tags). Without it, a `"` in a field breaks that field after you leave the page and return.
3. **Keep `sl` values unique** and change `LS_KEY` when renumbering (see above).
4. **Do not rename element IDs** (`home`, `wizard`, `review`, `lookup`, `navrow`, `btnNext`, `btnBack`, `topTitle`, `netBadge`, `stepBody`, ...) without updating the script that uses them.
5. **Keep the logo `<img>` in the top bar.** `LOGO_DATA_URL` reads it for the PDF.
6. **Do not add a second pop-up open at once.** The warning in `next()` checks for an existing `#warnOvl`, because pressing Enter used to stack them.
7. If `lib/` or `sw.js` changes, update `CACHE` in `sw.js`.
8. **Test after every change** (see below).

### Checking a change
- Syntax check: copy the contents of the last `<script>` into a file and run `node --check file.js`. A single typo gives a blank page.
- Open the app, go through both checklists, and open the Review page. A PDF preview must appear (the jsPDF "units width could not fit page" warning in the console is harmless).
- Type a `"` and `<` in a text box, go to the next page and back. The text must come back intact.
- Turn off wifi, fully close and reopen the app. It must still open.

### Using an AI assistant (Claude, ChatGPT and others)
Give it `index.html` and this README, and ask for one change at a time. A good prompt:

> This is a single-file HTML app (see README). Change only [what you want]. Keep all other behaviour the same, escape any operator-typed text with `esc()`, keep `sl` values unique, then show me exactly which lines changed. After the change, check that the script has no syntax errors.

Ask it to explain which part of the file it touched. Do not accept a rewrite of the whole file for a small change. Check the Review page and the PDF on a tablet before updating the live site.

---

## Known limits
- A PDF preview may not show inside the page in Chrome on Android; the **Open full PDF preview** link still works, and sharing is unaffected.
- Data is stored per tablet and per browser. It is not synced between devices.
- There is no login. Anyone who opens the app on a tablet can see the saved draft there.
- Pinch-zoom is disabled on purpose (`maximum-scale=1`) for easier tapping.
- Drafts are not cleared after sharing. The next operator starts from the last answers, which is intended, so check them.
