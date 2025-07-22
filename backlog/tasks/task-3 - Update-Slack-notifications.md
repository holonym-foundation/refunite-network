---
id: task-3
title: Update Slack notifications
status: To Do
assignee: []
created_date: "2025-07-22"
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
5. Ensured all changes are atomic, testable, and outcome-oriented.
6. Next: Continue to improve notification content and add links to relevant sources as needed.
