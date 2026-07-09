import type { ToolDefinition } from "@vellumai/plugin-api";
import {
  loadStore,
  saveStore,
  type SchoolItem,
  type Conflict,
  type Settings,
} from "../src/store";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

const CATEGORY_LABELS: Record<SchoolItem["category"], string> = {
  deadline: "Deadline",
  spirit_day: "Spirit Day",
  pickup_change: "Pickup Change",
  permission_slip: "Permission Slip",
  snack_request: "Snack Request",
  reminder: "Reminder",
  other: "Notice",
};

function renderSchoolItem(item: SchoolItem): string {
  const kid = item.kidName ? `${item.kidName}: ` : "";
  const label = CATEGORY_LABELS[item.category];
  const due = item.dueDate
    ? ` | due ${new Date(item.dueDate).toLocaleDateString()}`
    : "";
  const flag = item.notes ? ` | ${item.notes}` : "";
  return `- [${label}] ${kid}${item.subject}${due}${flag}`;
}

function renderConflict(c: Conflict): string {
  const time1 = formatTime(c.event1Start);
  const time2 = formatTime(c.event2Start);
  const loc1 = c.event1Location ? ` @ ${c.event1Location}` : "";
  const loc2 = c.event2Location ? ` @ ${c.event2Location}` : "";
  return `- ${c.event1Title} (${time1}${loc1}, ${c.event1Calendar}) overlaps ${c.event2Title} (${time2}${loc2}, ${c.event2Calendar}) by ${c.overlapMinutes} min`;
}

const tool: ToolDefinition = {
  description:
    "Generate the daily morning briefing for a parent. Combines today's calendar events, new school emails since last scan, and any scheduling conflicts into one concise message. Sorts school items by category (deadlines and pickup changes first, then permission slips, then everything else). Also writes a markdown file to the workspace for history. Call this every morning at the parent's chosen briefing time, or when they ask for their briefing.",
  input_schema: {
    type: "object",
    properties: {
      calendarEvents: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            start: { type: "string", description: "ISO datetime" },
            end: { type: "string", description: "ISO datetime" },
            calendar: { type: "string", description: "Calendar name" },
            location: { type: "string" },
          },
          required: ["title", "start", "end", "calendar"],
        },
        description: "Today's calendar events from all connected calendars. Pass these in after fetching from Google Calendar.",
      },
      conflicts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            event1Title: { type: "string" },
            event1Start: { type: "string" },
            event2Title: { type: "string" },
            overlapMinutes: { type: "number" },
          },
        },
        description: "Pre-detected conflicts for today. If omitted, the tool includes conflicts from the store.",
      },
    },
  },
  defaultRiskLevel: "low",
  execute: async (input: {
    calendarEvents?: Array<{
      title: string;
      start: string;
      end: string;
      calendar: string;
      location?: string;
    }>;
    conflicts?: Array<{
      event1Title: string;
      event1Start: string;
      event2Title: string;
      overlapMinutes: number;
    }>;
  }) => {
    const settings = loadStore();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const sections: string[] = [];
    const header = `Family Briefing — ${formatDate(now.toISOString())}`;
    sections.push(header);
    sections.push("");

    // 1. Scheduling conflicts (highest priority)
    const todaysConflicts = settings.conflicts.filter(
      (c) => c.date === todayStr && c.status === "new"
    );

    if (todaysConflicts.length > 0) {
      sections.push(
        `SCHEDULING CONFLICTS (${todaysConflicts.length}):\n` +
          todaysConflicts.map(renderConflict).join("\n")
      );
      sections.push("");
    }

    // 2. Today's calendar
    if (input.calendarEvents && input.calendarEvents.length > 0) {
      const sorted = [...input.calendarEvents].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
      const eventLines = sorted.map((e) => {
        const time = formatTime(e.start);
        const loc = e.location ? ` @ ${e.location}` : "";
        const cal = e.calendar ? ` (${e.calendar})` : "";
        return `- ${time} — ${e.title}${loc}${cal}`;
      });
      sections.push(`TODAY'S SCHEDULE (${sorted.length}):\n` + eventLines.join("\n"));
      sections.push("");
    }

    // 3. School emails — new items since last scan
    const newSchoolItems = settings.schoolItems.filter(
      (i) => i.status === "new"
    );

    if (newSchoolItems.length > 0) {
      // Sort by priority: pickup_change, deadline, permission_slip, then rest
      const priorityOrder: SchoolItem["category"][] = [
        "pickup_change",
        "deadline",
        "permission_slip",
        "spirit_day",
        "snack_request",
        "reminder",
        "other",
      ];
      const sortedItems = [...newSchoolItems].sort((a, b) => {
        const pa = priorityOrder.indexOf(a.category);
        const pb = priorityOrder.indexOf(b.category);
        if (pa !== pb) return pa - pb;
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return 0;
      });

      sections.push(
        `FROM SCHOOL (${sortedItems.length}):\n` +
          sortedItems.map(renderSchoolItem).join("\n")
      );
      sections.push("");
    }

    // 4. Upcoming deadlines (next 7 days)
    const upcomingDeadlines = settings.schoolItems.filter((i) => {
      if (i.status !== "new" || !i.dueDate) return false;
      const due = new Date(i.dueDate);
      const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return due > now && due <= weekOut;
    });

    if (upcomingDeadlines.length > 0) {
      const sorted = [...upcomingDeadlines].sort(
        (a, b) =>
          new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      );
      sections.push(
        `UPCOMING DEADLINES (${sorted.length}):\n` +
          sorted
            .map((i) => {
              const kid = i.kidName ? `${i.kidName}: ` : "";
              return `- ${kid}${i.subject} — due ${new Date(i.dueDate!).toLocaleDateString()}`;
            })
            .join("\n")
      );
      sections.push("");
    }

    // Fallback
    if (sections.length <= 2) {
      sections.push("Nothing on the radar today. You're clear.");
    }

    const briefingText = sections.join("\n");

    // Write markdown file for history
    try {
      const { writeFileSync, mkdirSync, existsSync } = await import("fs");
      const { join } = await import("path");
      const briefDir = process.env.VELLUM_WORKSPACE_DIR
        ? join(process.env.VELLUM_WORKSPACE_DIR, "plugins", "family-briefing", "briefs")
        : join(process.cwd(), "plugins-data", "family-briefing", "briefs");
      if (!existsSync(briefDir)) {
        mkdirSync(briefDir, { recursive: true });
      }
      writeFileSync(join(briefDir, `${todayStr}.md`), briefingText, "utf-8");
    } catch {
      // Best-effort, don't fail the tool
    }

    // Update lastScanAt
    settings.lastScanAt = now.toISOString();
    saveStore(settings);

    return {
      content: {
        briefing: briefingText,
        deliveryChannel: settings.deliveryChannel,
        summary: {
          conflicts: todaysConflicts.length,
          calendarEvents: input.calendarEvents?.length || 0,
          newSchoolItems: newSchoolItems.length,
          upcomingDeadlines: upcomingDeadlines.length,
        },
      },
    };
  },
};

export default tool;
