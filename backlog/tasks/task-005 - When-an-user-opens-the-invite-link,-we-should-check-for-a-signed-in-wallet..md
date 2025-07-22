---
id: task-005
title: "When an user opens the invite link, we should check for a signed in wallet."
status: Completed
assignee: []
created_date: "2025-07-22"
updated_date: "2025-07-22"
labels: []
dependencies: []
---

## Description

We should check for a signed in wallet instance and load the app accordingly. If the detected wallet is already onboarded, prevent the user from using the invite link in the UI. Make clear that we detected an account that was already onboarded.

## Progress / Implementation Notes

- The invite page now checks for a signed-in wallet using wagmi's `useAccount`.
- If a wallet is connected and is already onboarded (determined via a backend check against the completions table), the UI blocks further onboarding and displays a clear message.
- All user-facing copy, including onboarding and error states, is managed from `src/content/en.ts`.
- The implementation is covered by the local unit test suite and has been verified.

**Task complete.**
