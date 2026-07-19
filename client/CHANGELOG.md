# Changelog
All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-04-22
### Added
- **WhatsApp Bot:** Core logging logic for Expenses and Income.
- **AI Integration:** Receipt scanning and voice note transcription.
- **Dynamic Nudge Engine:** Database-driven rules for user engagement.
- **Admin Dashboard:** Real-time metrics and engagement logs.
- **Utility Migration:** All WhatsApp templates moved to Meta's Utility category for cost efficiency.

### Changed
- **Global Timezone:** Standardized entire stack (MySQL, FastAPI, React) to IST (+05:30).
- **Auth Flow:** Switched to "Case ID" stealth templates for unverified OTP delivery.

### Fixed
- "Timezone" bug where times appeared 5:30 hours ahead.
- Duplicate message processing via `processed_message_ids` cache.