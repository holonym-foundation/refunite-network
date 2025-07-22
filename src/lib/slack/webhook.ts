import { DeviceInfo } from "@/lib/database/types";
import { SLACK_WEBHOOK_URL } from "@/lib/constants";
import { DB } from "@/lib/database/service";

export type SlackWebhookMessage = {
  text: string;
  blocks: {
    type: "section";
    text: {
      type: "mrkdwn";
      text: string;
    };
  }[];
};

export interface OnboardingSuccessMessageProps {
  inviterAddress: string;
  leaderAddress: string;
  inviteCode: string;
  inviteFlow: "direct" | "invite";
  deviceInfo?: Partial<DeviceInfo>;
}

export interface OnboardingFailedMessageProps {
  inviterAddress?: string;
  inviteFlow: "direct" | "invite";
  inviteCode: string;
  error: string;
  payload: Record<string, unknown>;
  deviceInfo?: Partial<DeviceInfo>;
}

export interface InviteCreatedMessageProps {
  inviterAddress: string;
  inviteCode: string;
  deviceInfo?: Partial<DeviceInfo>;
}

// --- Refactored Slack message builders for Block Kit best practices, concise device info, and compact metrics line ---

function getDeviceInfoLine(deviceInfo?: Partial<DeviceInfo>) {
  if (!deviceInfo) return null;
  const deviceType = deviceInfo.deviceType || "-";
  const os = deviceInfo.os || "-";
  const browser = deviceInfo.browser || "-";
  return `${deviceType} | ${os} | ${browser}`;
}

// Add metrics line to all message builders
interface SlackMetrics {
  totalInvites: number;
  successfulOnboardings: number;
  reservedInvites: number;
}

const buildInviteCreatedMessage = (
  props: InviteCreatedMessageProps & SlackMetrics
): SlackWebhookMessage => {
  const blocks: any[] = [
    // Header
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Invite Created",
      },
    },
    { type: "divider" },
    // Key info fields
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*By*\n\`${props.inviterAddress}\`` },
        { type: "mrkdwn", text: `*Code*\n\`${props.inviteCode}\`` },
      ],
    },
    // Metrics line
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `📨 ${props.totalInvites}   ✅ ${props.successfulOnboardings}   ⏳ ${props.reservedInvites}`,
      },
    },
  ];
  // Device info single line
  const deviceInfoLine = getDeviceInfoLine(props.deviceInfo);
  if (deviceInfoLine) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: deviceInfoLine },
    });
  }
  return {
    text: "Invite created",
    blocks,
  };
};

const buildOnboardingSuccessMessage = (
  props: OnboardingSuccessMessageProps & SlackMetrics
): SlackWebhookMessage => {
  const blocks: any[] = [
    // Header
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Onboarding Success",
      },
    },
    { type: "divider" },
    // Key info fields
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*New Leader*\n\`${props.leaderAddress}\`` },
        { type: "mrkdwn", text: `*Invited by*\n\`${props.inviterAddress}\`` },
        {
          type: "mrkdwn",
          text: `*Flow*\n${props.inviteFlow === "direct" ? "Direct" : "Invite Link"}`,
        },
        { type: "mrkdwn", text: `*Code*\n\`${props.inviteCode}\`` },
      ],
    },
    // Metrics line
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `📨 ${props.totalInvites}   ✅ ${props.successfulOnboardings}   ⏳ ${props.reservedInvites}`,
      },
    },
  ];
  // Device info single line
  const deviceInfoLine = getDeviceInfoLine(props.deviceInfo);
  if (deviceInfoLine) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: deviceInfoLine },
    });
  }
  return {
    text: "Onboarding success",
    blocks,
  };
};

const buildOnboardingFailedMessage = (
  props: OnboardingFailedMessageProps & SlackMetrics
): SlackWebhookMessage => {
  const blocks: any[] = [
    // Header
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Onboarding Failed",
      },
    },
    { type: "divider" },
    // Error and key info fields
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Error*\n\`${props.error}\`` },
        props.inviterAddress
          ? { type: "mrkdwn", text: `*Invited by*\n\`${props.inviterAddress}\`` }
          : undefined,
        {
          type: "mrkdwn",
          text: `*Flow*\n${props.inviteFlow === "direct" ? "Direct" : "Invite Link"}`,
        },
        { type: "mrkdwn", text: `*Code*\n\`${props.inviteCode}\`` },
      ].filter(Boolean),
    },
    // Metrics line
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `📨 ${props.totalInvites}   ✅ ${props.successfulOnboardings}   ⏳ ${props.reservedInvites}`,
      },
    },
  ];
  // Payload (optional)
  if (props.payload) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Payload:*\n\`${JSON.stringify(props.payload)}\``,
      },
    });
  }
  // Device info single line
  const deviceInfoLine = getDeviceInfoLine(props.deviceInfo);
  if (deviceInfoLine) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: deviceInfoLine },
    });
  }
  return {
    text: "Onboarding failed",
    blocks,
  };
};

const sendInviteCreatedMessage = async (props: InviteCreatedMessageProps) => {
  const [totalInvites, successfulOnboardings, reservedInvites] = await Promise.all([
    DB.countInvitations(),
    DB.countCompletions(),
    DB.countReservedInvites(),
  ]);
  const message = buildInviteCreatedMessage({
    ...props,
    totalInvites,
    successfulOnboardings,
    reservedInvites,
  });
  await sendMessageToSlack(message);
};

const sendOnboardingSuccessMessage = async (props: OnboardingSuccessMessageProps) => {
  const [totalInvites, successfulOnboardings, reservedInvites] = await Promise.all([
    DB.countInvitations(),
    DB.countCompletions(),
    DB.countReservedInvites(),
  ]);
  const message = buildOnboardingSuccessMessage({
    ...props,
    totalInvites,
    successfulOnboardings,
    reservedInvites,
  });
  await sendMessageToSlack(message);
};

const sendOnboardingFailedMessage = async (props: OnboardingFailedMessageProps) => {
  const [totalInvites, successfulOnboardings, reservedInvites] = await Promise.all([
    DB.countInvitations(),
    DB.countCompletions(),
    DB.countReservedInvites(),
  ]);
  const message = buildOnboardingFailedMessage({
    ...props,
    totalInvites,
    successfulOnboardings,
    reservedInvites,
  });
  await sendMessageToSlack(message);
};

const sendMessageToSlack = async (message: SlackWebhookMessage) => {
  try {
    if (!SLACK_WEBHOOK_URL) {
      console.error("SLACK_WEBHOOK_URL is not set");
      return;
    }

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error("Failed to send message to Slack", response);
    }
  } catch (error) {
    console.error("Failed to send message to Slack", error);
  }
};

export { sendOnboardingSuccessMessage, sendOnboardingFailedMessage, sendInviteCreatedMessage };
