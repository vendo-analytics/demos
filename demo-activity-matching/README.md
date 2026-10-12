# Keen: activity matching MVP

A clickable prototype of the core loop of a mobile app that connects people who want to do the same thing.
You say what you want to do in plain English ("padel Saturday morning, we're two looking for two more").
Keen turns that into a small graph, finds people and groups who fit, and reaches out to people who might be keen.

"Keen" is a working name ("who's keen for padel?"). Everything in the demo data is invented.

**Spec:** [`MODEL.md`](MODEL.md) has the profile and event data models, the graph, search, browse, recommendations
and the rules for creating, joining, attendance, leaving, feedback, history and message threads.
[`schema.sql`](schema.sql) is the Postgres schema with the core queries.

Open `index.html` in a browser. There's no build step. The right-hand column has design notes for the
current screen and "Jump to" buttons for each flow. The app opens on onboarding; tap **Skip** to use the sample profile.

## What the prototype covers

| Flow | What to try |
| --- | --- |
| Onboarding | Chat with the agent (talk, type or tap quick replies). Watch the profile card fill in. Remove anything with ×. |
| Ask | Type anything, or tap an example. Watch the graph fill in, and tap a node to correct it. "Picked for you" sits under the box. |
| Matches | Groups to join, people keen right now, a suggested plan that combines individuals, and the "might be keen" reach-out. |
| No match | "Board games in Newtown tonight": the ask is saved and passed on, with a "widen radius" option. |
| Explore | Recommendations with reasons, browse by day, browse by activity. Plans that clash with your avoid list are held back with a count. |
| Search | "padel this weekend": the query becomes removable filter chips. Try "pickleball" (similar results) or "karaoke" (no results). |
| Event page | Interested or join, directions with map links, "why you're seeing this" graph, who's going, thread preview. |
| Thread | Ask "where do we meet?" or "what do I bring?" and the organiser answers. Reply to a message. Type a phone number to see it hidden. |
| Create event | Activity, day, time, venue, meeting point and directions, spots, level, details, approvals, who can find it, reach preview. |
| Host tools | A plan you host: accept a join request, edit it (everyone is told what changed), cancel it with a reason, run it again next week. |
| Plan data | Every field on a plan with its value and allowed values. |
| Profile data | Every field on your profile with its value and allowed values, editable with validation. |
| Check-in | A plan happening now: "I'm here" or "Running late", then confirmation and +50. |
| Roll call | The organiser marks who came on a plan they hosted. |
| Feedback | Rate the plan, confirm who came, tag people. A good review comes back a few seconds later. |
| History | Every plan you went to or hosted, totals by activity, and the people you've played with. |
| Profile | Someone else's profile: counts per activity, "played with you", trust badges. |

Login, photo checks and calendar sync are deliberately out of scope.

**Photos.** Portraits and the padel and tennis photos are AI-generated for the demo: none of them show real people.
Other activities use gradient art in their category's colours, and people without a photo show their initials. Both
fallbacks are part of the design, not placeholders to remove. Drop more photos into `img/acts/<activity>.jpg` and add the
activity to `ACT_PHOTOS` in `data.js` to use them.

## Core ideas

1. **No search, only asks.** People never browse other people. You say what you want, and Keen does the finding and the reaching out. This is the main defence against the app becoming a people-search or a dating app.
2. **Plain English in, structured graph out.** Each ask becomes five facets: *what, where, when, group, level*. Every facet is editable with one tap, so when the parser is wrong you fix one node instead of retyping. The UI never limits what someone can ask for.
3. **An ask and a plan are the same object.** Both have an activity, a place, a time window, how many people you have and how many you need. A person on their own is `have 1, need 3`. Two friends are `have 2, need 2`. A football organiser is `have 4, need 7`. When asks combine, they become a plan.
4. **Three ways to say yes.** Each search returns:
   - *Groups looking for people*: existing plans with open spots.
   - *Keen right now*: people whose open ask overlaps yours.
   - *Might be keen*: people who list the activity nearby but haven't asked. They are never shown. Keen passes the ask on and they choose whether to reply.
