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

### Frontend Implementation (`src/app/invite/[code]/page.tsx`)

**Wallet Detection & State Management:**

- Implemented comprehensive wallet state checking using wagmi's `useAccount` hook
- Added multiple loading states: `isVerifying`, `checkingOnboarded`, `isLoading`
- Created proper state management for different user scenarios

**User Experience Flows:**

1. **No Wallet Connected**: Shows connect wallet prompt with clear messaging
2. **Wallet Connected, Checking Status**: Displays loading state while checking onboarding status
3. **Wallet Already Onboarded**: Blocks further onboarding with clear "Already Onboarded" message
4. **Wallet Not Onboarded**: Allows normal invite acceptance flow
5. **Invalid/Expired Invite**: Shows appropriate error messages

**UI Components & Messaging:**

- Used `InfoText` component for consistent messaging across all states
- Implemented `OnboardingProgress` component for multi-step onboarding visualization
- All user-facing copy managed through `src/content/en.ts` for internationalization
- Added proper loading indicators and success states

### Backend Implementation (`src/app/actions/invite.ts`)

**Wallet Onboarding Check:**

- Created `isWalletOnboarded(address: string)` function
- Integrates with database service to check `completions` table
- Returns boolean indicating if address is already onboarded

**Database Integration (`src/lib/database/service.ts`):**

- Implemented `isAddressOnboarded()` method using case-insensitive address matching
- Queries `completions` table to determine onboarding status
- Efficient single-query implementation with proper indexing

### Content Management (`src/content/en.ts`)

**Comprehensive Message Coverage:**

- Added `invitePage` section with all user-facing messages
- Includes headings for different states: success, verifying, invalid, accept, alreadyOnboarded
- Provides prompts for various scenarios: processing, checking wallet status, already onboarded
- Toast messages for error handling

**Key Messages Implemented:**

- "Already Onboarded" heading and explanation
- "Checking account status..." loading message
- "The connected account is already onboarded and cannot use this invite link" error message
- Success and error states for all user flows

### Technical Features

**Error Handling:**

- Comprehensive error states for invalid invites, expired invites, and network issues
- Proper error propagation from backend to frontend
- User-friendly error messages with actionable guidance

**Performance Considerations:**

- Efficient database queries with proper indexing
- Minimal re-renders through proper state management
- Loading states to prevent UI blocking

**Security:**

- Case-insensitive address matching for robust wallet detection
- Proper validation of invite codes before wallet checks
- Audit logging for security events

### Testing & Verification

- Implementation covered by existing test suite structure
- Manual verification of all user flows completed
- Error scenarios tested and validated
- Cross-browser compatibility verified

**Task complete.** The feature provides a seamless user experience with proper wallet detection, clear messaging, and robust error handling for all possible scenarios when users access invite links.
