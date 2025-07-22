---
id: task-001
title: >-
  Make explicit invite link can only be used to onboard one leader into the
  network
status: Done
assignee: []
created_date: '2025-07-22'
updated_date: '2025-07-22'
labels: []
dependencies: []
---

## Description

We have a flow where we onboard users via an invite link. Onboarded users can generate an invite link and share them with other users so they can be onboarded as well. Reservations will be reserved when a user triggers the onboarding via the invite link, to support faulty internet connections.

When a user generates an invite link, we should reming them that the linked can only be used for 1 succesful onboarding.

When a user accepts and invite link, we should show them that we reserved this inviteation for them for the defined reservation time.

## Implementation Notes

- Updated the invite link generation UI to clearly remind users that each invite link can only be used for one successful onboarding, using a new InfoText component for improved readability.
- Improved the invite acceptance page to show a clear reserved state while onboarding is in progress, also using InfoText for instructional text.
- The UI now provides a more user-friendly and visually distinct experience for longer or instructional messages.
- No business logic was changed; all updates are UI/UX improvements.
- Acceptance criteria are fully met: users are reminded of single-use links and see a reservation message during onboarding.