5. **No dead ends.** If nobody fits, the ask is saved for 7 days, passed on to the might-be-keen pool, and you're told when someone says yes.
6. **Trust is earned through other people.** Goodwill points only come from things another person confirms.

## Data model (the graph)

```
Person ──INTERESTED_IN {level}──▶ Activity ──IN_CATEGORY──▶ Category
   │                                 ▲
   ├──LIVES_NEAR──▶ Suburb           │
   │                                 │
   ├──POSTED──▶ Ask ──WANTS──────────┘
   │             ├──NEAR {radius}──▶ Suburb
   │             ├──DURING──▶ TimeSlot (one per day in the window)
   │             └──MERGED_INTO──▶ Plan ──AT──▶ Venue (public places only)
   │
   ├──MEMBER_OF {organiser|invited|requested|accepted|declined}──▶ Plan
   ├──ATTENDED {confirmed_by}──▶ Plan
   └──REVIEWED {stars, tags, private}──▶ Person
```

`Ask` fields: `activity`, `place`, `radius_km`, `slots[]`, `have`, `seek`, `level`, `role` (learner/teacher), `raw_text`, `expires_at`.
`Plan` adds `venue`, `size`, `members[]`, `status` (open → full → happening → done, or cancelled) and `cloned_from` (for "run it again").

### Activity tags

Tags are a fixed, curated list so that asks can meet. Synonyms map to one tag (soccer and football become football). Each tag has a category (racquet sports, team sports, water…) used for "close" matches, and one of three families from the original notes: **Sports, Hobbies, Professional skills**. Words that don't match a tag go to a review queue and can become new tags. A banned list (sex, drugs, offensive terms) blocks the ask.

### Parsing: plain English to graph

The LLM only reads and writes language. Matching is a plain database query.

1. **Screen.** A cheap keyword pass plus a moderation check for banned topics and money talk.
2. **Extract.** One call to a small, fast model with a strict output schema: the five facets, with `activity` restricted to the tag list (or `unknown` plus the words it heard), and a confidence per field.
3. **Resolve in code.** Relative times ("next Thursday after work") are turned into real time slots by code using the user's timezone, not by the model. Suburbs are looked up in a gazetteer. Unknown activity words go through an embedding lookup ("pickle" → pickleball), and anything still unmatched goes to a tag review queue.
4. **Show guesses.** Low-confidence fields appear as dashed nodes the user can fix with one tap. Missing required fields are asked for.
5. **Store.** The ask is saved with edges to its activity, suburb and time slots.

While typing, a rule-based pass (like `engine.js` here) gives an instant preview, and the model runs on pause or submit.

For the MVP, Postgres is enough for "the graph": tag columns for activity, PostGIS for distance, `tstzrange` overlap for time, and pgvector for fuzzy tags. A graph database is only worth it later for social-graph questions ("people who've played with people you've played with").

### Matching

For each candidate ask or plan:

- **Activity**: same tag scores 1. Same category scores 0.5 and is marked "close". Otherwise there's no match.
- **Distance**: suburb centroid to suburb centroid. Within the radius it scores 1 to 0.6. Up to 1.5× the radius it is marked "close". Beyond that there's no match.
- **Time**: total overlap between the two sets of time slots. No overlap means no match.
- **Level**: 1 for the same level, falling with each step apart. A learner matched with a teacher scores 1.
- **Score** = 0.4 × activity + 0.25 × distance + 0.25 × time + 0.1 × level.

Each facet that matches becomes a "reason" chip on the card and an edge in the match graph.

**Suggested plan**: take the best exact matches until `seek` is filled, find the time slot everyone shares, and offer to send one plan to all of them. It's only shown when it gets you at least halfway there, or when there's no existing group to join.

**Learning from experience** (post-MVP): ratings feed back into ranking. People you rated well, and who rated you well, rank higher next time. Activities you actually turn up to get more weight than ones you only list.

## Onboarding agent

New members don't fill in forms. They talk to an agent, by voice or text, that asks one thing at a time:

