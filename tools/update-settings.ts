import type { ToolDefinition } from "@vellumai/plugin-api";
import { loadStore, saveStore, type Settings } from "../src/store";

const tool: ToolDefinition = {
  description:
    "Save or update family briefing settings. Call this during onboarding to store the parent's preferences: briefing time, delivery channel (email or telegram), kid names, school email allowlist (sender addresses to watch), and optional flag keywords. Also used to update individual settings later. Pass only the fields that changed; the rest are preserved.",
  input_schema: {
    type: "object",
    properties: {
      onboardingComplete: {
        type: "boolean",
        description: "Set to true when onboarding is finished.",
      },
      briefingTime: {
        type: "string",
        description: "Time for the daily morning briefing in 24h format, e.g. '07:00' or '06:30'.",
      },
      deliveryChannel: {
        type: "string",
        enum: ["email", "telegram"],
        description: "Where to send the morning briefing.",
      },
      kidNames: {
        type: "array",
        items: { type: "string" },
        description: "Names of the parent's children, used to personalize the briefing.",
      },
      schoolAllowlist: {
        type: "array",
        items: { type: "string" },
        description: "Email addresses the school sends from. Only messages from these addresses are triaged as school emails.",
      },
      flagKeywords: {
        type: "array",
        items: { type: "string" },
        description: "Optional keywords to always flag in school emails, e.g. 'early dismissal', 'permission slip', 'picture day'.",
      },
    },
  },
  defaultRiskLevel: "low",
  execute: async (input: Partial<Settings>) => {
    const store = loadStore();
    const updated = { ...store, ...input };
    saveStore(updated);
    return {
      content: {
        success: true,
        settings: updated,
      },
    };
  },
};

export default tool;
