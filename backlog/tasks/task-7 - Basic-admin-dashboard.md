---
id: task-7
title: Basic admin dashboard
status: To Do
assignee: []
created_date: '2025-07-22'
labels: []
dependencies: []
---

## Description

This is the inital step to a more comprehensive admin panel. For now, we want to have a /admin route, where a dashboard is loaded that renders metadata on our app.

The data that should be shown:
- API health check (pinging)
- Link to Hats Tree (Celo, 22)
- Link to Defender Relayer contract on Celoscan (0x85c93B4d068dbaB44D86006dfd6d52179534EB79)
- Performance metrics:
1.count succesfull onboardings (from db)
2. cound reserved invites
3. count total number of invites
4. count total number of Hats wearers
5. Balance of relayer contract (Celo: 0x85c93B4d068dbaB44D86006dfd6d52179534EB79)

The dashboard should use shadcn components and can simply be publicly visible as this is all public data