1. First name
2. What they like doing or want to try
3. How they rate themselves at each ("pretty decent", "7 out of 10")
4. Home suburb and how far they'd travel
5. Age (only used to keep Keen 18+ and for optional age matching, never shown)
6. What they want from Keen: get fitter, make friends, learn something, compete, get outdoors, unwind
7. Anything to avoid: water sports, heights, alcohol, contact sports, late nights, early starts, big groups (private)
8. When they're usually free

The profile card above the chat fills in live and is the source of truth: every fact is visible and removable. Under-18s are stopped. Surname, phone, email and address are never asked.

The avoid list filters everything Keen suggests. "No alcohol" hides plans at licensed venues, "scared of heights" hides bouldering, and so on. The feed says how many plans were hidden and lets you show them.

**How it's built.** The agent has one tool, `update_profile`, whose fields are the fixed tag lists (activities, levels, suburbs, goals, avoids, availability), so it can't invent values. Each user turn, the model calls the tool with only the new facts, then speaks one short reply. The page decides what's still missing and passes `next_topic` back.

- **In this prototype:** on the published claude.ai page, the agent is Claude through the page's `sample` capability (on the viewer's own account, after they allow it). Opened from the repo, or if Claude isn't allowed, a scripted agent in `agent.js` asks the same questions with rule-based extraction. Voice uses the browser's speech recognition and speech synthesis where allowed. The claude.ai viewer blocks the microphone, so there you type, tap a reply, or use the keyboard's mic.
- **In the app:** streaming speech-to-text, then the same agent and tool, then text-to-speech, with barge-in so people can interrupt. Audio isn't stored, only the facts on the card.

## Posting and listing plans

You can browse events but never people. A plan is an ask made specific: a fixed start time, a public venue and spots to fill.

- **Posting.** The same ask box detects organiser phrasing (a fixed time, a named venue, "we're 4", "I've booked a court") and offers **Post as a plan** first. The compose screen asks for day, start time, duration, venue (from a list of public places, with licensed ones marked), spots, level, a note and whether you approve joins.
- **Who it reaches,** shown before posting:
  1. People with a matching open ask are told immediately.
  2. People who might be keen hear about it within their 3-a-week cap.
  3. It appears in **Happening near you** for people within their travel radius.
- **The feed** is ranked by interest match (0.4), how soon (0.2), level fit (0.15), how close to full (0.15) and the organiser's Goodwill (0.1). Tabs: For you, All nearby, This weekend.
- **Join requests** show the person's Goodwill, events and no-shows. Organisers accept or decline, and a declined person just sees "this plan is full".
- **Rules.** Notes are screened like chat (no contact details, no payment talk). Plans over 6 people need ID or 100+ Goodwill.
- **Later:** verified clubs and venues posting their open sessions, linking out to their own booking.

## Profiles and privacy

| Shown | Never shown |
| --- | --- |
| First name, photo | Surname |
| Suburb, rounded distance | Phone, email |
| | Age and avoid list (private, used only for filtering) |
| Interests and level | Address, live location |
| Goodwill, events attended, rating, no-shows | Age, employer |
| Verification badges | The documents behind them |
| Recent feedback (positive tags only) | Negative feedback (private, goes to review) |

Distance is measured between suburb centres and rounded, so it can't be used to work out where someone lives.

## Goodwill (reward points)

| Action | Points |
| --- | --- |
| Turn up to a plan, confirmed by another attendee | +50 |
| Organise a plan that goes ahead with 3 or more people | +100 |
| Leave feedback after a plan | +20 |
| Good review received (max 3 per plan) | +10 |
| Verify ID (once) | +100 |
| No-show reported by 2 or more attendees | −150 |

Levels: **New** from 0, **Regular** from 100, **Trusted** from 500, **Local legend** from 1,000.

Rules that stop it being gamed:

- Points can't be bought, transferred or spent.
- Attendance only counts when someone else who was there confirms it.
- Points between the same small group of accounts are capped (for example, after 3 plans together in 30 days), so a ring of fake accounts can't farm each other.
- Accounts made from the same device or phone range are linked, and their mutual confirmations don't count.

## Safety and anti-scam

Most scams on social and meetup apps follow the same steps: a fake or new profile, a fast move to another app, then money. The MVP blocks each step.

