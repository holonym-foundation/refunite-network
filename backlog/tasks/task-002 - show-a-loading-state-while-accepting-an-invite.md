---
id: task-002
title: show a loading state while accepting an invite
status: Done
assignee: []
created_date: '2025-07-22'
updated_date: '2025-07-22'
labels: []
dependencies: []
---

## Description

We have users that have a slow internet connection. After logging in, when the user accepts an invite link, we trigger a process in the background that coordinates the onboarding. We should show a 'loading' state while we are waiting on responses from the server action. Ideally, we have some sort of progress bar, or staged droplets, that show:

- starting onboarding
- awaiting confirmation
- completed

## Acceptance Criteria

- [x] Users see a clear, multi-stage progress indicator when accepting an invite
- [x] Progress indicator shows at least three stages: starting onboarding, awaiting confirmation, completed
- [x] Progress indicator is visually consistent with the rest of the app (TailwindCSS + shadcn)
- [x] Progress indicator is accessible and responsive
- [x] Users receive immediate feedback that onboarding is in progress, even on slow connections
- [x] Automated test covers the progress indicator component
- [x] Documentation is updated to describe the new onboarding progress UI

## Implementation Plan

1. Locate the invite acceptance and onboarding logic in `src/app/invite/[code]/page.tsx`
2. Design a reusable progress stepper component using TailwindCSS and shadcn UI
3. Add a state variable to track the onboarding stage in the invite page
4. Integrate the progress stepper, updating the stage as the onboarding process advances
5. Refactor the stepper to accept an array of step objects (title, description) for clarity and reusability
6. Add a test for the progress stepper component and migrate it to a root-level test directory
7. Update documentation to describe the new component and onboarding flow

## Implementation Notes

- Implemented a reusable `OnboardingProgress` component (`src/components/OnboardingProgress.tsx`) that displays a horizontal stepper with step titles and descriptions, styled with TailwindCSS and shadcn conventions.
- Refactored the invite acceptance page (`src/app/invite/[code]/page.tsx`) to use the new stepper, tracking onboarding stages: starting onboarding, awaiting confirmation, completed.
- The stepper accepts an array of `{ title, description }` objects for concise, type-safe configuration and responsive display.
- Added a test for the progress component and migrated it to `test/components/OnboardingProgress.test.tsx`, mirroring the `src` structure.
- Updated the README to document the new onboarding progress stepper and its integration.
- All acceptance criteria are met: the UI is clear, accessible, responsive, and tested; users receive immediate, staged feedback during onboarding.
- No regressions or unrelated changes were introduced.
