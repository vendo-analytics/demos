# Keen: data model, graph and event lifecycle

This is the spec behind the prototype. Field names match `schema.sql`. Where the prototype's mock data uses a different
shape, it's noted.

## Contents

1. [Profile](#1-profile)
2. [Event](#2-event)
3. [The graph that brings people to events](#3-the-graph-that-brings-people-to-events)
4. [Search](#4-search)
5. [Browse](#5-browse)
6. [Recommendations](#6-recommendations)
7. [Create an event (with directions)](#7-create-an-event)
8. [Join an event](#8-join-an-event)
9. [Mark attendance](#9-mark-attendance)
10. [Leave, and give and get feedback](#10-leave-and-feedback)
11. [History on the profile](#11-history)
12. [Message threads](#12-message-threads)
13. [Who sees what](#13-who-sees-what)

---

## 1. Profile

Every person has the same profile shape: you, other members and friends who come along. Fields fall into three groups:

- **Public:** shown on the profile card to anyone signed in.
- **Private:** only the person and Keen. Used for matching and safety, never shown.
- **Calculated:** worked out by Keen from what people do. Never typed in, so they can't be faked.

In the prototype, **Me → Edit profile** (the "Profile data" screen) shows every field below with its current value and
allowed values. It's driven by `PROFILE_FIELDS` in `profile.js`.

### 1.1 Public fields

| Field | Label | Type | Required | Allowed values / validation | Set by | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `first_name` | First name | text | yes | 1–30 letters, spaces, hyphens, apostrophes. One first name, or a double one like "Mary Jane". Never a surname. | Onboarding chat | `Mia` |
| `photo` | Photo | image | no | Optional but encouraged. A clear photo of the face, checked against a selfie (`photo_status`: none, pending, verified, rejected). Without one, the profile shows initials on a colour gradient and organisers see "No photo yet". | You | – |
| `home_suburb` | Home suburb | ref Suburb | yes | One suburb from the list (§1.5). Shown as the name plus a rounded distance, never an address. | Onboarding chat | `Manly` |
| `bio` | About you | text | no | Up to 160 characters. Screened: contact details and payment talk can't be saved. | You | `Usually on court before work.` |
| `interests` | Activities and levels | list of {activity, level} | yes | 1–10 entries. `activity` from the tag list (§1.5), `level` from Levels (§1.5). | Onboarding chat | `[{padel, intermediate}, {surfing, casual}]` |

### 1.2 Private fields

| Field | Label | Type | Required | Allowed values / validation | Set by | Example |
| --- | --- | --- | --- | --- | --- | --- |
| `birth_year` | Age | int | yes | Age 18–99, stored as a birth year. Used for the 18+ check and optional age-range matching. | Onboarding chat | `1992` (34) |
| `phone` | Mobile number | E.164 text | yes | Australian mobile, verified by SMS. One account per number; VoIP and virtual numbers blocked. Shown to the owner masked: `+61 4•• ••• 678`. | Sign-up | `+61412345678` |
| `travel_radius_km` | How far you'll travel | int | no | 2, 5, 10, 20 or 50. Default 10. | Onboarding chat | `10` |
| `avoid` | Things to avoid | list | no | Any of Avoid (§1.5). Plans with these traits are held back from suggestions, with a count. | Onboarding chat | `[alcohol]` |
| `availability` | Usually free | list | no | Any of Availability (§1.5). Used to rank plans by time. | Onboarding chat | `[wd-pm, we-am]` |
| `goals` | What you want from Keen | list | no | Up to 3 from Goals (§1.5). Internal only: tunes recommendations (§6), never shown to anyone. | Onboarding chat | `[friends, fitness]` |
| `asks_per_week` | Asks from Keen per week | int | no | 0, 1, 3, 5 or 7. Default 3. Caps the "might be keen" asks they receive. | You | `3` |
| `blocked_user_ids` | Blocked people | list | no | Set by blocking. Mutual and silent. | Report or block | – |

### 1.3 Calculated fields (public unless noted)

| Field | Label | Calculated from | Rule | Example |
| --- | --- | --- | --- | --- |
| `member_since` | Member since | Sign-up date | Shown as month and year. | `Mar 2025` |
| `verification` | Verification | Checks | `phone` (always), `photo` (when they've added one), `id` (optional). Shown as badges; the documents never are. | phone, photo, id |
| `goodwill` | Goodwill | The Goodwill ledger (§1.4) | Sum of ledger entries, never below 0. | `5,020` |
| `goodwill_level` | Goodwill level | Goodwill | New 0–199 · Regular 200–999 · Trusted 1,000–2,999 · Local legend 3,000+. | `Local legend` |
| `events_attended` | Plans attended | Confirmed attendance (§9) | Counted only once someone who was there confirms it. | `48` |
| `events_hosted` | Plans hosted | Confirmed attendance | Plans they organised that went ahead. | `6` |
| `hosting_rating` | Hosting rating | Event ratings (§10) | Average stars for plans they hosted, shown after 3 hosted plans. People themselves are never rated with stars. | `4.9` |
| `no_shows` | No-shows | Reports (§9) | Only counted when 2 people who were there report it. | `0` |
| `positive_tags` | What people say | Feedback (§10) | Count per positive tag, plus the number of positive reviews. Negative tags are never shown. | `On time 75, Friendly 66, …` |
| `activity_counts` | Plans per activity | Confirmed attendance | Attended plans per activity. Sums to `events_attended`. This is all that others see of someone's history. | `Padel 25, Surfing 14, Running 9` |
| `played_with` | Played with you | Co-attendance | Viewer-specific: "Played with you 2×". Private to the two people involved. | `2` |

### 1.4 Goodwill ledger

Every change is a ledger row (`user_id`, `delta`, `reason`, `event_id`, `created_at`). The rules:

| Reason | Points |
| --- | --- |
| Attended a plan (confirmed by someone who was there) | +50 |
| Left feedback after a plan | +20 |
| Good review received (max 3 per plan) | +10 each |
| Hosted a plan where 3 or more came | +100 |
| ID verified (once) | +100 |
| No-show (reported by 2 or more attendees) | −150 |
| 3 late cancels in 30 days | −50 |

A typical plan earns about 90 points (attend, give feedback, get 2 good reviews), which is what the level thresholds assume.

New-level limits (under 200): can join plans, at most 3 invites a day, and can't host plans over 6 people without ID.

### 1.5 Allowed values

**Levels:** one vocabulary everywhere (profiles, plans, search, onboarding). The onboarding chat accepts plain words and maps them.

| id | Label | Meaning | Plain words that map to it |
| --- | --- | --- | --- |
| `beginner` | Beginner | New to it or still learning the basics | never tried, new, learning, rusty, 1–3/10 |
| `casual` | Casual | Knows the rules, plays for fun | social, for fun, okay, average, 4–5/10 |
| `intermediate` | Intermediate | Plays regularly and holds their own | decent, pretty good, solid, 6–7/10 |
| `competitive` | Competitive | Plays to win, in leagues or comps | competitive, advanced, played for years, 8–10/10 |

**Activities:** grouped into the three tag families from the original notes. Synonyms map to one tag.

| Family | Activities (id) |
| --- | --- |
| Sports | Padel (`padel`), Tennis (`tennis`), Pickleball (`pickleball`), Squash (`squash`), Football (`football`), Basketball (`basketball`), Beach volleyball (`volleyball`), Running (`running`), Cycling (`cycling`), Bouldering (`climbing`), Surfing (`surfing`), Ocean swim (`swimming`) |
| Hobbies | Bushwalk (`hiking`), Local tour (`explore`), Board games (`boardgames`), Chess (`chess`), Photo walk (`photowalk`), Music jam (`jam`) |
| Professional skills | Language exchange (`language`). Home fix-it (`diy`) exists as a tag but is blocked in the MVP. |

**Goals** (up to 3, private): `fitness` Get fitter · `friends` Make new friends · `learn` Learn something new · `compete` Compete ·
`outdoors` Get outdoors · `unwind` Unwind.

**Avoid** (any), each with the plans it holds back:

| id | Label | Holds back |
| --- | --- | --- |
| `water` | Water sports | Surfing and ocean swims |
| `heights` | Heights | Bouldering and climbing |
| `alcohol` | Alcohol and bars | Plans at licensed venues |
| `contact` | Contact sports | Football and basketball |
| `late` | Late nights | Plans that finish after 10pm |
| `early` | Early starts | Plans that start before 7am |
| `big` | Big groups | Plans for 8 or more people |

**Availability** (any): `wd-am` Weekday mornings (Mon–Fri, before 12pm) · `wd-pm` Weekday afternoons and evenings
(Mon–Fri, 12pm onwards) · `we-am` Weekend mornings · `we-pm` Weekend afternoons and evenings.

**Positive tags:** On time · Friendly · Good sport · Skill as described · Would play again.
**Negative tags** (review only): Late · Rude · Skill not as described · Made me uncomfortable · Asked for contact details.

**Suburbs (prototype list):** Manly, Balgowlah, Freshwater, Dee Why, Mosman, Neutral Bay, Chatswood, Sydney CBD, Surry Hills,
Newtown, Marrickville, Bondi, Bronte, Coogee, Parramatta.

### 1.6 What each audience sees

| | Anyone signed in | The person | Keen only |
| --- | --- | --- | --- |
| First name, photo (or initials), suburb, about, activities and levels | ✓ | ✓ | |
| Member since, verification badges, Goodwill and level | ✓ | ✓ | |
| Plans attended, hosted, no-shows, hosting rating, positive tags, plans per activity | ✓ | ✓ | |
| "Played with you" | the other person only | ✓ | |
| Age, phone, travel distance, goals, avoid list, free times, asks per week | | ✓ | ✓ |
| Negative feedback, reports, blocked list | | | ✓ |

## 2. Event

An event (a "plan" in the UI) is an ask made specific: a fixed start time, a public venue and spots to fill. Every plan has
the same fields: 12 set by the organiser and 5 worked out by Keen. In the prototype, **All plan fields** on any event page
shows them with their values. They're driven by `EVENT_FIELDS` in `plans.js`.

### 2.1 Set by the organiser

| Field | Label | Type | Required | Allowed values / validation | Example |
| --- | --- | --- | --- | --- | --- |
| `title` | Title | text | yes | Up to 60 characters. Prefilled as "{Weekday} {activity}". | `Friday 6-a-side` |
| `activity_id` | Activity | ref Activity | yes | From the tag list (§1.5). Locked once someone other than the organiser's group has joined. | `football` |
| `description` | Details | text | no | Up to 200 characters. Screened: no contact details or payment talk. Shouldn't restate live numbers like "one spot left"; the app shows those. | `Bibs and ball sorted. Mixed, all levels.` |
| `level` | Level | enum | yes | Beginner, Casual, Intermediate, Competitive (§1.5). Defaults to the organiser's level for that activity. | `casual` |
| `venue_id` | Venue | ref Venue | yes | A public venue that lists this activity, nearest first. Never a home. | `manly-oval` |
| `meeting_point` | Meeting point | text | yes | Up to 80 characters. Prefilled from the venue's default. Only people in the thread see it. | `North end, by the nets` |
| `directions` | Getting there | text | no | Up to 300 characters. Prefilled with the venue's transport and parking notes. | `Ferry to Manly Wharf, then a 10 minute walk…` |
| `bring` | What to bring | text | no | Up to 80 characters. | `Boots or runners, water` |
| `starts_at`, `ends_at` | When | timestamptz | yes | Starts at least 1 hour from now and within 60 days. Lasts 1, 1.5, 2 or 3 hours. | `Fri 16 Oct, 6–7:30pm` |
| `capacity` | Spots | int | yes | 2–30, including the organiser and anyone they bring (`group_size`, 1–4). Can't go below the number already going. Over 6 needs ID or the Regular level. | `11` |
| `join_mode` | Joining | enum | yes | `approve` (organiser confirms, the default) or `open` (join straight away). | `approve` |
| `visibility` | Who can find it | enum | yes | `public` (Explore, search and suggestions within each person's radius) or `invite` (only people the organiser invites). | `public` |

### 2.2 Worked out by Keen

| Field | Rule | Example |
| --- | --- | --- |
| `status` | `open` → `full` (no spots) → `live` (from 30 minutes before the start) → `done` (after the end). `cancelled` is the only status a person sets. | `open` |
| `going`, `interested`, `waitlist`, `spots_left` | Counted from memberships (below). | `4 going · 2 interested · 7 left` |
| `traits` | From the activity (water, heights, contact), the venue (licensed → alcohol) and the time (late if it ends after 10pm, early if it starts before 7am, big if capacity ≥ 8). Matched against avoid lists. | `contact, big` |
| `time_bucket` | `wd-am`, `wd-pm`, `we-am` or `we-pm` from the start time. Matched against availability. | `wd-pm` |
| `organiser_id` | Whoever created it. Also: `created_at`, `created_from_ask_id`, `cloned_from_event_id` (for "run it again"). | – |

### 2.3 What the organiser can do after posting

- **Edit** any field above, except the activity once others have joined; capacity can't drop below the number going.
  Everyone in the thread gets one message listing what changed ("Sam changed the time to Fri 6pm, the venue to Clontarf Reserve").
- **Cancel** with a reason: bad weather, not enough people, venue not available, or something came up. Everyone going or
  interested is told. Cancelling under 24 hours before the start counts as a late cancel.
- **Accept or decline join requests**, seeing each person's level for the activity, plans attended and no-shows.
- **Take attendance** from 30 minutes before the start (§9).
- **Run it again**: a pre-filled copy for the same weekday next week, posted as a new plan with `cloned_from_event_id`.

**Venue:** `id`, `name`, `suburb_id`, `address`, `location` (point), `activities[]`, `licensed`, `default_meeting_point`,
`transport`, `parking`, `accessibility`, `verified_public`. Venues come from a curated list. Clubs and councils can propose
new ones, which are reviewed before use.

**Membership** (`event_members`) holds one row per person per event:

```
                       ┌──────────── leave ───────────┐
  (none) ─interest─▶ interested ─join─▶ requested ─confirm─▶ going ─check in─▶ checked_in ─confirmed─▶ attended
     │                    ▲                │ decline → declined    │                                   │
     └──────join (open)───┼────────────────┴──────────────────────▶ going                    no confirmation
                          │                                                                  → unconfirmed
            full: join ─▶ waitlist ─spot opens─▶ going                      roll call: no-show → no_show
```

Columns: `status`, `joined_at`, `left_at`, `late_cancel` (bool), `checked_in_at`, `attendance` (`attended`, `no_show` or null),
`confirmed_by[]`, `last_read_message_id`.

## 3. The graph that brings people to events

Everything is stored in Postgres (`schema.sql`). The "graph" is how the tables are read: as nodes and edges, walked in
**two directions** with the same rules:

- **You → plans:** feed, search, browse and "why you're seeing this" (§4–6).
- **Plan → people:** who a newly posted plan reaches (§3.4).

In the prototype, **Me → Your graph** draws every edge from you, weighted, and **Graph data** lists every node and edge type
with live counts. Both are driven by `NODE_TYPES` and `EDGE_TYPES` in `graph.js`.

### 3.1 Nodes

| Node | What it is | Demo count |
| --- | --- | --- |
| Person | A member | 34 |
| Activity | A tag from the fixed list | 20 |
| Category | Groups activities for "similar" matches (racquet sports, team sports…) | 11 |
| Suburb | Where people live and venues are | 15 |
| Venue | A public place where plans happen | 15 |
| Time bucket | `wd-am`, `wd-pm`, `we-am`, `we-pm` | 4 |
| Trait | water, heights, alcohol, contact, late, early, big | 7 |
| Goal | fitness, friends, learn, compete, outdoors, unwind | 6 |
| Plan | An event | – |
| Ask | An open request in plain English | – |

### 3.2 Edges

| Edge | From → to | Created by | Weight | Who sees it | Used for |
| --- | --- | --- | --- | --- | --- |
| `INTERESTED_IN` | Person → Activity | Onboarding, profile edits | Level; 0.75 base | Public, with level | Feed, search, reach |
| `ATTENDED` | Person → Activity | Confirmed attendance only | +0.05 per plan, max 1 | Counts only | What you turn up to beats what you list |
| `LIVES_IN` | Person → Suburb | Onboarding | Distance ÷ travel radius | Suburb public, radius private | Distance filter, both directions |
| `FREE_AT` | Person → Time bucket | Onboarding | 1 if free, 0.3 if not | Private | Feed ranking; reach holds back people busy then |
| `AVOIDS` | Person → Trait | Onboarding | Hard filter | Private | Plans held back with a count; reach skips them |
| `WANTS` | Person → Goal | Onboarding | +0.08 when a plan suits a goal | Private | Feed ranking |
| `MEMBER_OF` | Person → Plan | Interested, join, leave | Status | Who's going is public; interested is a count | Threads, who's going, momentum |
| `PLAYED_WITH` | Person → Person | Both had confirmed attendance at the same plan | Plans together ÷ 3, +1 for a good rating, capped at 1 | Only the two people | "Mia is going", feed ranking |
| `RATED` | Person → Person | Feedback after a plan | Good strengthens PLAYED_WITH; bad lowers plans with that person by 0.15, silently | Private | Feed ranking |
| `BLOCKED` | Person → Person | Report or block | Hard filter, both ways | Private | Feed, search, browse, reach, matches |
| `IS`, `AT`, `IN`, `HAS` | Plan → Activity, Venue, Time bucket, Trait | Creating or editing a plan | – | Public | Every match |
| `ASKS_FOR` | Ask → Activity, Suburb, Time slots | Asking in plain English | – | Private until matched | Ask matching; reach ("asked for this") |

Two rules hold for every edge:

1. **Only confirmed attendance builds edges.** `ATTENDED` and `PLAYED_WITH` ignore plans nobody has confirmed, the same
   rule as the profile's numbers. Unconfirmed check-ins and plans waiting for a roll call don't count yet.
2. **Private edges never leak.** Goals, avoids, free times, ratings and blocks shape results, but nobody else can see them.
   Reasons based on them ("Good for getting fitter") are shown only to their owner.

### 3.3 You → plans

The path from a person to a plan, read as an explanation:

```
You ──been 2×──────▶ Padel ◀──is── Saturday padel ladder
You ──2 km─────────▶ Freshwater ◀──at── (venue)
You ──free─────────▶ weekend mornings ◀──in── (Sat 8am)
You ──played with──▶ Olivia ──going──▶ Saturday padel ladder
You ──wants────────▶ Get fitter ◀──suits── (padel is a sport)
```

The scoring that ranks these paths is in §6. The event page draws the path as **Why you're seeing this**.

Hard filters run first: plans with a trait you avoid are held back (with a count shown), and plans organised or attended
by someone blocked in either direction are removed.

### 3.4 Plan → people (reach)

When a plan is posted or edited, Keen walks the same edges from the plan's side. For every person with an edge to the
activity (an open ask for it at that time, or `INTERESTED_IN`):

| Check, in order | Fails → |
| --- | --- |
| Not blocked by or blocking the organiser | held back: blocked |
| Venue within *their* travel radius | held back: too far |
| No trait on *their* avoid list | held back: avoid |
| Their level for the activity within 1 step of the plan's level | held back: level |
| Has an open ask that overlaps → **told now**, no cap | – |
| Plan's time bucket in *their* free times | held back: busy |
| Fewer than *their* weekly ask cap (default 3) this week | held back: cap |
| Otherwise → **told within their cap** | – |

The organiser sees counts only ("Asked for this 1 · Into padel nearby 3 · 7 held back: too far 1, level 1, busy 5"),
never names, until people say they're interested.

### 3.5 How the graph learns

- A confirmed plan strengthens `ATTENDED` for that activity and adds or strengthens `PLAYED_WITH` for everyone there.
- A good rating adds +1 to that `PLAYED_WITH` weight. A bad rating quietly lowers plans with that person; they're never told.
- Blocking removes them from each other's results entirely.
- Post-MVP: decay for activities whose recommendations are repeatedly ignored, and self-rated levels nudged after three or
  more "skill as described" or "not as described" tags.

## 4. Search

Search finds **events, never people**. It's the same parser as the ask box, so one sentence works in both places.

### 4.1 Pipeline

| Step | What happens | Example |
|---|---|---|
| 1. Parse | Activity, venue, place, radius, time, level, as for an ask (§3, `parseIntent`). | "padel this weekend in Mosman" → padel · Sat–Sun · Mosman 5 km |
| 2. Repair | A word that isn't an activity is checked for a **typo** (edit distance 1, or 2 for words of 7+ letters, swaps count as 1), a **plural** ("hikes") or a **local name** (`activities.aliases`: footy, rugby → football). | "padle" → padel, with "Search for 'padle' instead" |
| 3. Leftover words | Time, level, place and filler words are removed. What's left is matched against title, description, activity and venue. If nothing is left, only the filters apply. | "something sunday morning" → every plan on Sunday morning |
| 4. Filter | Only what was typed or picked in Filters narrows the results. The profile ranks, it never narrows. | |
| 5. Bucket | **Exact** (same activity), **similar** (same category), **held back** (clashes with the avoid list, shown as a count). | "pickleball" → padel and tennis under Similar |
| 6. Rank | Recommendation score (§6) by default. Sort by **soonest** or **nearest** instead. | |
| 7. Fall back | No exact results: rerun with one filter relaxed, in this order: time, distance, level. Show those under a named heading. | "padel 7am" → "Padel at other times" |

### 4.2 Filters

| Filter | From the query | From the Filters sheet | Rule |
|---|---|---|---|
| Activity | "padel", "footy", "padle" | Browse tiles | Exact, plus same category under Similar |
| Venue | "manly oval" | Typeahead | Only plans at that venue |
| Place | "in Mosman" | Typeahead | Plans within the radius of that suburb |
| Distance | "within 2 km" | 2, 5, 10, 20, 50 km | Default: your travel radius from your home suburb |
| When | "tonight", "this weekend", "before work", "Sat 8am" | Today, Tomorrow, This weekend, Next 7 days | A day with no time means the whole day. A part of the day with no day ("before work") means the next 7 days. A clock time with no day means today, or tomorrow if it has passed. |
| Level | "beginner", "competitive" | Beginner … Competitive | That level, plus casual plans (open to everyone) |
| Spots left | — | On/off | Hides full plans |
| Join straight away | — | On/off | Hides plans that need the host's approval |

Each filter shows as a removable chip. Filters picked in the sheet also show a count on the Filters button.

### 4.3 Typeahead

While typing, a list under the box shows what the text could mean: activities, venues and suburbs that start with
what's typed (or are one typo away), each with the number of open plans nearby, so a suggestion never leads to an empty
page without warning. Once an activity is typed, common next words are offered ("padel this weekend", "padel before work").
With an empty box it shows recent searches (kept on the device, last 5) and examples.

### 4.4 Messages instead of a silent zero

| Situation | What the person sees |
|---|---|
| Typo repaired | "Showing results for padel. Search for 'padle' instead." |
| Local name | "There's no footy on Keen yet, so these are football plans, the closest thing." |
| A first name ("Mia") | "Search finds plans, not people." Explains why, and points to history (invite someone you've played with) and Ask. |
| Filter too tight | The near misses under "Padel at other times", "Surfing further away" or "Tennis at other levels", with "Show all" or "Widen to 20 km". |
| Unknown activity ("yoga") | "No yoga plans yet." Keen logs it as demand. |
| Anything with no results | Post a plan (prefilled), save as an ask, or **Notify me**. |

### 4.5 Saved searches ("Notify me")

- A saved search is a private standing query (`saved_searches`). When an event is posted, it's checked against saved
  searches from the event's side, the same way reach works (§3.4), and a match sends one notification.
- At most one notification per saved search per day. It counts towards the weekly cap of the person who saved it.
- Nobody else can see it. That's the difference from an ask, which reaches people who want the same thing.
- Saved searches appear at the top of Explore with the current number of matches.

### 4.6 Demand from zero-result searches

Every search is logged for 90 days (`search_log`) with the repaired activity and any unknown term. Zero-result searches
grouped by suburb and term ("12 people near Manly searched yoga this month") are used to:

- suggest the activity to people who list it as an interest and have hosted before ("Want to host yoga? 12 people nearby are looking");
- decide which activities to add to the list (and which aliases to add, from repeated typos and local names).

The log is never shown to anyone and isn't linked to a profile in any report.

### 4.7 Privacy

- No search by name, ever, and no list of people in results. People appear only as faces and first names on a plan's card.
- Invite-only plans are never in search. Blocked people's plans are removed both ways.
- Avoid-list clashes are held back with a count and a "Show" link, never silently dropped.

## 5. Browse

Browse shows **what exists near you** by fixed, explainable rules. Recommendations (§6) decide what to push; browse
doesn't rank by person, so it's also how people find plans outside their usual interests.

### 5.1 What's included

Open, public plans within the travel radius of the home suburb that haven't finished. Cancelled plans, invite-only
plans and plans involving someone blocked (either way) are left out. Counts include plans you've joined and plans that
clash with your avoid list; the rows of cards don't.

### 5.2 Collections

Each row has a rule, shown under its title. Cards are ordered soonest first. A plan already in the top of **For you**
isn't repeated in a row unless it's the only one, and rows that map onto a search filter have **See all N**, which
opens search with that filter as a chip.

| Row | Rule | See all |
|---|---|---|
| Happening now | Started, or starts within 30 minutes | — |
| Next 48 hours | Starts within two days | When: tomorrow |
| This weekend | Saturday or Sunday in the next 7 days | When: this weekend |
| Needs one or two more | 1–2 spots left | — |
| Good for beginners | Beginner level, or a clinic or lesson | Level: beginner |
| After work | Weekdays from 5pm | "after work" (the next 7 days) |

Empty rows are hidden.

### 5.3 By day and by activity

- **By day:** the next 7 days, today first, each with the count of open plans. Days with none are disabled.
- **By activity:** one row per group (Sports, Hobbies, Professional skills), busiest first. Activities with nothing
  nearby are shown greyed out with "None yet" rather than hidden. Tapping one opens search for it, where an empty result
  offers post, ask or notify me.

### 5.4 Map

- A schematic map centred on the home suburb: suburbs as labels, the travel radius and half of it as rings, venues as
  pins. A pin shows the number of open plans; grey dots are venues with nothing on.
- Zoom is a distance choice (2, 5, 10, 20 km). Pins closer than about 24 px at the current zoom are grouped into one
  pin with the total. Tapping a group lists its venues, with "Zoom in".
- A venue shows its address, distance, whether it's licensed, its plans as cards, a Directions link (Apple or Google
  Maps), and "Start one here", which opens Create with the venue set and its activities first.
- Production uses a real map (MapKit or Mapbox) with the same pins and grouping. Only venues are pinned; people's
  locations are never on the map.

### 5.5 Privacy

Browse never lists people. Faces on a card are the people going to that plan, shown by first name only.

## 6. Recommendations

For every open, public event within the travel radius that the person isn't already in:

```
score = 0.28 interest     listed 0.75, +0.05 per attended event of that activity (max 1); same category 0.45; else 0.1
      + 0.14 social       people you've played with who are going (3 shared events = 1)
      + 0.12 free time    the event's time bucket is in your availability: 1, otherwise 0.3
      + 0.11 level fit    1, 0.8, 0.5 or 0.3 by how many levels apart
      + 0.11 soon         1 today, falling to 0 at 7 days
      + 0.08 momentum     how close the event is to full
      + 0.08 trust        organiser Goodwill / 3000, capped at 1
      + 0.08 goals        1 if the event suits one of your private goals, 0.3 if none do, 0.5 if you set no goals

goal matches:  fitness  → sports and fitness activities, bushwalks
               friends  → groups of 6+ or with 2+ people interested
               learn    → beginner level, clinics, "basics"
               compete  → intermediate or competitive level
               outdoors → outdoor activities at outdoor venues
               unwind   → casual games, creative, outdoors or local plans
```

Then adjustments, each shown to the person as a reason or an edge in the "why" graph:

```
      - 0.15 someone you rated badly is organising or going (they're never told)
      - 0.30 overlaps a plan you're going to, hosting or have asked to join   → "Clashes with Saturday padel ladder"
      - 0.12 per "Show fewer <activity>" you've tapped
      - 0.20 the plan is full (only a waitlist left)
```

Hard filters run first: **AVOIDS** trait (held back, with a count shown), **BLOCKED** in either direction, already a
member, past events, events outside the radius, plans you've hidden with "Not for me". The weights are starting points
to tune against join and attendance rates.

**Variety.** The top 10 are re-ordered greedily: each earlier pick of the same activity costs 0.07, so a padel regular
still sees padel first but not six padel plans in a row.

**Cold start.** With no history, interest comes from the activities chosen in onboarding, and free time and goals from
what was said there. With nothing at all, the score falls back to distance, soonness, momentum and organiser trust,
which favours busy, nearby, well-run plans.

### 6.1 Telling the feed what you think

Every card in **For you** has a "⋯" menu:

| Choice | Effect | Stored |
|---|---|---|
| Not for me: hide this plan | Removed from your suggestions; counted under the row with **Reset** | `recommendation_feedback (kind = 'hide')` |
| Show fewer padel plans | −0.12 per tap on that activity, and a "you asked for fewer" edge | `recommendation_feedback (kind = 'fewer')` |
| Why am I seeing this? | Opens the plan's "why" graph | — |

Both have Undo. The organiser is never told. Feedback decays after 60 days, so a "fewer" isn't permanent.

### 6.2 Where recommendations appear

- **Explore → For you:** top 6 as large cards with reasons.
- **Ask tab → Picked for you:** top 5 under the ask box.
- **Notifications:** at most `asks_per_week` per person per week, shared with asks and invites (§3.4), and only for
  plans scoring 0.7 or more.

Each recommendation carries its reasons ("Mia and Luca are going", "You've been to 3 padel plans", "Fits your free
time", "Good for getting fitter") and the edges for the "why" graph. A goal reason is shown only to the person whose goal
it is.

## 7. Create an event

Entry points: the ask box ("Post as a plan", offered first when the text names a fixed time, a venue or "we're 4"), the
**Create** button in Explore and Plans, "Start one here" on a venue in the map (§5.4), "Post a plan" on an empty search,
and "Run it again" on a finished event.

1. **Activity**, picked first when starting from scratch. From a venue, that venue's activities come first.
2. **Day and start time.** Today is offered while a start time at least an hour away is left; earlier times are greyed.
   From an ask, only times inside the asked window are offered. Duration 1, 1.5, 2 or 3 hours.
3. **Venue**, from public venues for that activity, nearest first, each with its distance. Licensed venues are marked.
   Picking one shows a venue card: name, address, distance, and Apple Maps and Google Maps links (coordinates only).
4. **Already on?** Once activity, day, time and venue are set, Keen looks for the same activity within 2 km and within
   30 minutes either side. If there is one, it's shown as a card ("a full game beats two half games") and posting needs
   one tap on **Post mine anyway**. Changing the day, time or venue asks again.
5. **Directions.** Picking the venue prefills:
   - **Meeting point** (`default_meeting_point`), editable, and required. Only people in the thread see it.
   - **Getting there** (`transport` + `parking`), editable.
6. **Spots:** "we are" plus "looking for" gives the capacity. **Level**, **details** and **what to bring**.
7. **Join mode:** "I confirm who joins" is on by default. **Repeat every Friday** (off by default): each week is posted
   7 days ahead as its own plan with its own thread, and last week's people are told first.
8. **Reach preview:** how many people with a matching ask are told now, how many might-be-keen people will hear (within
   their weekly cap), and the radius it shows in Explore.
9. **Preview:** the card exactly as it will appear in Explore.
10. **Rules** (the button says which one is unmet):
    - Starts at least 1 hour from now and within 60 days.
    - All text is screened. Contact details or payment talk block posting.
    - Events over 6 people need ID verification or the Regular level (200+ Goodwill).
    - The organiser must be 18+ and phone-verified.

## 8. Join an event

| Action | Result | Thread access |
| --- | --- | --- |
| **I'm interested** | `interested`; no spot taken; told about changes | Read and write |
| **Join** (open mode) | `going` straight away | Read and write |
| **Ask to join** (approve mode) | `requested`; the organiser sees your Goodwill, events and no-shows, then accepts or declines | Read and write |
| **Join waitlist** (full) | `waitlist`; moved to `going` automatically when a spot opens, and told | Read and write |
| Declined | `declined`; you see "this plan is full" | Removed |

Directions are visible before joining (venue, address, transport). The **meeting point** is only shown to people in the thread.

## 9. Mark attendance

Attendance is what Goodwill is built on, so it always needs a second person.

1. **Check-in** opens 30 minutes before the start. Tapping "I'm here" sets `checked_in`. The app can offer it from
   location near the venue, but location is never required or stored.
2. **Confirmation:** the organiser, or any other checked-in attendee, confirms. You then become `attended` and get +50 Goodwill.
3. **Roll call:** the organiser marks each member as came or no-show (check-in times are shown). Confirming gives every
   attendee +50, and the organiser +100 if 3 or more came.
4. **Fallback:** with no roll call within 24 hours of the end, check-ins confirmed by another attendee count. Unconfirmed
   check-ins earn nothing.
5. **No-shows:** one report flags it. It only costs −150 Goodwill and counts on the profile when a **second, independent**
   attendee reports it too.
6. "Running late" posts to the thread and doesn't change status.

## 10. Leave and feedback

**Leaving:** going → `left`. The spot goes to the first person on the waitlist, and the thread gets "Sam can't make it
any more". Leaving within 24 hours of the start sets `late_cancel`. Three late cancels in 30 days cost −50 Goodwill.
Organisers cancelling notifies everyone, and repeated cancellations reduce their reach.

**Giving feedback** (prompted when the event ends, open for 7 days):

- **Event rating**, 1–5 stars. Feeds the organiser's `rating_avg`.
- **Per person:** came or no-show (counts as confirmation), good or not great, and tags.
  - Positive tags: on time, friendly, good sport, skill as described, would play again.
  - Negative tags: late, rude, skill not as described, made me uncomfortable, asked for contact details.
- Negative feedback is **private**: it goes to review and to the ranking, never to the person's profile.
- Leaving feedback earns +20 Goodwill.

**Getting feedback:** the profile shows positive tag counts ("On time 13") and the average rating. People are told when
they receive a good review (+10 Goodwill, max 3 per event). They're never told who gave negative feedback.

## 11. History

- **Your own profile:** every event you attended or hosted, newest first, with date, activity, role (went or hosted),
  the rating you gave, and anything still due (rate, take attendance). Plus totals by activity and the people you've
  played with most.
- **Other people's profiles:** only counts per activity ("Padel 24 · Surfing 14"), total events, no-shows, and "played
  with you 3×" if you have. Never where or when, because a full history would reveal someone's routine.

## 12. Message threads

- **One thread per event.** It's created with the event, and the organiser's first post is pinned with the time, venue
  and meeting point.
- **Members:** the organiser plus everyone `interested`, `requested`, `waitlist` or `going`. Leaving or being declined
  removes access. After the event, the thread stays readable to attendees for 7 days.
- **Messages:** text, an optional reply to another message, and system messages (joined, left, checked in, confirmed,
  directions changed).
- **Screening:** phone numbers, emails, links, other app names and payment words are masked until both people have
  attended an event together.
- **No 1:1 messages** with people you haven't met. After attending together, 1:1 can be unlocked (post-MVP).
- Unread counts come from `last_read_message_id`. Push notifications are sent for organiser posts and direct replies only.

## 13. Who sees what

| | Anyone signed in | In the thread | Organiser | Keen only |
| --- | --- | --- | --- | --- |
| Event title, activity, time, level, spots | ✓ | ✓ | ✓ | |
| Venue, address, transport and parking | ✓ | ✓ | ✓ | |
| Meeting point | | ✓ | ✓ | |
| Thread messages | | ✓ | ✓ | |
| Who's going (first name, photo, Goodwill) | ✓ | ✓ | ✓ | |
| Join requester's no-shows and events | | | ✓ | |
| Profile: interests, positive tags, activity counts | ✓ | ✓ | ✓ | |
| Age, avoid list, availability, phone | | | | ✓ |
| Negative feedback | | | | ✓ |
