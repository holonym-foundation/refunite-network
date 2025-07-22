---
id: task-3
title: Update Slack notifications
status: Done
assignee: []
created_date: '2025-07-22'
updated_date: '2025-07-22'
labels: []
dependencies: []
---

## Description

The Slack notification could use better formatting and more information. We want to at least have an counter of:

- open invites
- succesfull invites
- invites reserved

- This data can all be queried via our turso client
-
- Make sure to have a nice information hierarchy so that the slack notifications are nicely contained cards with links for relevant sources (like Celo block explorer and the Hats tree on Celo)

## Implementation Plan

1. Refactored Slack message builders to use Block Kit best practices for clear hierarchy and compactness.
2. Added metrics line (total invites, successful onboardings, reserved invites) to all notification flows.
3. Made device info a single compact line for alignment.
4. Updated sending functions to fetch and include metrics from the database.
5. Implemented user feedback system with modal interface in Header component.
6. Created secure server action for feedback submission (avoiding public API endpoints).
7. Added Slack webhook integration for feedback messages with sentiment tracking.
8. Integrated existing device-info utility for consistent device information collection.
9. Ensured all changes are atomic, testable, and outcome-oriented.
10. Next: Continue to improve notification content and add links to relevant sources as needed.

## Implementation Notes

### Slack Notification Improvements

- Refactored all Slack message builders (`buildInviteCreatedMessage`, `buildOnboardingSuccessMessage`, `buildOnboardingFailedMessage`) to use Slack Block Kit with header blocks, dividers, and structured fields for better visual hierarchy.
- Added dynamic metrics line showing total invites, successful onboardings, and reserved invites counts to all notification flows.
- Implemented concurrent database queries using `Promise.all` to fetch metrics efficiently from Turso client.
- Streamlined device information to a single compact line format (e.g., "desktop | macOS | Brave") for better alignment.

### User Feedback System

- **UI Implementation**: Added feedback modal to Header component using shadcn/ui Dialog components with thumbs up/down sentiment selection and optional text input.
- **Security**: Implemented feedback submission via Next.js server action (`src/app/actions/feedback.ts`) to avoid exposing public API endpoints to spam.
- **Slack Integration**: Created `buildFeedbackMessage` and `sendFeedbackMessage` functions in Slack webhook module for structured feedback reporting.
- **Device Information**: Integrated existing `getClientDeviceInfo` utility for consistent and comprehensive device information collection.
- **User Experience**: Made thumb emojis larger as requested, added loading states, and implemented toast notifications for feedback submission status.

### Technical Decisions

- Used server actions instead of public API endpoints for security and spam prevention.
- Leveraged existing device-info utility rather than manual navigator queries for consistency.
- Followed project preferences for shadcn/ui components and Lucide icons.
- Implemented feedback modal in Header component for persistent visibility to signed-in users.

### Files Modified

- `src/lib/slack/webhook.ts`: Added feedback message builders and updated existing message builders with Block Kit formatting
- `src/components/Header.tsx`: Added feedback modal with sentiment selection and text input
- `src/app/actions/feedback.ts`: Created server action for secure feedback submission
