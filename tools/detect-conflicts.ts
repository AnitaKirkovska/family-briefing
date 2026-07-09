import type { ToolDefinition } from "@vellumai/plugin-api";
import {
  loadStore,
  saveStore,
  generateId,
  type Conflict,
} from "../src/store";

interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  calendar: string;
  location?: string;
}

function calculateOverlapMinutes(
  e1: { start: string; end: string },
  e2: { start: string; end: string }
): number {
  const s1 = new Date(e1.start).getTime();
  const e1End = new Date(e1.end).getTime();
  const s2 = new Date(e2.start).getTime();
  const e2End = new Date(e2.end).getTime();

  const overlapStart = Math.max(s1, s2);
  const overlapEnd = Math.min(e1End, e2End);

  if (overlapEnd <= overlapStart) return 0;
  return Math.round((overlapEnd - overlapStart) / (1000 * 60));
}

const tool: ToolDefinition = {
  description:
    "Detect scheduling conflicts from a list of calendar events. Pass in all events from the parent's connected calendars (personal, shared family, partner's shared) for a given day range. The tool finds overlapping events and calculates overlap duration. Only stores new conflicts (skips duplicates). Use get-settings first to check if the parent has calendars configured. For v1, this is overlap detection only, no commute time estimation.",
  input_schema: {
    type: "object",
    properties: {
      events: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Event title." },
            start: { type: "string", description: "ISO datetime for event start." },
            end: { type: "string", description: "ISO datetime for event end." },
            calendar: { type: "string", description: "Name or ID of the calendar this event came from." },
            location: { type: "string", description: "Optional event location." },
          },
          required: ["title", "start", "end", "calendar"],
        },
        description: "All calendar events to check for conflicts, from all connected calendars.",
      },
    },
    required: ["events"],
  },
  defaultRiskLevel: "low",
  execute: async (input: { events: CalendarEvent[] }) => {
    const settings = loadStore();
    const events = input.events;

    if (events.length < 2) {
      return {
        content: {
          conflictsFound: 0,
          message: "Need at least 2 events to detect conflicts.",
        },
      };
    }

    const newConflicts: Conflict[] = [];

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const e1 = events[i];
        const e2 = events[j];

        // Skip events from the same calendar (they can't overlap in Google Calendar)
        if (e1.calendar === e2.calendar) continue;

        const overlap = calculateOverlapMinutes(e1, e2);
        if (overlap <= 0) continue;

        // Check if we already have this conflict
        const isDuplicate = settings.conflicts.some(
          (existing) =>
            existing.event1Title === e1.title &&
            existing.event2Title === e2.title &&
            existing.date === new Date(e1.start).toISOString().slice(0, 10) &&
            existing.status !== "resolved"
        );

        if (isDuplicate) continue;

        const conflict: Conflict = {
          id: generateId(),
          event1Title: e1.title,
          event1Start: e1.start,
          event1End: e1.end,
          event1Calendar: e1.calendar,
          event1Location: e1.location || null,
          event2Title: e2.title,
          event2Start: e2.start,
          event2End: e2.end,
          event2Calendar: e2.calendar,
          event2Location: e2.location || null,
          overlapMinutes: overlap,
          date: new Date(e1.start).toISOString().slice(0, 10),
          status: "new",
        };

        newConflicts.push(conflict);
        settings.conflicts.push(conflict);
      }
    }

    if (newConflicts.length > 0) {
      saveStore(settings);
    }

    return {
      content: {
        conflictsFound: newConflicts.length,
        newConflicts,
        allConflicts: settings.conflicts.filter((c) => c.status === "new"),
      },
    };
  },
};

export default tool;
