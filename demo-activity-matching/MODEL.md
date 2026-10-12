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

An event (called a "plan" in the UI) is an ask made specific: a fixed start time, a public venue and spots to fill.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | uuid | |
| `organiser_id` | ref User | |
| `activity_id` | ref Activity | From the fixed tag list. |
| `title` | text, 60 | |
| `description` | text, 200 | Screened (§7). |
| `level` | enum | Same four levels as profiles. |
| `venue_id` | ref Venue | Public places only, never a home. |
| `meeting_point` | text, 80 | Prefilled from the venue. Only shown to people in the thread (§13). |
| `directions` | text, 300 | How to get there: transport, parking, access. Prefilled from the venue. |
| `bring` | text, 80 | What to bring. Optional. |
| `starts_at`, `ends_at` | timestamptz | Stored with the venue's timezone. |
| `capacity` | int | Total spots, including the organiser's own group. |
| `join_mode` | enum | `approve` (organiser confirms, the default) or `open` (join straight away). |
| `visibility` | enum | `public` (Explore and search) or `invite` (only people sent it). |
| `status` | enum | `open` → `full` → `live` → `done`, or `cancelled`. `live` starts 30 minutes before `starts_at`. |
| `traits[]` | enum, derived | From the activity, the venue and the time: water, heights, contact, alcohol (licensed venue), late (ends after 10pm), early (starts before 7am), big (8 or more). Matched against people's avoid lists. |
| `created_from_ask_id` | ref Ask | When posted from an ask. |
| `cloned_from_event_id` | ref Event | For "run it again". |
| `cancelled_reason` | text | |

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

Everything is stored in Postgres (`schema.sql`). The "graph" is how the tables are read: as nodes and edges, with
recommendations and search found as paths from a person to an event.

### Nodes

Person · Activity · Category · Suburb · Venue · TimeBucket (`wd-am` … `we-pm`) · Trait · Event · Ask

### Edges

| Edge | Created by | Used for |
| --- | --- | --- |
| Person **INTERESTED_IN** Activity `{level}` | Onboarding, profile edits | Matching, levels |
| Person **ATTENDED** Activity `{count}` | Confirmed attendance | Weighting what they actually turn up to over what they only list |
| Person **LIVES_IN** Suburb `{radius}` | Onboarding | Distance |
| Person **FREE_AT** TimeBucket | Onboarding | Time fit |
| Person **AVOIDS** Trait | Onboarding | Hard filter (held back with a count, never silently dropped) |
| Person **MEMBER_OF** Event `{status}` | Interest, join, leave | Threads, "who's going" |
| Person **PLAYED_WITH** Person `{count, last_at}` | Two people both attended the same event | Social ranking ("Mia is going") |
| Person **RATED** Person `{tags, private}` | Feedback | Trust, social ranking, and penalties for bad experiences |
| Person **BLOCKED** Person | Report or block | Hard filter both ways |
| Event **IS** Activity · **AT** Venue (**IN** Suburb) · **IN_BUCKET** TimeBucket · **HAS** Trait | Event creation | All of the above |
| Ask **WANTS** Activity · **NEAR** Suburb · **DURING** TimeSlot | Asking | Matching asks to asks and events |

### A path, read as an explanation

```
You ──been 3×──▶ Padel ◀──is── Saturday padel ladder
You ──2 km─────▶ Freshwater ◀──at── (venue)
You ──free─────▶ weekend mornings ◀──in── (Sat 8am)
You ──played with──▶ Olivia ──going──▶ Saturday padel ladder
```

The event page draws this as **Why you're seeing this**. Every edge that made a plan rank highly is visible, and a dashed
edge marks the weak ones.

### How the graph learns

- Attending an activity strengthens **ATTENDED**, which outweighs a listed interest.
- Good feedback both ways strengthens **PLAYED_WITH**. Negative feedback suppresses that person in your recommendations and theirs.
- Repeatedly ignoring an activity's recommendations decays its weight (post-MVP).
- Self-rated levels shift after three or more "skill as described" or "skill not as described" tags.

## 4. Search

Search finds **events, never people**.

1. The query goes through the same parser as the ask box. "padel this weekend in Mosman" becomes activity = padel,
   time = this weekend, place = Mosman with the default radius.
2. Only what the person typed becomes a filter. Their profile level and home suburb are used for ranking, not to narrow results.
3. Words that aren't a known activity fall back to matching the title, description, activity and venue ("trivia", "photo").
4. Results are split into **exact** (same activity) and **similar** (same category), each ranked by the recommendation
   score (§6). Plans that clash with the avoid list are held back with a count.
5. Each parsed filter shows as a removable chip.
6. No results offers "post a plan" (prefilled from the query) or "save as an ask".

## 5. Browse

- **By day:** the next 7 days, with the count of open events within the travel radius.
- **By activity:** grouped by Sports, Hobbies and Professional skills, with counts. Activities with nothing nearby are
  shown greyed out rather than hidden, so people can see what's missing and ask for it.
- Browse never lists people.

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

Hard filters run first: **AVOIDS** trait (held back, with a count shown), **BLOCKED** in either direction, already a
member, past events, events outside the radius. The weights are starting points to tune against join and attendance rates.

Each recommendation carries its reasons ("Mia and Luca are going", "You've been to 3 padel plans", "Fits your free
time", "Good for getting fitter") and the edges for the "why" graph. A goal reason is shown only to the person whose goal
it is.

## 7. Create an event

Entry points: the ask box ("Post as a plan", offered first when the text names a fixed time, a venue or "we're 4"), the
**Create** button in Explore and Plans, and "Run it again" on a finished event.

1. **Activity**, picked first when starting from scratch.
2. **Day and start time.** From an ask, only times inside the asked window are offered.
3. **Venue**, from public venues for that activity, nearest first. Licensed venues are marked.
4. **Directions.** Picking the venue prefills:
   - **Meeting point** (`default_meeting_point`), editable, and required.
   - **Getting there** (`transport` + `parking`), editable.
   - The address, with a map link. Directions links carry only the venue's coordinates.
5. **Spots:** "we are" plus "looking for" gives the capacity. **Level**, **details** and **what to bring**.
6. **Join mode:** "I confirm who joins" is on by default.
7. **Reach preview:** how many people with a matching ask are told now, how many might-be-keen people will hear (within
   their weekly cap), and the radius it shows in Explore.
8. **Rules:**
   - All text is screened. Contact details or payment talk block posting.
   - Events over 6 people need ID verification or 100+ Goodwill.
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
