---
id: task-4
title: Add phone details to audit logs
status: Done
assignee: []
created_date: "2025-07-22"
updated_date: "2025-07-22"
labels: []
dependencies: []
---

## Description

We have an audit log system set up in Turso.

- Add user phone details, or machine information, to audit logs
- Add caller IP to audit logs

## Acceptance Criteria

- [x] Device information is collected and stored in audit log metadata
- [x] Device info includes browser, OS, screen size, device type, and platform
- [x] Device info works for both mobile and desktop users
- [x] Device info collection works on both client-side and is passed to server action
- [x] Device info is stored under 'deviceInfo' key in audit log metadata
- [x] Existing audit logging functionality remains unchanged
- [x] Device info collection respects privacy and doesn't collect sensitive data
- [x] User agent information is captured during invite create and accept flows
- [x] User agent information is passed through the entire audit logging chain

## Implementation Plan

1. Create device info utility (`src/lib/utils/device-info.ts`)

   - Implemented using ua-parser-js for robust user agent parsing
   - Maps ua-parser-js output to DeviceInfo interface

2. Create request info utility (`src/lib/utils/request-info.ts`)

   - Utility to extract user agent and IP from different contexts
   - Works on both client-side and server-side

3. Update database service (`src/lib/database/service.ts`)

   - logAuditWithDeviceInfo method includes device info in audit logs

4. Update type definitions (`src/lib/database/types.ts`)

   - DeviceInfo and AuditLogMetadata interfaces updated

5. Update invite flow components and actions

   - Client components pass user agent to server actions
   - Server actions accept and use user agent for audit logging
   - API routes extract user agent from headers

6. Create unit tests for device info utility

   - [N/A] Removed: only mapping dependency, no business logic to test

7. Update documentation and examples

## Implementation Notes

- **Approach:**
  - Integrated [ua-parser-js](https://www.npmjs.com/package/ua-parser-js) for all device and user agent parsing, both client and server side.
  - Device info is mapped to a consistent DeviceInfo interface and attached to audit log metadata under the 'deviceInfo' key.
  - The audit logging service now provides a logAuditWithDeviceInfo method for convenience.
  - User agent information is captured at the client level and passed through the entire server action chain.
- **Features implemented:**
  - Device info collection for browser, OS, device type, platform, screen size, etc.
  - Works in both browser and server environments.
  - Privacy-respecting: only non-sensitive info is logged.
  - User agent capture in invite creation flow (AddLeaderViaInviteLinkSection).
  - User agent capture in invite acceptance flow (invite page).
  - User agent capture in API routes (reservations/verify).
- **Technical decisions:**
  - Chose ua-parser-js for reliability and maintenance over custom regex parsing.
  - Removed the test suite for device info mapping, as it only maps dependency output and does not contain business logic.
  - Created request-info utility to handle user agent extraction from different contexts.
  - Updated all server actions to accept optional userAgent parameter.
- **Files modified:**
  - src/lib/utils/device-info.ts
  - src/lib/utils/request-info.ts (new)
  - src/lib/database/service.ts
  - src/lib/database/types.ts
  - src/app/actions/invite.ts
  - src/app/actions/defender.ts
  - src/lib/onboarding/reservations.ts
  - src/components/AddLeaderViaInviteLinkSection.tsx
  - src/app/invite/[code]/page.tsx
  - src/app/api/reservations/verify/route.ts

## User Agent Capture Flow

1. **Invite Creation:**

   - Client: `AddLeaderViaInviteLinkSection` captures user agent using `getClientRequestInfo()`
   - Server: `createInvite` action receives user agent and passes it to `logAuditWithDeviceInfo`

2. **Invite Acceptance:**

   - Client: `invite/[code]/page` captures user agent using `getClientRequestInfo()`
   - Server: `addLeaderViaSignedTypedData` → `reserveInvite` → `logAuditWithDeviceInfo`

3. **API Routes:**
   - Server receive device info from the client during a call

All audit log entries now include device information derived from the user agent string, providing comprehensive device context for security and audit purposes.
