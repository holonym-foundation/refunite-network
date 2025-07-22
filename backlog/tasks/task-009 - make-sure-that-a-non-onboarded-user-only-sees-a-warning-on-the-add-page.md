---
id: task-009
title: make sure that a non-onboarded user only sees a warning on the /add page
status: To Do
assignee: []
created_date: "2025-07-22"
labels: []
dependencies: []
---

## Description

```

## Implementation Plan (the how)

1. Analyze the current implementation of the /add page to understand how permissions are checked and how the UI is rendered for non-onboarded users.
2. Update the /add page logic so that if a user is not allowed to onboard others, only the warning message is shown and all onboarding UI elements are hidden.
3. Add or update tests to verify that a non-onboarded user only sees the warning message and not the onboarding UI.
4. Update relevant documentation to reflect the new behavior for non-onboarded users on the /add page.
```

## Implementation Notes

- Refactored the /add page to use an early return with InfoText and Container for non-onboarded users, hiding all onboarding UI if not allowed.
- Ensured all user-facing text is sourced from en.ts for consistency and localization.
- Cleaned up the page by using Container for the 'not connected' state and removing unreachable UI blocks.
- Removed redundant code and ensured maintainability and clarity.
