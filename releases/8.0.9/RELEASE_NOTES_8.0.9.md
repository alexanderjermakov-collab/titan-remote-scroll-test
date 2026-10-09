# Sharp Life Portal V8.0.9 — corrected baseline

Based on the last pre-merge V8.0.8 source, commit 5598cee9 (7 October 2026). The previous V8.0.9 had inherited regressed SDK and About implementations from a merge.

Only requested changes are applied: Turkish Portal translations; Norwegian Bokmål translations and language aliases; restored Norwegian Home images, backgrounds and QR codes; About version 8.0.9 and release date 8 October 2026; updated cache identifiers for changed scripts.

The V8.0.8 Titan SDK language and accessibility code is retained. About reads SharpLifePortalDevice and SharpLifePortalAccessibility; Speech Rate and Speech Volume rows remain absent. The English manual remains available for Turkish users; no Turkish manual translation is included.

Validation: JavaScript syntax; About language and TTS On/Off with SDK-backed state fixtures; absence of rate/volume rows; accessibility implementation equal to V8.0.8 except translation cache URLs. Physical TV validation remains required.
