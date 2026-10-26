# NFC hardware spike (Phase 8)

> **Status:** Open — fill this in when physical samples arrive. Do not claim production NFC readiness until the checklist below is signed off with evidence.

## Decision log

| Field | Value |
|---|---|
| Spike owner | |
| Target pilot school | Orban (pilot) |
| Card SKU ordered | NTAG 424 DNA (qty: _) |
| Reader models tested | |
| Encoding | Vendor / in-house (TBD) |
| POS device OS/browser | |

## Test matrix (manual)

| # | Scenario | Pass? | Notes / evidence |
|---|---|---|---|
| 1 | Register card via school admin UI | | |
| 2 | POS checkout with SDM NDEF URL (not UID alone) | | |
| 3 | Replay same SDM tap twice → second rejected | | |
| 4 | Clone UID onto different physical card → rejected when SDM required | | |
| 5 | Lost card blocked at POS after admin marks lost | | |
| 6 | Replacement card works; old credential dead | | |
| 7 | Keyboard-wedge reader outputs full SDM string | | |
| 8 | Android Chrome Web NFC read (registration flow) | | |

## Software hooks in this repo

- Reader abstraction: `lib/nfc/reader-types.ts`, `lib/nfc/simulated-reader.ts`, `lib/nfc/keyboard-wedge.ts`
- SDM verifier (pilot stub + test vectors): `lib/nfc/sdm-verify.ts`
- DB: `0014_phase8_nfc.sql` — `card_events`, scheme gating, `pos_validate_credential_for_checkout`, `pos_record_card_read`
- Strategy doc: [NFC_INTEGRATION.md](./NFC_INTEGRATION.md)

## Blockers / follow-ups

- [ ] NXP datasheet review for SUN/SDM CMAC layout **[VERIFY]**
- [ ] Per-card diversified keys in KMS (`NFC_MASTER_KEY_*`)
- [ ] PC/SC local bridge if USB readers are chosen
- [ ] Production: `allow_uid_only_cards = false`, `SIMULATED_NFC_ENABLED = false`
