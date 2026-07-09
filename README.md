<div align="center">

<img src="assets/icon.png" width="150" alt="family-briefing">

# family-briefing

**Your morning briefing for family logistics: calendars, school emails, and scheduling conflicts in one message.**

![version](https://img.shields.io/badge/version-0.1.0-blue) ![license](https://img.shields.io/badge/license-MIT-green) ![made for](https://img.shields.io/badge/made%20for-Vellum-8A2BE2)

[What You Get](#what-you-get) • [Scheduled Jobs](#scheduled-jobs) • [Requirements](#requirements) • [Install](#install) • [Surfaces](#surfaces) • [Usage](#usage)

</div>

---

Your assistant already reads email and checks calendars. What it doesn't do is pull everything together into one morning message that tells you what the day looks like for your family. This plugin adds that: a daily briefing that merges your family calendars, triages school emails for things you can't miss, and flags double bookings before they become problems.

## What you get

- **A daily morning briefing** that combines today's calendar events, new school emails, and scheduling conflicts into one short message delivered via Telegram or email.
- **School email triage** that watches only the school addresses you specify and auto-categorizes messages into deadlines, pickup changes, permission slips, spirit days, snack requests, and reminders. Nothing else in your inbox gets touched.
- **Scheduling conflict detection** across all your connected calendars. If two events overlap on different calendars, you see it in the morning before it becomes an afternoon fire.
- **Kid-aware personalization.** Tell the plugin your kids' names and the briefing reads like "Emma has library day" instead of "Library day scheduled."
- **Flag keywords** so anything you always want bumped to the top (early dismissal, picture day, a specific teacher's name) never gets buried.

## Scheduled jobs

The part you should read before installing. Once set up, the plugin acts on its own:

| When | What happens |
| --- | --- |
| Every morning at your chosen time | Briefing generated: calendars fetched, school emails scanned, conflicts checked, one message sent via Telegram or email |

What it will never do on its own: book appointments, create calendar events, send emails to anyone but you, or touch messages outside your school allowlist.

## Requirements

- **Google Calendar**: pulls events from all connected calendars (personal, shared family, partner's shared).
- **Gmail or Outlook**: scans for school emails from your allowlisted addresses.
- **Telegram** (optional): for briefing delivery if you prefer it over email.

## Install

```
assistant plugins install family-briefing
```

First use: the assistant walks you through 7 quick setup questions (briefing time, delivery channel, calendars, kid names, school email, school allowlist, flag keywords). Takes about 2 minutes. Three real answers, the rest are clicks and optional.

## Surfaces

| Surface | What it does |
| --- | --- |
| `get-morning-briefing` (tool) | Combines calendar events, school emails, and conflicts into one briefing message |
| `scan-school-email` (tool) | Logs a school email with auto-categorization, kid name matching, and due date extraction |
| `detect-conflicts` (tool) | Finds overlapping events across different calendars and calculates overlap duration |
| `update-settings` (tool) | Save or update preferences (briefing time, delivery channel, kid names, allowlist, keywords) |
| `get-settings` (tool) | Read current settings |
| `user-prompt-submit` (hook) | Triggers onboarding flow on first use |
| `family-briefing` (skill) | The briefing workflow and onboarding instructions |

## Usage

- "give me my morning briefing"
- "scan my school emails"
- "any scheduling conflicts today?"
- "change my briefing time to 6:30"
- "add Emma's teacher to my school allowlist"
- "what does my day look like?"

## License

MIT
