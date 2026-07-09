import type { ToolDefinition } from "@vellumai/plugin-api";
import {
  loadStore,
  saveStore,
  generateId,
  type SchoolItem,
  type Settings,
} from "../src/store";

const CATEGORY_HINTS: Record<string, SchoolItem["category"]> = {
  "permission slip": "permission_slip",
  "permission form": "permission_slip",
  "spirit day": "spirit_day",
  "dress up": "spirit_day",
  "crazy hair": "spirit_day",
  "pajama day": "spirit_day",
  "pickup": "pickup_change",
  "pick up": "pickup_change",
  "dismissal": "pickup_change",
  "early release": "pickup_change",
  "early dismissal": "pickup_change",
  "aftercare": "pickup_change",
  "snack": "snack_request",
  "bring": "snack_request",
  "due": "deadline",
  "deadline": "deadline",
  "submit": "deadline",
  "return": "deadline",
  "field trip": "deadline",
  "picture day": "reminder",
  "photo day": "reminder",
  "conference": "reminder",
  "meeting": "reminder",
  "book fair": "reminder",
  "fundraiser": "reminder",
};

function categorize(subject: string, body: string): SchoolItem["category"] {
  const text = `${subject} ${body}`.toLowerCase();
  for (const [hint, category] of Object.entries(CATEGORY_HINTS)) {
    if (text.includes(hint)) return category;
  }
  return "other";
}

function extractKidName(
  text: string,
  kidNames: string[]
): string | null {
  const lower = text.toLowerCase();
  for (const name of kidNames) {
    if (lower.includes(name.toLowerCase())) return name;
  }
  return null;
}

function extractDueDate(text: string): string | null {
  const lower = text.toLowerCase();
  const datePatterns = [
    /(?:due|by|before|return by)\s+(\w+day?,?\s+\w+ \d{1,2})/i,
    /(?:due|by|before|return by)\s+(\w+ \d{1,2})/i,
    /(\d{1,2}\/\d{1,2}\/?\d{0,4})/g,
    /(\w+ \d{1,2})/g,
  ];
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const parsed = new Date(match[1]);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  }
  return null;
}

const tool: ToolDefinition = {
  description:
    "Log a school email item extracted from the parent's inbox. After scanning emails from allowlisted school addresses, call this for each school-relevant message to store it. The tool auto-categorizes (deadline, spirit day, pickup change, permission slip, snack request, reminder, other) based on subject and body. It also tries to match kid names and extract due dates. Use get-settings first to get the school allowlist and kid names.",
  input_schema: {
    type: "object",
    properties: {
      subject: {
        type: "string",
        description: "The email subject line.",
      },
      sender: {
        type: "string",
        description: "The sender email address.",
      },
      date: {
        type: "string",
        description: "ISO date when the email was received.",
      },
      body: {
        type: "string",
        description: "The email body text. Used for categorization, kid name matching, and due date extraction.",
      },
      category: {
        type: "string",
        enum: [
          "deadline",
          "spirit_day",
          "pickup_change",
          "permission_slip",
          "snack_request",
          "reminder",
          "other",
        ],
        description: "Override the auto-categorized item type. If omitted, the tool categorizes based on subject + body content.",
      },
      dueDate: {
        type: "string",
        description: "Override the auto-extracted due date (ISO format). If omitted, the tool tries to extract one from the body.",
      },
      kidName: {
        type: "string",
        description: "Which kid this item relates to. If omitted, the tool tries to match from kid names in settings.",
      },
      notes: {
        type: "string",
        description: "Additional context or summary from the email.",
      },
    },
    required: ["subject", "sender", "date"],
  },
  defaultRiskLevel: "low",
  execute: async (input: {
    subject: string;
    sender: string;
    date: string;
    body?: string;
    category?: SchoolItem["category"];
    dueDate?: string;
    kidName?: string;
    notes?: string;
  }) => {
    const settings = loadStore();
    const body = input.body || "";

    const category =
      input.category || categorize(input.subject, body);

    const kidName =
      input.kidName || extractKidName(`${input.subject} ${body}`, settings.kidNames);

    const dueDate =
      input.dueDate || extractDueDate(body);

    // Check for flag keywords
    const text = `${input.subject} ${body}`.toLowerCase();
    const flaggedKeywords = settings.flagKeywords.filter((kw) =>
      text.includes(kw.toLowerCase())
    );

    const item: SchoolItem = {
      id: generateId(),
      subject: input.subject,
      sender: input.sender,
      date: input.date,
      category,
      dueDate,
      kidName,
      notes: input.notes || (flaggedKeywords.length > 0 ? `Flagged: ${flaggedKeywords.join(", ")}` : ""),
      status: "new",
    };

    // Check for duplicate (same subject + sender within 24h)
    const isDuplicate = settings.schoolItems.some(
      (existing) =>
        existing.subject === item.subject &&
        existing.sender === item.sender &&
        Math.abs(
          new Date(existing.date).getTime() - new Date(item.date).getTime()
        ) < 24 * 60 * 60 * 1000
    );

    if (isDuplicate) {
      return {
        content: { skipped: true, reason: "duplicate" },
      };
    }

    settings.schoolItems.push(item);
    settings.lastScanAt = new Date().toISOString();
    saveStore(settings);

    return {
      content: {
        logged: true,
        item,
        flagged: flaggedKeywords.length > 0 ? flaggedKeywords : undefined,
      },
    };
  },
};

export default tool;
