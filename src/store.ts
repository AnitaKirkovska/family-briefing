import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const STORAGE_DIR = process.env.VELLUM_WORKSPACE_DIR
  ? join(process.env.VELLUM_WORKSPACE_DIR, "plugins", "family-briefing", "data")
  : join(process.cwd(), "plugins-data", "family-briefing");

const STORE_FILE = join(STORAGE_DIR, "settings.json");

export interface SchoolItem {
  id: string;
  subject: string;
  sender: string;
  date: string;
  category:
    | "deadline"
    | "spirit_day"
    | "pickup_change"
    | "permission_slip"
    | "snack_request"
    | "reminder"
    | "other";
  dueDate: string | null;
  kidName: string | null;
  notes: string;
  status: "new" | "handled" | "ignored";
}

export interface Conflict {
  id: string;
  event1Title: string;
  event1Start: string;
  event1End: string;
  event1Calendar: string;
  event1Location: string | null;
  event2Title: string;
  event2Start: string;
  event2End: string;
  event2Calendar: string;
  event2Location: string | null;
  overlapMinutes: number;
  date: string;
  status: "new" | "resolved";
}

export interface Settings {
  onboardingComplete: boolean;
  briefingTime: string;
  deliveryChannel: "email" | "telegram";
  kidNames: string[];
  schoolAllowlist: string[];
  flagKeywords: string[];
  lastScanAt: string | null;
  schoolItems: SchoolItem[];
  conflicts: Conflict[];
}

const DEFAULT_SETTINGS: Settings = {
  onboardingComplete: false,
  briefingTime: "07:00",
  deliveryChannel: "email",
  kidNames: [],
  schoolAllowlist: [],
  flagKeywords: [],
  lastScanAt: null,
  schoolItems: [],
  conflicts: [],
};

export function loadStore(): Settings {
  try {
    if (!existsSync(STORE_FILE)) {
      return { ...DEFAULT_SETTINGS };
    }
    const raw = readFileSync(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveStore(settings: Settings): void {
  if (!existsSync(STORAGE_DIR)) {
    mkdirSync(STORAGE_DIR, { recursive: true });
  }
  writeFileSync(STORE_FILE, JSON.stringify(settings, null, 2), "utf-8");
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
