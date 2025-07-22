import { SLACK_WEBHOOK_URL } from "../constants";
import { DeviceInfo } from "../utils/device-info";

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

const buildInviteCreatedMessage = (props: InviteCreatedMessageProps): SlackWebhookMessage => {
  return {
    text: "Invite created",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Invite created by account*\n \`${props.inviterAddress}\``,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Invite code*\n \`${props.inviteCode}\``,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Device info*\n \`${JSON.stringify(props.deviceInfo)}\``,
        },
      },
    ],
  };
};

const buildOnboardingSuccessMessage = (
  props: OnboardingSuccessMessageProps
): SlackWebhookMessage => {
  return {
    text: "Onboarding success",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*New leader account*\n \`${props.leaderAddress}\``,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Invite created by account*\n \`${props.inviterAddress}\``,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Invite flow: ${props.inviteFlow === "direct" ? "direct" : "invite link"}*\n \`${props.inviteCode}\``,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Device info*\n \`${JSON.stringify(props.deviceInfo)}\``,
        },
      },
    ],
  };
};

const buildOnboardingFailedMessage = (props: OnboardingFailedMessageProps): SlackWebhookMessage => {
  return {
    text: "Onboarding failed",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Error*\n \`${props.error}\``,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Invite created by account*\n \`${props.inviterAddress}\``,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Invite flow: ${props.inviteFlow === "direct" ? "direct" : "invite link"}*\n \`${props.inviteCode}\``,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Payload*\n \`${JSON.stringify(props.payload)}\``,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Device info*\n \`${JSON.stringify(props.deviceInfo)}\``,
        },
      },
    ],
  };
};

const sendInviteCreatedMessage = async (props: InviteCreatedMessageProps) => {
  const message = buildInviteCreatedMessage(props);

  await sendMessageToSlack(message);
};

const sendOnboardingSuccessMessage = async (props: OnboardingSuccessMessageProps) => {
  const message = buildOnboardingSuccessMessage(props);

  await sendMessageToSlack(message);
};

const sendOnboardingFailedMessage = async (props: OnboardingFailedMessageProps) => {
  const message = buildOnboardingFailedMessage(props);

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
