# Keen: activity matching MVP

A clickable prototype of the core loop of a mobile app that connects people who want to do the same thing.
You say what you want to do in plain English ("padel Saturday morning, we're two looking for two more").
Keen turns that into a small graph, finds people and groups who fit, and reaches out to people who might be keen.

"Keen" is a working name ("who's keen for padel?"). Everything in the demo data is invented.

Open `index.html` in a browser. There's no build step. The right-hand column has design notes for the
current screen and "Jump to" buttons for each flow.

## What the prototype covers

| Flow | What to try |
| --- | --- |
| Ask | Type anything, or tap an example. Watch the graph fill in. Tap a node to correct it. |
| Matches | Groups to join, people keen right now, a suggested plan that combines individuals, and the "might be keen" reach-out. |
| No match | "Board games in Newtown tonight": the ask is saved and passed on, with a "widen radius" option. |
| Blocked ask | "Fix my sink this weekend", or anything about money or sex. |
| Profile | What other people can and can't see. Report and block. |
| Group plan | Join request, members, safety notice, group chat. Type a phone number into the chat to see it hidden. |
| Feedback | Rate the plan, confirm who came, tag people. Earns Goodwill. |
| Goodwill | Points, levels, how to earn them, trust badges. |

Login, onboarding and calendar sync are deliberately out of scope.

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

### Parsing

In the prototype, `engine.js` uses rules so it runs offline. In production this would be one LLM call with a strict output schema (the same shape as `parseIntent` returns), validated against the tag list and suburb list, and followed by the same screening. If the parser is unsure about a facet, it marks it as a guess and the UI shows it dashed.

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

## Profiles and privacy

| Shown | Never shown |
| --- | --- |
| First name, photo | Surname |
| Suburb, rounded distance | Phone, email |
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

**In:** ask box and parser, editable intent graph, matching (asks, plans, might-be-keen reach-out), suggested plans, limited profiles, invite and join requests, plan page with group chat and contact masking, feedback, Goodwill, report and block, saved asks with reach-out stats, "run it again".

**Out (for now):** login and onboarding (assume phone sign-in), calendar sync, payments, paid services and home help, 1:1 messaging, a recommendations feed, location tracking, check-ins.

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
├── data.js      # Activity tags, suburbs, mock people, asks, plans
├── engine.js    # parseIntent, match, screenMessage, Goodwill levels (pure, runs in Node too)
├── app.js       # Screens, navigation, sheets, design notes
└── README.md
```

`engine.js` has no DOM code. You can try the parser from Node:

```
node -e "const e=require('./engine.js'); console.log(e.parseIntent('football friday manly looking for 7'))"
```
