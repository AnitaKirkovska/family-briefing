import type { ToolDefinition } from "@vellumai/plugin-api";
import { loadStore } from "../src/store";

const tool: ToolDefinition = {
  description:
    "Read the saved family briefing settings. Use this before generating a briefing, scanning school email, or detecting conflicts to get the parent's preferences (briefing time, delivery channel, kid names, school allowlist, flag keywords). Also use when the parent asks to see or change their settings.",
  input_schema: {
    type: "object",
    properties: {},
  },
  defaultRiskLevel: "low",
  execute: async () => {
    const settings = loadStore();
    return {
      content: settings,
    };
  },
};

export default tool;
