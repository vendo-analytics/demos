// Onboarding agent: a short conversation that fills in the profile.
// Two brains share this file's topic list and profile shape:
//  - scripted: rule-based extraction + fixed questions (works anywhere, offline)
//  - Claude: the same questions asked by a model that calls `update_profile` (see app.js)
// Pure functions, no DOM.

if (typeof module !== 'undefined') {
  Object.assign(globalThis, require('./data.js'), require('./engine.js'));
}

const AVOID_ACK = { water: 'no water sports', heights: 'nothing high up', alcohol: 'no alcohol', contact: 'no contact sports', late: 'no late nights', early: 'no early starts', big: 'smaller groups' };
const LEVEL_LABEL = Object.fromEntries(SKILL_LEVELS.map((l) => [l.id, l.label]));

function emptyProfile() {
  return { name: null, activities: [], suburb: null, radius: null, age: null, ageSkipped: false, goals: [], avoid: [], avoidDone: false, free: [], freeDone: false };
}

// The order the agent works through. Each topic is asked once; answers can fill later topics early.
function nextTopic(p) {
  if (p.under18) return 'blocked';
  if (!p.name) return 'name';
  if (!p.activities.length) return 'activities';
  const unrated = p.activities.find((a) => !a.level);
  if (unrated) return 'level:' + unrated.id;
  if (!p.suburb) return 'area';
  if (p.age == null && !p.ageSkipped) return 'age';
  if (!p.goals.length) return 'goals';
  if (!p.avoidDone) return 'avoid';
  if (!p.free.length && !p.freeDone) return 'free';
  return 'done';
}

const TOPIC_COUNT = 7;
function progress(p) {
  return [!!p.name, p.activities.length > 0 && p.activities.every((a) => a.level), !!p.suburb, p.age != null || p.ageSkipped, p.goals.length > 0, p.avoidDone, p.free.length > 0 || p.freeDone].filter(Boolean).length;
}

// Quick replies for the current topic, so nobody has to type on a phone.
function quickReplies(topic, p) {
  if (topic === 'name') return [];
  if (topic === 'activities') return ['Padel and running', 'Football', 'Surfing, but I\'m new', 'Board games', 'Bushwalks and photography'];
  if (topic.startsWith('level:')) return ['Never tried it', 'Beginner', 'Casual', 'Intermediate', 'Competitive'];
  if (topic === 'area') return ['Manly, up to 5 km', 'Mosman, 10 km', 'Bondi', 'Anywhere in Sydney'];
  if (topic === 'age') return ['Rather not say'];
  if (topic === 'goals') return ['Meet new people', 'Get fitter', 'Learn something new', 'Compete', 'Get outdoors'];
  if (topic === 'avoid') return ['Nothing really', 'No alcohol', 'Not water sports', "I'm scared of heights", 'No late nights'];
  if (topic === 'free') return ['Weekends', 'Weekday evenings', 'Before work', 'Pretty flexible'];
  return [];
}

function question(topic, p) {
  const act = topic.startsWith('level:') ? ACT[topic.slice(6)] : null;
  switch (topic) {
    case 'name': return "Hi, I'm Keen's guide. I'll ask a few quick questions so I can find you the right people. It takes about two minutes, and you can talk or type. First, what should people call you? Your first name is plenty.";
    case 'activities': return `Nice to meet you, ${p.name}. What do you like doing, or want to start doing? Sports, hobbies, anything goes.`;
    case 'area': return 'Where are you based, and how far would you travel for a game?';
    case 'age': return "How old are you? It's only used to keep Keen 18+ and to match similar ages if you want. It never shows on your profile.";
    case 'goals': return 'What are you hoping to get out of Keen? Getting fitter, meeting new people, learning something, competing? This stays private and just tunes what I suggest.';
    case 'avoid': return "Anything you'd rather avoid? Water sports, heights, alcohol, late nights. This stays private. We just won't suggest those.";
    case 'free': return 'Last one. When are you usually free?';
    case 'done': return "That's everything. Here's your profile. Change anything that's off, then you're in.";
    case 'blocked': return "Thanks for being honest. Keen is 18+ for now, so I can't set up a profile yet. We'd love to have you when you're 18.";
    default: return `How would you rate yourself at ${act.label.toLowerCase()}? Beginner, casual, intermediate or competitive. Plain words are fine too.`;
  }
}

