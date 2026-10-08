# Sharp Life Portal 8.0.8 — Release Notes

**Release date:** 7 October 2026  
**Portal:** https://alexanderjermakov-collab.github.io/titan-remote-scroll-test/?release=8.0.8

## Release overview

Version 8.0.8 updates Sharp Life Portal for Titan TV integration, with particular focus on TV-controlled language selection, Titan Text To Speech (TTS), focus behavior, Instruction Manual presentation, accessibility, and visual consistency.

The Portal no longer asks the user to choose a language during startup. Instead, it obtains the TV menu language through the Titan SDK and opens the corresponding localized Portal. TTS behavior now follows the focus from the initial screen onward and reads complete content in Portal dialogs and Instruction Manual articles.

## New and changed behavior

### 1. Portal startup and language control

- Removed the initial Portal language-selection page.
- Added Titan SDK-based TV language detection.
- Portal language now follows the TV menu language instead of relying on the browser language or a previously stored Portal preference.
- Added normalization and mapping for Titan language values and regional language codes.
- Corrected the case where the Portal opened in German while the TV menu language was English.
- Language changes made in the TV UI are reflected by the Portal after the TV-provided language value is received.
- Existing localized Portal and Instruction Manual pages continue to use the selected Titan language.

### 2. About window

The About window now reports the following runtime information:

- Portal language and language code.
- TV country and country code, when supplied by Titan.
- Text To Speech status: On or Off.
- Text Magnification status: On or Off.

The following fields were intentionally removed:

- Speech Rate.
- Speech Volume.

These values were removed because the available Titan interface did not provide reliable values suitable for display in the About window.

Additional About-window changes:

- Added localization of About labels, values, metadata, and status text.
- Added complete TTS reading of the About content when the window opens.
- Preserved remote-control Back behavior and focus restoration when the window closes.

### 3. Titan Text To Speech integration

- Reworked Portal speech output to use Titan TTS state and speech control.
- TTS output is enabled or disabled according to the TV accessibility setting.
- Focus indication is synchronized with the TTS state and uses the same visual treatment expected in the TV UI.
- Added initial speech announcement when the Portal Home page opens and its default item receives focus.
- Added initial speech announcement when the Instruction Manual Home page opens.
- Added initial speech announcement when any Instruction Manual subpage opens.
- Changed the default focus on a Manual subpage from the Back button to the first item in the subpage menu.
- Expanded article speech from title-only output to the complete article title and article body.
- Expanded Portal-item speech so that complete visible item content is announced instead of only a partial label.
- Added complete speech output for Portal modal windows, including the About window.
- Added protection against duplicate or stale speech during page and focus transitions.

### 4. Instruction Manual display and navigation

- Eliminated the brief white page shown before the correctly themed Instruction Manual page appeared.
- Eliminated the same white flash when opening any Instruction Manual subpage.
- Added an early dark/grey critical background and delayed content reveal until Manual styling is ready.
- Manual Home and article pages now remain visually consistent during navigation and loading.
- Corrected the initial focus position on Manual subpages so navigation starts at the first top menu item.
- Corrected vertical alignment of the function icon on the Manual Home page.

### 5. Portal layout refinements

- Vertically centered the title content in the “SHARP Life Mobile App” window.
- Vertically centered the title content in the “Follow us on social media” window.
- Preserved localized text layout across all supported Portal languages.

### 6. Leave Portal confirmation window

- Restyled the “Leave Portal” confirmation window to match the Portal visual system.
- Changed the panel background to the same dark-grey Portal treatment.
- Changed dialog text and button labels to the Portal light-grey color.
- Applied the Portal typeface, font scale, spacing, corner radius, borders, and shadow treatment.
- Matched the confirmation buttons to the Portal control style.
- Reused the Portal remote-focus indication for the focused action.
- Added responsive sizing for smaller TV browser viewports.

## Accessibility and focus behavior

- The default focus is established immediately on Portal and Manual entry screens.
- When TTS is enabled, the newly focused default item is announced without requiring an extra remote-control key press.
- Manual article pages announce the complete relevant reading content.
- Portal popups announce their full text content.
- Closing a popup restores focus to the appropriate Portal control.
- Focus remains clearly visible in both TTS-enabled and TTS-disabled states.

## Localization coverage

The update is applied to the Portal’s supported localized entry pages and to the corresponding Instruction Manual structure. Cache-version references were updated where required so TV browsers load the new scripts rather than an older cached copy.

## Verification completed

- Confirmed Portal language follows TV menu language on the Titan TV sample.
- Confirmed language changes to Czech and Spanish are reflected by Portal content and About information.
- Confirmed the Instruction Manual opens with the correct dark/grey background without the interim white page.
- Confirmed initial-focus announcement logic for Portal, Manual Home, and Manual subpages.
- Confirmed full article, About, and Portal modal content is available to TTS.
- Confirmed the Leave Portal dialog uses the required background, text color, font sizing, button styling, and focus indication in a browser rendering check.
- Completed JavaScript syntax and repository whitespace validation for the changed scripts.

## Known limitations and expected behavior

- Speech Rate and Speech Volume are not shown in the About window by design.
- Actual voice, pronunciation, speech rate, and speech volume remain controlled by the Titan TV platform and the TV’s accessibility settings.
- When Titan runtime services are unavailable outside a Titan TV, the Portal uses its browser-compatible fallback behavior for development checks.

## Implementation record

- `bd55bbca` — Release Sharp Life Portal 8.0.8.
- `9c1ec7b0` — Localize Portal About window.
- `496b9f70` — Integrate Portal accessibility with Titan SDK.
- `cf9cbd60` — Fix Portal language detection on Titan TV.
- `9977dcdc` — Prevent Instruction Manual theme flash.
- `a29979a6` — Announce initial focus with Titan TTS.
- `9419ca03` — Read complete Portal and Manual content with TTS.
- `5598cee9` — Align Leave Portal dialog with Portal styling.
