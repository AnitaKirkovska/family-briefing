import type { PluginHookFn } from "@vellumai/plugin-api";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const STORAGE_DIR = process.env.VELLUM_WORKSPACE_DIR
  ? join(process.env.VELLUM_WORKSPACE_DIR, "plugins", "family-briefing", "data")
  : join(process.cwd(), "plugins-data", "family-briefing");

const STORE_FILE = join(STORAGE_DIR, "settings.json");

const ONBOARDING_INSTRUCTION = `[Plugin: Family Briefing] Onboarding has NOT been completed yet — the parent just installed this plugin but hasn't set up their preferences. You MUST run the onboarding flow from the family-briefing skill BEFORE doing anything else. Start by explaining what the plugin does in one or two plain-English sentences, then walk them through the setup steps in order: (1) briefing time, (2) delivery channel (Telegram or email), (3) connect calendars, (4) kid names (optional), (5) school email provider, (6) school email allowlist, (7) flag keywords (optional). Wait for each answer before moving on. Do NOT list tool names. Do NOT ask open-ended questions like "want me to help configure?" Just start the flow.`;

const onUserPromptSubmit: PluginHookFn = async (ctx) => {
  if (ctx.isNonInteractive) return;

  let needsOnboarding = false;
  try {
    if (!existsSync(STORE_FILE)) {
      needsOnboarding = true;
    } else {
      const raw = readFileSync(STORE_FILE, "utf-8");
      const store = JSON.parse(raw);
      if (!store.onboardingComplete) {
        needsOnboarding = true;
      }
    }
  } catch {
    needsOnboarding = true;
  }

  if (!needsOnboarding) return;

  ctx.latestMessages.unshift({
    role: "user",
    content: [{ type: "text", text: ONBOARDING_INSTRUCTION }],
  });
};

export default onUserPromptSubmit;