// ---------- extraction (scripted brain) ----------

const norm = (text) => ' ' + text.toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z0-9'/ \-]/g, ' ').replace(/\s+/g, ' ') + ' ';
const has = (t, w) => wordRe(w).test(t);

function levelFrom(t) {
  const r = t.match(/\b(\d{1,2})\s*(?:\/|out of)\s*(10|5)\b/);
  if (r) {
    const x = (+r[1] / +r[2]) * 10;
    return x <= 3 ? 'beginner' : x <= 5 ? 'casual' : x <= 7.5 ? 'intermediate' : 'competitive';
  }
  if (/\b(never|new to|not tried|haven't tried|first time|learning|learner|beginner|newbie|rubbish|terrible|bad at|not very good|i'm new|im new|i am new|but new|i'm rusty|rusty)\b/.test(t)) return 'beginner';
  if (/\b(competitive|advanced|very good|really good|strong|played for years|state|club level|a level|serious)\b/.test(t)) return 'competitive';
  if (/\b(decent|pretty good|good|solid|intermediate|alright|can hold my own|above average)\b/.test(t)) return 'intermediate';
  if (/\b(social|casual|okay|ok|average|so so|for fun|just for fun|not bad|relaxed)\b/.test(t)) return 'casual';
  return null;
}

function activitiesFrom(t) {
  const found = [];
  const synonyms = ACTIVITIES.filter((a) => a.cat !== 'service').flatMap((a) => a.words.map((w) => [w, a])).sort((x, y) => y[0].length - x[0].length);
  let rest = t;
  for (const [w, a] of synonyms) {
    if (wordRe(w).test(rest)) {
      if (!found.includes(a.id)) found.push(a.id);
      rest = rest.replace(wordRe(w), ' ');
    }
  }
  return found;
}

function negated(t) {
  return /\b(no|not|don't|dont|do not|never|avoid|hate|scared|afraid|can't|cant|rather not|without|nothing with)\b/.test(t);
}

// Read one answer. Returns the facts found; the caller merges them into the profile.
function extract(text, topic, p) {
  const t = norm(text);
  const out = {};

  if (topic === 'name') {
    const m = text.match(/(?:i'm|i am|call me|name is|name's|it's|its)\s+([A-Za-zÀ-ÿ'-]{2,20})/i) || text.trim().match(/^([A-Za-zÀ-ÿ'-]{2,20})\b/);
    if (m && !/^(hi|hey|hello|yes|no|ok|okay|sure)$/i.test(m[1])) out.name = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
    return out;
  }

  // skip / none answers
  const none = /\b(nothing|none|nope|no thanks|not really|all good|nah|anything goes|i'm easy|im easy)\b/.test(t) || /^\s*no\s*$/.test(t);
  if (topic === 'age' && /\b(rather not|prefer not|skip|pass|not saying)\b/.test(t)) out.ageSkipped = true;
  if (topic === 'avoid' && none) out.avoidDone = true;
  if (topic === 'free' && /\b(flexible|anytime|any time|whenever|depends)\b/.test(t)) out.free = AVAILABILITY.map((a) => a.id);

  // activities (not while talking about things to avoid)
  if (topic !== 'avoid') {
    const acts = activitiesFrom(t);
    if (acts.length) {
      const lvl = levelFrom(t);
      out.activities = acts.map((id) => ({ id, level: acts.length === 1 ? lvl : null }));
      // "padel (decent) and surfing (new)": per-activity levels from nearby words
      if (acts.length > 1) {
        const parts = text.toLowerCase().split(/,|;|\band\b|\.|\bplus\b/).map(norm);
        out.activities = acts.map((id) => {
          const part = parts.find((s) => ACT[id].words.some((w) => wordRe(w).test(s)));
          return { id, level: part ? levelFrom(part) : null };
        });
      }
    }
  }
  if (topic.startsWith('level:')) {
    const lvl = levelFrom(t) || (/\b(never|no)\b/.test(t) ? 'beginner' : null);
    if (lvl) out.level = { id: topic.slice(6), level: lvl };
  }

  // area
  const byLength = [...PLACES].sort((a, b) => b.name.length - a.name.length);
  const place = byLength.find((pl) => [pl.name.toLowerCase(), ...(pl.alias || [])].some((n) => has(t, n)));
  if (place) out.suburb = place.name;
  const r = t.match(/\b(\d{1,2})\s*(?:km|kms|k|kilometres|kilometers)\b/);
  if (r) out.radius = Math.min(50, Math.max(1, +r[1]));
  else if (/\b(anywhere|don't mind|dont mind|happy to travel|all over)\b/.test(t)) out.radius = 25;
  else if (/\b(not far|walking distance|close|nearby|local)\b/.test(t) && (topic === 'area' || place)) out.radius = 3;
  if (topic === 'area' && !place && /\b(anywhere in sydney|sydney)\b/.test(t)) { out.suburb = ME.suburb; out.radius = 25; }

  // age
  if (topic === 'age' || /\b(years old|yo|y\/o|i'm \d{2}|im \d{2})\b/.test(t)) {
    const a = t.match(/\b(\d{2})\b/);
    const decade = t.match(/\b(twenties|thirties|forties|fifties|sixties)\b/);
    if (a) out.age = +a[1];
    else if (decade) out.age = { twenties: 25, thirties: 35, forties: 45, fifties: 55, sixties: 65 }[decade[1]];
  }

  // goals
  const goals = GOALS.filter((g) => g.words.some((w) => has(t, w))).map((g) => g.id);
  if (goals.length && (topic === 'goals' || topic === 'done')) out.goals = goals;

  // avoid: on the avoid question, or anywhere it's clearly negated ("I hate the water")
  if (topic === 'avoid' || negated(t)) {
    const avoid = AVOIDS.filter((a) => a.words.some((w) => has(t, w))).map((a) => a.id);
    if (avoid.length) { out.avoid = avoid; out.avoidDone = true; }
  }

  // availability
  if (topic === 'free' || topic === 'done') {
    const free = new Set(out.free || []);
    for (const clause of text.toLowerCase().split(/,|;|\band\b|\bor\b|\bplus\b/).map(norm)) addFree(clause, free);
    if (free.size) out.free = [...free];
    else if (topic === 'free' && none) out.freeDone = true;
  }
  return out;
}

function addFree(t, free) {
  {
    const weekend = /\b(weekend|weekends|saturday|saturdays|sunday|sundays|sat|sun)\b/.test(t);
    const weekday = /\b(weekday|weekdays|weeknight|weeknights|monday|tuesday|wednesday|thursday|friday)\b/.test(t);
    const morning = /\b(morning|mornings|before work|early|sunrise)\b/.test(t);
    const evening = /\b(evening|evenings|after work|night|nights|arvo|afternoon|afternoons)\b/.test(t);
    if (weekend && !morning && !evening) { free.add('we-am'); free.add('we-pm'); }
    if (weekend && morning) free.add('we-am');
    if (weekend && evening) free.add('we-pm');
    if ((weekday || !weekend) && morning) free.add('wd-am');
    if ((weekday || !weekend) && evening) free.add('wd-pm');
    if (weekday && !morning && !evening) { free.add('wd-am'); free.add('wd-pm'); }
  }
}

// Merge facts into the profile. Returns a short list of what changed, for the agent to acknowledge.
function applyFacts(p, f) {
  const said = [];
  if (f.name) { p.name = f.name; }
  if (f.activities) {
    const added = [];
    for (const a of f.activities) {
      if (!ACT[a.id]) continue;
      const cur = p.activities.find((x) => x.id === a.id);
      if (cur) { if (a.level) cur.level = a.level; } else { const level = SKILLS.includes(a.level) ? a.level : null; p.activities.push({ id: a.id, level }); added.push(ACT[a.id].label.toLowerCase() + (level ? ` (${LEVEL_LABEL[level].toLowerCase()})` : '')); }
    }
    if (added.length) said.push(listify(added));
  }
  if (f.level && SKILLS.includes(f.level.level)) {
    const cur = p.activities.find((x) => x.id === f.level.id);
    if (cur) { cur.level = f.level.level; said.push(`${LEVEL_LABEL[cur.level].toLowerCase()} at ${ACT[cur.id].label.toLowerCase()}`); }
  }
  if (f.suburb && PLACE[f.suburb]) { p.suburb = f.suburb; said.push(f.suburb); }
  if (f.radius) { p.radius = f.radius; said.push(`within ${f.radius} km`); }
  if (f.age != null) {
    if (f.age < 18) { said.push('under 18'); p.ageSkipped = true; p.under18 = true; }
    else if (f.age <= 99) { p.age = f.age; said.push('age noted, kept private'); }
  }
  if (f.ageSkipped) { p.ageSkipped = true; }
  if (f.goals) { for (const g of f.goals) if (!p.goals.includes(g) && GOALS.some((x) => x.id === g)) p.goals.push(g); if (f.goals.length) said.push(listify(f.goals.map((g) => GOALS.find((x) => x.id === g)?.label.toLowerCase()).filter(Boolean))); }
  if (f.avoid) { for (const a of f.avoid) if (!p.avoid.includes(a) && AVOIDS.some((x) => x.id === a)) p.avoid.push(a); said.push(listify(f.avoid.map((a) => AVOID_ACK[a]).filter(Boolean))); }
  if (f.avoidDone) p.avoidDone = true;
  if (f.free) { p.free = [...new Set([...p.free, ...f.free.filter((x) => AVAILABILITY.some((a) => a.id === x))])]; said.push(listify(f.free.map((x) => AVAILABILITY.find((a) => a.id === x)?.label.toLowerCase()).filter(Boolean))); }
  if (f.freeDone) p.freeDone = true;
  if (!p.radius && p.suburb) p.radius = 10;
  return said;
}

function listify(xs) {
  if (xs.length <= 1) return xs.join('');
  return xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
}

// The scripted agent's whole turn: read the answer, update the profile, say the next thing.
function scriptedTurn(p, text) {
  const topic = nextTopic(p);
  const facts = extract(text, topic, p);
  const said = applyFacts(p, facts);
  const next = nextTopic(p);
  let ack = '';
  if (next === 'blocked') return { reply: question(next, p), topic: next };
  if (topic === 'name' && p.name) ack = '';
  else if (facts.ageSkipped) ack = 'No problem. ';
  else if (topic === 'avoid' && p.avoidDone && !said.length) ack = 'Good to know. ';
  else if (said.length) ack = `Got it: ${said.join(', ')}. `;
  else if (next === topic) ack = topic === 'name' ? "Sorry, I didn't catch a name. " : "Sorry, I didn't catch that. Tap one of the options or say it another way. ";
  if (topic === 'activities' && p.activities.length && p.activities.length > 3) ack += "That's a lot of good stuff. ";
  return { reply: ack + question(next, p), topic: next };
}

// ---------- Claude brain: prompt and tool definitions ----------

function agentRules() {
  return `You are Keen's onboarding guide, talking with a new member of Keen, an app that matches people who want to do the same activities nearby. This is a voice-first conversation: keep every reply to one or two short spoken sentences, warm and plain, Australian English, no lists, no emoji, no markdown.

Your job is to fill in their profile by asking ONE question at a time, in this order, skipping anything already known: first name; activities they like or want to try; how they rate themselves at each activity; home suburb and how far they'd travel; age (explain it only keeps Keen 18+ and is never shown); what they want from Keen (goals); anything they'd rather avoid (private, only used to filter); when they're usually free.

Whenever the person tells you something, call update_profile with ONLY the new facts, mapped to the allowed ids, BEFORE writing your reply. Write nothing before the tool call. Then briefly acknowledge what you understood and ask the next question. The tool result tells you the next topic: follow it. If the next topic is "done", say a one-sentence wrap-up and ask them to check the profile card.

Map loosely: "decent"/"pretty good" means intermediate, "social"/"for fun" means casual, "new"/"never tried" means beginner, "serious"/"played for years" means competitive. A rating like 6/10 is intermediate. If they say they're under 18, explain kindly that Keen is 18+ for now and stop. Never ask for surname, phone, email or address. If they ask something off-topic, answer in a sentence and steer back.`;
}

function toolSchema() {
  return {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'First name only' },
      activities: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', enum: ACTIVITIES.filter((a) => a.cat !== 'service').map((a) => a.id) },
            level: { type: 'string', enum: SKILLS },
          },
          required: ['id'],
        },
      },
      suburb: { type: 'string', enum: PLACES.map((p) => p.name) },
      radius_km: { type: 'number' },
      age: { type: 'number' },
      age_skipped: { type: 'boolean' },
      goals: { type: 'array', items: { type: 'string', enum: GOALS.map((g) => g.id) } },
      avoid: { type: 'array', items: { type: 'string', enum: AVOIDS.map((a) => a.id) }, description: 'Things to never suggest. Use [] with avoid_none if they have nothing to avoid.' },
      avoid_none: { type: 'boolean' },
      free: { type: 'array', items: { type: 'string', enum: AVAILABILITY.map((a) => a.id) }, description: 'wd = weekday, we = weekend, am = morning, pm = afternoon/evening' },
    },
  };
}

// Turn the tool input into the same facts shape the scripted brain produces.
function factsFromTool(input) {
  const f = {};
  if (input.name) f.name = String(input.name).split(/\s+/)[0].slice(0, 20);
  if (Array.isArray(input.activities)) f.activities = input.activities.map((a) => ({ id: String(a.id), level: a.level ? String(a.level) : null }));
  if (input.suburb) f.suburb = String(input.suburb);
  if (input.radius_km) f.radius = Math.min(50, Math.max(1, Number(input.radius_km)));
  if (input.age != null && !isNaN(Number(input.age))) f.age = Number(input.age);
  if (input.age_skipped) f.ageSkipped = true;
  if (Array.isArray(input.goals)) f.goals = input.goals.map(String);
  if (Array.isArray(input.avoid) && input.avoid.length) { f.avoid = input.avoid.map(String); f.avoidDone = true; }
  if (input.avoid_none) f.avoidDone = true;
  if (Array.isArray(input.free)) f.free = input.free.map(String);
  return f;
}

function profileForPrompt(p) {
  return JSON.stringify({
    name: p.name, activities: p.activities, suburb: p.suburb, radius_km: p.radius, age: p.age, age_skipped: p.ageSkipped,
    goals: p.goals, avoid: p.avoid, avoid_answered: p.avoidDone, free: p.free, next_topic: nextTopic(p),
  });
}

if (typeof module !== 'undefined') {
  module.exports = { emptyProfile, nextTopic, progress, quickReplies, question, extract, applyFacts, scriptedTurn, agentRules, toolSchema, factsFromTool, profileForPrompt, LEVEL_LABEL, TOPIC_COUNT };
}
