import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import en from "@/content/en";

/**
 * Maps backend invite error strings to the correct heading and message for UI display.
 * @param error The error string returned from invite validation
 * @returns { heading: string, message: string }
 */
export function getInviteErrorCopy(error?: string | null): { heading: string; message: string } {
  switch (error) {
    case "Invite has expired":
      return {
        heading: en.invitePage.headings.expired,
        message: en.invitePage.prompts.expired,
      };
    case "Invite has already been used":
      return {
        heading: en.invitePage.headings.used,
        message: en.invitePage.prompts.used,
      };
    case "Invite is currently reserved":
      return {
        heading: en.invitePage.headings.reserved,
        message: en.invitePage.prompts.reserved,
      };
    case "Invalid invite code":
      return {
        heading: en.invitePage.headings.invalid,
        message: en.invitePage.prompts.invalid,
      };
    case "An unexpected error occurred":
      return {
        heading: en.invitePage.headings.error,
        message: en.invitePage.prompts.error,
      };
    default:
      return {
        heading: en.invitePage.headings.invalid,
        message: error || en.invitePage.prompts.invalid,
      };
  }
}
