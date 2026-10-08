# Sharp Life Portal V8.0.9

Release date: 8 October 2026

Based on the existing V8.0.8 Portal code and its accessibility fixes.

- Added Turkish Portal Home cards, product details, QR captions, About and exit dialogs.
- Completed Norwegian Bokmål Portal Home and product details.
- Restored missing Norwegian banner backgrounds, product images and QR codes from the working shared assets.
- Mapped Norwegian `nb-NO`, `nb`, `nn-NO` and `nor` language identifiers to the Norwegian Portal; added Turkish `tr-TR` and `tur` recognition.
- About displays version 8.0.9 and release date 2026-10-08 (these values were already present in the inherited source and were verified).
- Updated entry-script and dynamically loaded translation-script cache keys.

Turkish Portal users open the existing English Instruction Manual because no Turkish manual is bundled. Norwegian users retain the Norwegian manual. No new manual translation is included in this release.

Validation: JavaScript syntax checks; runtime language-alias and card-localization checks; all nine Home cards present in both entries; no empty image/background references; referenced local images and scripts exist. Physical Titan TV and visual browser verification remain pending.

Publication target: https://alexanderjermakov-collab.github.io/titan-remote-scroll-test/?release=8.0.9