| Risk | Measure |
| --- | --- |
| Fake profiles | One account per verified mobile number, with VoIP and virtual numbers blocked. A real-photo check at sign-up. Optional ID verification shown as a badge. |
| New accounts doing damage fast | Under 100 Goodwill: join plans only, 3 invites a day, no organising plans for more than 6 people. |
| Moving off-platform | No 1:1 messages with people you haven't met. Group chat only. Phone numbers, emails, links, other app names and payment words are hidden until you've met once in a plan together. |
| Money | No money in the MVP. Asks about payments, loans, crypto or investing are blocked. Home-help jobs are out of scope because they combine money, an address and a stranger. |
| Physical safety | Plans happen at public venues from a list (courts, ovals, beaches, cafés). Home addresses are never shown. Organisers confirm join requests. |
| Harassment | One-tap report and block on every profile, plan and message. Two independent reports pause the account's plans pending review. |
| Spam reach-out | Each person receives at most 3 asks a week from Keen. Repeated or copy-pasted asks are rate-limited. |
| Behavioural signals | Account age, invite-acceptance rate, report rate, many asks across many suburbs, and the same message sent to many people all feed a risk score that can quietly limit reach. |

Later: share-my-plan with a trusted contact, check-in at the venue, and age verification (18+) for evening plans.

## MVP scope

**In:** onboarding conversation (voice and text), ask box and parser, editable intent graph, posting plans, the "Happening near you" feed with private avoid filters, join approvals, matching (asks, plans, might-be-keen reach-out), suggested plans, limited profiles, invite and join requests, plan page with group chat and contact masking, feedback, Goodwill, report and block, saved asks with reach-out stats, "run it again".

**Out (for now):** login (assume phone sign-in), photo and ID checks, calendar sync, payments, paid services and home help, 1:1 messaging, location tracking, check-ins, club and venue accounts.

## Open questions

1. **Cold start.** Matching needs density. Launch with one area and a few activities (for example padel, running and football on the Northern Beaches) before going wide?
2. **How wide to reach out.** How many might-be-keen people get an ask, and how fast do we escalate if nobody replies?
3. **Ask lifetime.** Is 7 days right? Recurring asks ("padel on Saturdays") probably need their own model.
4. **Group-only plans.** Should plans support "women only" or similar? It's useful for safety but needs verification to mean anything.
5. **Teaching and skills.** "Teach me to surf" works as a free activity. Where's the line before it becomes a paid service?
6. **Parser cost and speed.** One LLM call per ask is cheap, but the live preview as you type needs caching or a lightweight first pass.

## Files

```
demo-activity-matching/
├── index.html   # Page shell: phone frame and notes column
├── styles.css   # Tokens (light and dark) and components
├── data.js        # Tags, venues (with directions), suburbs, mock people, asks, events, history, threads
├── engine.js      # Parser, matching, event scoring, search, browse, feed ranking, screening (pure, runs in Node)
├── agent.js       # Onboarding agent: topics, extraction, scripted replies, Claude prompt and tool schema (pure)
├── app.js         # Core screens (ask, matches, profiles, Me), navigation, sheets, design notes
├── plans.js       # Creating events and organiser join requests
├── event.js       # Event page, joining and leaving, check-in, roll call, threads, Plans tab, history
├── explore.js     # Explore: recommendations, browse and search
├── onboarding.js  # Onboarding screen, Claude and voice wiring
├── img/           # Demo photos: people/<id>.jpg and acts/<activity>.jpg
├── profile.js     # Profile fields, profile screens, Profile data editor
├── MODEL.md       # Data model and lifecycle spec
├── schema.sql     # Postgres schema
└── README.md
```

`engine.js` and `agent.js` have no DOM code. You can try them from Node:

```
node -e "const e=require('./engine.js'); console.log(e.parseIntent('football friday manly looking for 7'))"
node -e "const a=require('./agent.js'), p=a.emptyProfile(); for (const t of ['Sam','padel, pretty decent','Manly 5km']) console.log(a.scriptedTurn(p,t).reply)"
```
