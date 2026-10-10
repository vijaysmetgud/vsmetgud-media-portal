# VSMETGUD Media Portal — update package

Drop these into `E:\vsmetgud-media-portal` (and your k8s image build) like this:

```
E:\vsmetgud-media-portal\server.js          <- replace
E:\vsmetgud-media-portal\app\index.html     <- replace
E:\vsmetgud-media-portal\app\health-reminder.html   <- new
E:\vsmetgud-media-portal\app\subscriptions.html     <- new
E:\vsmetgud-media-portal\app\calendar.html          <- new
E:\vsmetgud-media-portal\app\sw.js                  <- new
E:\vsmetgud-media-portal\app\push-client.js         <- new
```

`dashboard.html` did not need any changes — the "look like the Theatre
button" request was about the **My Dashboard button on the main
portal**, which lives in `index.html`, not in `dashboard.html` itself.

## 1. One-time setup

```bash
cd E:\vsmetgud-media-portal
npm install web-push
```

That's it — no API keys to obtain. On first boot, `server.js` generates
a VAPID keypair itself and stores it in the same SQLite file
(`data/visitors.db`, table `portal_settings`, key `vapid_keys`), so it
survives restarts and pod restarts and every browser's saved
subscription keeps working.

Restart the server (and rebuild/redeploy the Helm image) after copying
the files in.

## 2. What was added / changed

**Dashboard button styling** — `index.html`: the "📊 My Dashboard",
"🗓️ Calendar" and "💳 Bill Tracker" toggles now render as the exact
same gradient pill button as "🎬 Theatre Media Player" / "💰 Expense
Tracker", sitting in the same row right beside them.

**Bill / Subscription tracker** (`subscriptions.html` + new
`bills_subscriptions` table) — add/edit/delete bills with amount,
category, renewal date, recurrence (weekly/monthly/quarterly/yearly/
one-time), and reminder lead time. Renewal dates auto-roll forward
once a recurring bill's due date passes, so you don't have to
re-enter it every cycle. A background checker (`runNotificationChecker`,
every 60s) pushes a notification when a bill enters its reminder
window or is due today.

**Water intake tracker** (inside `health-reminder.html` + new
`water_intake_log` table) — a +1/-1 glass logger with a daily-goal
ring, on top of 5 default water reminders (10:00, 12:00, 14:30,
16:30, 19:00) added to your existing health reminder schedule. If you
already had the portal running, these get merged into your existing
schedule automatically the next time the server starts (it won't
touch your existing customised reminders).

**Editable reminder times/messages** — `health-reminder.html` is a
full editor now: every reminder (general or water) has its time and
message in an editable field, plus add/delete. Saves go through the
existing `/api/health-reminders` endpoint (still admin-gated, same as
before).

**Persistent, ring-when-closed notifications** — this is the piece
that needed real infrastructure, not just a client-side timer:
- `push-client.js` + `sw.js` implement Web Push with VAPID.
- New tables: `push_subscriptions`, `notification_log` (dedupe).
- New endpoints: `GET /api/push/vapid-public-key`,
  `POST /api/push/subscribe`, `POST /api/push/unsubscribe`.
- `runNotificationChecker()` runs every minute server-side and fires a
  push for due health/water reminders, due bills, and calendar events
  — independent of whether any browser tab is open.

  **Please set expectations correctly here:** a website cannot force a
  custom loud alarm sound to play while the browser is *fully closed*.
  What you get in that case is the operating system's own notification
  chime, as long as the browser is still allowed to run its background
  push service (e.g. Chrome/Edge's "Continue running background apps
  when browser is closed" setting; on Android this works even with
  Chrome fully closed; iOS Safari requires the portal be added to the
  home screen). When the portal tab **is** open, the existing loud
  `/sounds/health-reminder.mp3` alarm still plays, now also triggered
  from a clicked push notification.

**Calendar with Indian holidays** (`calendar.html` + new
`calendar_events` table) — month grid, holidays color-coded (blue =
national, purple = religious, amber = festival), click any date to
add your own reminder + push notification. 2026 holiday dates were
pulled from published 2026 gazetted-holiday sources; moon-sighting
festivals (Eid, Bakrid, Muharram, Holi, Diwali, etc.) are best
estimates and can shift a day — there's a disclaimer on the page
itself, verify locally before relying on them for anything official.

## 3. What I could NOT do yet — surround sound fix

The surround-sound engine and preset list live in whatever file
actually renders the Theatre Media Player (it opens
`http://theatre.vsmetgud.online`, which isn't `index.html`,
`dashboard.html`, or `server.js`). None of the three uploaded files
contain any surround/Dolby/preset code, so I have nothing to fix or
extend yet.

**To get the surround-sound fix + extra presets done, please share the
theatre player's own HTML/JS file(s)** (the ones actually served at
`theatre.vsmetgud.online`, likely under a `theatre/` folder or a
separate app in your repo). Once I can see the existing Web Audio
graph, I can fix the current bug and add more presets (e.g. Movie
Hall, Concert, Stadium, Night Mode / dialogue-boost, Bass-Heavy) the
same way.
