---
id: task-002
title: show a loading state while accepting an invite
status: To Do
assignee: []
created_date: '2025-07-22'
updated_date: '2025-07-22'
labels: []
dependencies: []
---

## Description

We have users that have a slow internet connection.  After logging in, when the user accepts an invite link, we trigger a process in the background that coordinates the onboarding. We should show a 'loading' state while we are waiting on responses from the server action. Ideally, we have some sort of progress bar, or staged droplets, that show:
- starting onboarding
- awaiting confirmation
- completed
