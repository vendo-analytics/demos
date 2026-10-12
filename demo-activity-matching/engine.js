// Intent parsing and matching for the Keen prototype. Pure functions, no DOM.
// In production the parser would be an LLM call that returns the same intent shape;
// this rule-based version exists so the prototype runs offline and predictably.

if (typeof module !== 'undefined') {
  Object.assign(globalThis, require('./data.js'));
}

const ACT = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a]));
const PLACE = Object.fromEntries(PLACES.map((p) => [p.name, p]));
const PERSON = Object.fromEntries([ME, ...PEOPLE, ...FRIENDS].map((p) => [p.id, p]));
const SKILLS = ['beginner', 'casual', 'intermediate', 'competitive'];
const DEFAULT_RADIUS_KM = 5;

// ---------- small helpers ----------

const NUMBER_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, couple: 2 };
const toNum = (w) => (w == null ? null : /^\d+$/.test(w) ? +w : NUMBER_WORDS[w] ?? null);
const wordRe = (w) => new RegExp('(^|[^a-z0-9])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const DOW = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DOW_ABBR = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6 };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const at = (day, h) => { const x = new Date(day); x.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0); return x; };
const nextDow = (now, dow) => addDays(startOfDay(now), (dow - startOfDay(now).getDay() + 7) % 7);

function fmtDay(d, now = new Date()) {
  const diff = Math.round((startOfDay(d) - startOfDay(now)) / 864e5);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${DOW[d.getDay()].slice(0, 3).replace(/^./, (c) => c.toUpperCase())} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function fmtHour(h, withSuffix = true) {
  const hh = Math.floor(h), mm = Math.round((h % 1) * 60);
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}${mm ? ':' + String(mm).padStart(2, '0') : ''}${withSuffix ? (hh < 12 ? 'am' : 'pm') : ''}`;
}

function fmtRange(a, b) {
  const sameHalf = (a < 12) === (b < 12);
  return `${fmtHour(a, !sameHalf)}–${fmtHour(b)}`;
}

function fmtSlot(s, now) {
  const h = (d) => d.getHours() + d.getMinutes() / 60;
  return `${fmtDay(s.start, now)} ${fmtRange(h(s.start), h(s.end))}`;
}

function km(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Mock windows are written as [day, from, to]: 'sat', '+3' (days from today) or '-fri' (last Friday).
function resolveWhen([day, from, to], now = new Date()) {
  if (day === 'now') return [{ start: new Date(+now + from * 36e5), end: new Date(+now + to * 36e5) }];
  let d;
  if (/^[+-]\d+$/.test(day)) d = addDays(startOfDay(now), +day);
  else if (day.startsWith('-')) d = addDays(nextDow(now, DOW_ABBR[day.slice(1)]), -7);
  else {
    d = nextDow(now, DOW_ABBR[day]);
    if (at(d, to) <= now) d = addDays(d, 7); // today's session is already over: next week's
  }
  return [{ start: at(d, from), end: at(d, to) }];
}

// ---------- parsing ----------

const BANNED = ['sex', 'sexy', 'hookup', 'hook up', 'nsfw', 'nude', 'nudes', 'escort', 'drugs', 'weed', 'coke'];
const MONEY = ['money', 'cash', 'pay me', 'paypal', 'invest', 'investment', 'crypto', 'bitcoin', 'loan', 'gift card', 'forex'];

const PARTS = [
  { re: /\b(sunrise|dawn|early morning)\b/, from: 5.5, to: 8, label: 'early' },
  { re: /\bbefore work\b/, from: 6, to: 8.5, label: 'before work' },
  { re: /\bafter work\b/, from: 17.5, to: 20.5, label: 'after work' },
  { re: /\bmornings?\b/, from: 6, to: 12, label: 'morning' },
  { re: /\blunch(time)?\b/, from: 12, to: 14, label: 'lunch' },
  { re: /\b(afternoons?|arvo)\b/, from: 12, to: 17, label: 'afternoon' },
  { re: /\bevenings?\b/, from: 17, to: 21, label: 'evening' },
  { re: /\b(tonight|nights?)\b/, from: 18, to: 23, label: 'night' },
  { re: /\ball day\b/, from: 7, to: 20, label: 'all day' },
];

function to24(h, m, suffix) {
  let x = +h + (m ? +m / 60 : 0);
  if (suffix === 'pm' && x < 12) x += 12;
  if (suffix === 'am' && x >= 12) x -= 12;
  return x;
}

// Returns { slots: [{start, end}], label, assumed }.
function parseTime(text, now = new Date()) {
  let t = text;
  const today = startOfDay(now);
  let days = null, dayLabel = null, recurring = false, byWeekday = false;

  // dd/mm dates, optionally a range (Australian order)
  const dm = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\s*(?:-|–|to)\s*(\d{1,2})\/(\d{1,2}))?\b/);
  if (dm) {
    const mk = (d, m) => { let x = new Date(now.getFullYear(), +m - 1, +d); if (x < today) x = new Date(now.getFullYear() + 1, +m - 1, +d); return x; };
    const a = mk(dm[1], dm[2]), b = dm[3] ? mk(dm[3], dm[4]) : a;
    days = [];
    for (let d = a; d <= b && days.length < 14; d = addDays(d, 1)) days.push(d);
    dayLabel = days.length > 1 ? `${fmtDay(a, now)} – ${fmtDay(b, now)}` : fmtDay(a, now);
    t = t.replace(dm[0], ' ');
  }

  if (!days) {
    if (/\b(today|tonight)\b/.test(t)) { days = [today]; dayLabel = 'Today'; }
    else if (/\b(tomorrow|tmrw)\b/.test(t)) { days = [addDays(today, 1)]; dayLabel = 'Tomorrow'; }
    else if (/\bnext week\b/.test(t)) {
      const mon = addDays(nextDow(now, 1), today.getDay() === 1 ? 7 : 0);
      days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(mon, i)); dayLabel = 'Next week';
    } else if (/\bweekend\b/.test(t)) {
      const dow = today.getDay();
      days = dow === 0 ? [today] : dow === 6 ? [today, addDays(today, 1)] : [nextDow(now, 6), addDays(nextDow(now, 6), 1)];
      // Sunday evening: this weekend is effectively over, so mean the next one
      if (dow === 0 && now.getHours() >= 18) days = [addDays(today, 6), addDays(today, 7)];
      if (/\bnext weekend\b/.test(t) && dow !== 0 && dow !== 6) days = days.map((d) => addDays(d, 7));
      if (/\bnext weekend\b/.test(t) && (dow === 0 || dow === 6)) days = [nextDow(addDays(now, 1), 6), addDays(nextDow(addDays(now, 1), 6), 1)];
      dayLabel = /\bnext weekend\b/.test(t) ? 'Next weekend' : 'This weekend';
    } else if (/\bweeknights?\b|\bweekdays?\b/.test(t)) {
      days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(today, i)).filter((d) => d.getDay() % 6 !== 0);
      dayLabel = /night/.test(t) ? 'Weeknights' : 'Weekdays';
    } else {
      const m = t.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|mon|tues?|wed|thu(?:rs?)?|fri|sat)(s)?\b/);
      if (m) {
        const dow = DOW.indexOf(m[1]) >= 0 ? DOW.indexOf(m[1]) : DOW_ABBR[m[1]];
        recurring = !!m[2];
        days = [nextDow(now, dow)];
        byWeekday = true;
        dayLabel = recurring ? `${cap(DOW[dow])}s` : null;
      }
    }
  }

  // hours: explicit range, single time, or part of day
  let from = null, to = null, hourLabel = null, exact = false;
  const range = t.match(/\b(from |between )?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\s*(?:-|–|to|till|until|and)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\b/);
  if (range && (range[1] || range[3] || range[4] || range[6] || range[7])) {
    const endSuffix = range[7], startSuffix = range[4] || (endSuffix && +range[2] <= +range[5] ? endSuffix : null);
    from = to24(range[2], range[3], startSuffix);
    to = to24(range[5], range[6], endSuffix);
    if (to <= from) to = from + 1.5;
  } else {
    const single = t.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/) || t.match(/\b(\d{1,2}):(\d{2})\b/);
    if (single) { from = to24(single[1], single[2], single[3]); to = from + 2; }
  }
  if (from != null) { hourLabel = fmtRange(from, to); exact = true; }
  else {
    const part = PARTS.find((p) => p.re.test(t));
    if (part) { from = part.from; to = part.to; hourLabel = part.label; }
  }

  let assumed = false;
  if (!days) {
    if (exact) {
      // a clock time with no day: today if it hasn't passed, else tomorrow
      days = [at(today, to) > now ? today : addDays(today, 1)];
      dayLabel = fmtDay(days[0], now);
    } else if (from != null) {
      // a part of the day with no day ("before work", "mornings") is a habit, not a date: the next 7 days
      days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(today, i));
      dayLabel = 'Next 7 days';
    } else {
      days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(today, i));
      dayLabel = 'Next 7 days';
      assumed = true;
    }
  }
  const anyHour = from == null;
  if (anyHour) { from = 7; to = 21; hourLabel = days.length === 1 ? 'any time' : null; }
  // "Sunday 8am" said on Sunday evening means next Sunday
  if (byWeekday && at(days[0], to) <= now) days = [addDays(days[0], 7)];
  if (byWeekday && !dayLabel) dayLabel = fmtDay(days[0], now);

  const slots = days.map((d) => ({ start: at(d, from), end: at(d, to) })).filter((s) => s.end > now);
  const label = [dayLabel, hourLabel].filter(Boolean).join(' · ');
  return { slots: slots.length ? slots : days.map((d) => ({ start: at(d, from), end: at(d, to) })), label, assumed, recurring, exact, anyHour, from, to };
}

function parseParty(t, act) {
  let have = 1, seek = null;
  let m;
  if ((m = t.match(/\bwe(?:'re| are)\s+(\w+)\b/)) && toNum(m[1])) have = toNum(m[1]);
  else if ((m = t.match(/\b(\w+) of us\b/)) && toNum(m[1])) have = toNum(m[1]);
  else if ((m = t.match(/\bme and (\w+) (?:friends|mates|others)\b/)) && toNum(m[1])) have = toNum(m[1]) + 1;
  else if (/\bme and (?:a|my) (?:friend|mate|partner|wife|husband|brother|sister|kid|son|daughter)\b/.test(t)) have = 2;
  else if ((m = t.match(/\b(?:group|team) of (\w+)\b/)) && toNum(m[1])) have = toNum(m[1]);

  m = t.match(/\b(?:looking for|need|needs|after|want)\s+(?:another\s+)?(\w+)\s*(?:more\s+)?(?:people|players|others|more|mates|ppl|person|player|guys|girls)?\b/);
  if (m && toNum(m[1]) && !/^(a|an)$/.test(m[1])) seek = toNum(m[1]);
  else if (/\b(a|another) (partner|buddy|fourth|4th|third|3rd|player|person)\b/.test(t)) seek = 1;

  const assumed = seek == null;
  if (seek == null) seek = Math.max(1, (act ? act.size : 2) - have);
  return { have, seek, assumed };
}

function parseIntent(raw, home = ME.suburb, now = new Date()) {
  const t = ' ' + raw.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ') + ' ';
  const flags = [];
  for (const w of BANNED) if (wordRe(w).test(t)) { flags.push({ type: 'banned', word: w }); break; }
  for (const w of MONEY) if (wordRe(w).test(t)) { flags.push({ type: 'money', word: w }); break; }

  // activity: longest synonym wins, so "beach volleyball" beats "volleyball"
  let activity = null;
  const synonyms = ACTIVITIES.flatMap((a) => a.words.map((w) => [w, a])).sort((x, y) => y[0].length - x[0].length);
  for (const [w, a] of synonyms) if (wordRe(w).test(t)) { activity = { ...a, heard: w }; break; }
  if (activity && activity.cat === 'service') flags.push({ type: 'service' });

  // place
  let place = { name: home, radius: DEFAULT_RADIUS_KM, assumed: true, remote: false };
  if (/\b(online|remote|video call|zoom)\b/.test(t)) place = { name: 'Online', radius: 0, assumed: false, remote: true };
  else {
    const byLength = [...PLACES].sort((a, b) => b.name.length - a.name.length);
    for (const p of byLength) {
      if ([p.name.toLowerCase(), ...(p.alias || [])].some((n) => wordRe(n).test(t))) { place = { name: p.name, radius: DEFAULT_RADIUS_KM, assumed: false, remote: false }; break; }
    }
    if (place.assumed && /\b(near me|nearby|around here|local)\b/.test(t)) place.assumed = false;
    const r = t.match(/\bwithin\s+(\d+)\s*(?:km|kms|k)\b/) || t.match(/\b(\d+)\s*km\b/);
    if (r) { place.radius = Math.min(50, Math.max(1, +r[1])); place.radiusSet = true; }
  }

  const time = parseTime(t, now);
  const party = parseParty(t, activity);

  let skill = null;
  if (/\b(beginners?|newbie|new to|never played|learning|learn|lessons?)\b/.test(t)) skill = 'beginner';
  else if (/\b(casual|social|relaxed|any level|all levels|chill)\b/.test(t)) skill = 'casual';
  else if (/\bintermediate\b/.test(t)) skill = 'intermediate';
  else if (/\b(advanced|competitive|serious)\b/.test(t)) skill = 'competitive';

  let role = null;
  if (/\b(teach me|show me how|coach me|learn to|learn how)\b/.test(t)) { role = 'learner'; skill = skill || 'beginner'; }
  else if (/\b(i can teach|happy to teach|i'll teach|i can coach)\b/.test(t)) role = 'teacher';

  const missing = [];
  if (!activity) missing.push('what');
  if (time.assumed) missing.push('when');

  // Does this read like someone organising an event rather than looking for one?
  const venue = VENUES.find((v) => wordRe(v.name.toLowerCase().split(',')[0]).test(t)) || null;
  const organiser = /\b(organis|organiz|i'm running|im running|we're running|hosting|i've booked|we've booked|booked a|got a court|have a court|my team|our team)/.test(t);
  const eventLike = organiser || !!venue || (party.have > 1 && time.exact) || (time.exact && !party.assumed);

  return { raw, activity, place, time, party, skill, role, flags, missing, venue, organiser, eventLike };
}

// ---------- matching ----------

// Score how well someone else's ask or plan fits ours. Returns null when it is not a fit.
// Each reason is tied to a graph facet so the UI can draw the edge.
function scoreFit(intent, other, now = new Date()) {
  const reasons = [];
  const otherAct = ACT[other.act];
  let a;
  if (other.act === intent.activity.id) { a = 1; reasons.push({ key: 'what', ok: true, text: otherAct.label }); }
  else if (otherAct.cat === intent.activity.cat && otherAct.cat !== 'service') { a = 0.5; reasons.push({ key: 'what', ok: false, text: `${otherAct.label}, similar` }); }
  else return null;

  let p = 1, dist = 0;
  if (!intent.place.remote) {
    const here = PLACE[intent.place.name] || PLACE[ME.suburb];
    dist = km(here, PLACE[other.place]);
    const r = intent.place.radius;
    if (dist > r * 1.5) return null;
    p = dist <= r ? 1 - 0.4 * (dist / r) : 0.35;
    reasons.push({ key: 'where', ok: dist <= r, text: dist < 0.8 ? `In ${other.place}` : `${other.place} · ${dist.toFixed(1)} km` });
  }

  const slots = resolveWhen(other.when, now);
  let overlap = 0, first = null;
  for (const x of intent.time.slots) for (const y of slots) {
    const s = Math.max(x.start, y.start), e = Math.min(x.end, y.end);
    if (e > s) { overlap += (e - s) / 36e5; if (!first || s < first.start) first = { start: new Date(s), end: new Date(e) }; }
  }
  if (!first) return null;
  reasons.push({ key: 'when', ok: true, text: fmtSlot(first, now) });
  const tm = Math.min(1, overlap / 1.5);

  let s = 0.8;
  if (intent.skill && other.skill) {
    const gap = Math.abs(SKILLS.indexOf(intent.skill) - SKILLS.indexOf(other.skill));
    s = [1, 0.75, 0.4, 0.2][gap];
    reasons.push({ key: 'level', ok: gap <= 1, text: `${cap(other.skill)} level` });
  }
  if (intent.role === 'learner' && other.role === 'teacher') { s = 1; reasons.push({ key: 'level', ok: true, text: 'Happy to teach' }); }

  const score = 0.4 * a + 0.25 * p + 0.25 * tm + 0.1 * s;
  return { score, dist, reasons, first, slots };
}

function match(intent, opts = {}) {
  const now = opts.now || new Date();
  const joined = opts.exclude || new Set();
  const empty = { people: [], plans: [], passive: [], suggestion: null };
  if (!intent.activity || intent.flags.length) return empty;

  const people = OPEN_ASKS
    .map((ask) => ({ ask, person: PERSON[ask.who], fit: scoreFit(intent, ask, now) }))
    .filter((x) => x.fit)
    .sort((a, b) => b.fit.score - a.fit.score);

  const plans = PLANS
    .map((plan) => {
      const fit = scoreFit(intent, plan, now);
      if (!fit) return null;
      const left = plan.size - plan.members.length;
      fit.reasons.push({ key: 'who', ok: left >= intent.party.have, text: left >= intent.party.have ? `${left} spot${left === 1 ? '' : 's'} left` : `Only ${left} spot${left === 1 ? '' : 's'} left` });
      if (left < intent.party.have) fit.score -= 0.3;
      return { plan, fit, left };
    })
    .filter(Boolean)
    .sort((a, b) => b.fit.score - a.fit.score);

  // People who list this activity and live nearby but have not asked for anything.
  // We never show who they are; we only say how many we will reach out to.
  const taken = new Set([...people.map((x) => x.person.id), ...plans.flatMap((x) => x.plan.members)]);
  const passive = intent.place.remote
    ? PEOPLE.filter((p) => p.interests.includes(intent.activity.id) && !taken.has(p.id))
    : PEOPLE.filter((p) => p.interests.includes(intent.activity.id) && !taken.has(p.id)
        && km(PLACE[p.suburb], PLACE[intent.place.name] || PLACE[ME.suburb]) <= intent.place.radius);

  // Combine individuals into a group: take the best exact matches until the group is full.
  let suggestion = null;
  const exact = people.filter((x) => x.ask.act === intent.activity.id && x.fit.reasons.every((r) => r.ok));
  if (exact.length && intent.party.seek > 0) {
    const members = [];
    let filled = 0;
    for (const x of exact) {
      if (filled + x.ask.have <= intent.party.seek) { members.push(x); filled += x.ask.have; }
      if (filled === intent.party.seek) break;
    }
    if (members.length) {
      // the slot every member is free for, starting from the first member's overlap
      let win = members[0].fit.first;
      for (const x of members.slice(1)) {
        const y = x.fit.first;
        const s = Math.max(win.start, y.start), e = Math.min(win.end, y.end);
        if (e > s) win = { start: new Date(s), end: new Date(e) };
      }
      suggestion = { members, total: intent.party.have + intent.party.seek, filled: intent.party.have + filled, when: win };
    }
  }

  return { people: people.filter((x) => !joined.has(x.person.id)), plans, passive, suggestion };
}

// ---------- events: the graph between people and events ----------

const slotOf = (g, now = new Date()) => (g.slots ? g.slots[0] : resolveWhen(g.when, now)[0]);
const hourOf = (d) => d.getHours() + d.getMinutes() / 60;

// Which of the four availability buckets a start time falls in.
function bucketOf(date) {
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  return (weekend ? 'we-' : 'wd-') + (hourOf(date) < 12 ? 'am' : 'pm');
}

// Where an event is in its life: before check-in opens, open for check-in, or over.
function eventPhase(g, now = new Date()) {
  const slot = slotOf(g, now);
  if (now > slot.end) return 'done';
  if (now >= new Date(+slot.start - 30 * 60e3)) return 'live';
  return 'upcoming';
}

// What an event involves, for checking against someone's private avoid list.
function planTraits(plan, now = new Date()) {
  const t = new Set(ACT[plan.act].traits || []);
  if (plan.alcohol) t.add('alcohol');
  const slot = slotOf(plan, now);
  if (hourOf(slot.end) >= 22 || hourOf(slot.end) < 4) t.add('late');
  if (hourOf(slot.start) < 7) t.add('early');
  if (plan.size >= 8) t.add('big');
  return [...t];
}

// Edges learned from what people do. Only confirmed attendance counts, the same rule as the profile's numbers.
//   played:   PLAYED_WITH  person -> count of confirmed plans together
//   actCount: ATTENDED     activity -> count of confirmed plans
//   rated:    RATED        person -> 'good' | 'bad' from feedback you gave (private)
//   blocked:  BLOCKED      people you blocked (hard filter, both ways)
function socialContext(history, opts = {}) {
  const me = opts.me || 'me';
  const played = {}, actCount = {};
  for (const g of history) {
    if (!g.members.includes(me) || g.confirmed === false) continue;
    actCount[g.act] = (actCount[g.act] || 0) + 1;
    for (const m of g.members) if (m !== me) played[m] = (played[m] || 0) + 1;
  }
  return { played, actCount, rated: opts.rated || {}, blocked: opts.blocked || new Set() };
}

// A plan is off-limits if someone blocked is organising it or going.
const touchesBlocked = (plan, ctx) => ctx && ctx.blocked && ctx.blocked.size && [plan.org, ...plan.members].some((m) => ctx.blocked.has(m));

// Score one event for one person and explain it as edges from "you" to the event.
function scoreEvent(profile, plan, ctx = { played: {}, actCount: {} }, now = new Date()) {
  const home = PLACE[profile.suburb] || PLACE[ME.suburb];
  const slot = slotOf(plan, now);
  const venue = typeof VENUE !== 'undefined' && VENUE[plan.venueId];
  const dist = km(home, venue || PLACE[plan.place] || home);
  const act = ACT[plan.act];
  const into = profile.interests.includes(plan.act);
  const near = !into && profile.interests.some((i) => ACT[i].cat === act.cat);
  const times = ctx.actCount[plan.act] || 0;
  const interest = into ? Math.min(1, 0.75 + 0.05 * times) : near ? 0.45 : 0.1;
  const soon = Math.max(0, 1 - (slot.start - now) / 864e5 / 7);
  const left = plan.size - plan.members.length;
  const momentum = left <= 0 ? 0 : 1 - left / plan.size;
  const trust = Math.min(1, ((PERSON[plan.org] || {}).points || 0) / 3000);
  const mine = profile.levels && profile.levels[plan.act];
  const levelFit = mine && plan.skill ? [1, 0.8, 0.5, 0.3][Math.abs(SKILLS.indexOf(mine) - SKILLS.indexOf(plan.skill))] : 0.8;
  const bucket = bucketOf(slot.start);
  const freeFit = !profile.free || !profile.free.length ? 0.7 : profile.free.includes(bucket) ? 1 : 0.3;
  // People you've played with count; a good rating from you counts extra. Someone you rated badly lowers the plan quietly.
  const rated = ctx.rated || {};
  const friends = plan.members.filter((m) => ctx.played[m] && rated[m] !== 'bad');
  const social = Math.min(1, friends.reduce((k, m) => k + ctx.played[m] + (rated[m] === 'good' ? 1 : 0), 0) / 3);
  const dislike = [plan.org, ...plan.members].some((m) => rated[m] === 'bad') ? 0.15 : 0;
  const goal = goalFit(profile.goals || [], plan, act, venue);
  const score = 0.28 * interest + 0.11 * soon + 0.08 * momentum + 0.08 * trust + 0.11 * levelFit + 0.12 * freeFit + 0.14 * social + 0.08 * goal.score - dislike;

  const BUCKET_LABEL = { 'wd-am': 'weekday mornings', 'wd-pm': 'weekday evenings', 'we-am': 'weekend mornings', 'we-pm': 'weekend afternoons' };
  const edges = [
    { key: 'activity', node: act.label, you: into ? (times ? `you've been ${times}×` : "you're into it") : near ? 'like what you do' : 'new to you', ok: into },
    { key: 'place', node: plan.place, you: `${dist.toFixed(1)} km from you`, ok: dist <= (profile.radius || 10) },
    { key: 'time', node: fmtDay(slot.start, now), you: freeFit === 1 ? `free ${BUCKET_LABEL[bucket]}` : 'not your usual time', ok: freeFit === 1 },
  ];
  if (friends.length) edges.push({ key: 'people', node: friends.map((m) => PERSON[m].name).slice(0, 2).join(', '), you: 'played with you', ok: true });
  if (mine && plan.skill) edges.push({ key: 'level', node: cap(plan.skill), you: `you're ${mine}`, ok: levelFit >= 0.8 });
  if (goal.goal) edges.push({ key: 'goal', node: goal.label, you: 'your goal', ok: true });

  const reasons = [];
  if (friends.length) reasons.push({ ok: true, text: `${friends.map((m) => PERSON[m].name).slice(0, 2).join(' and ')} ${friends.length === 1 ? 'is' : 'are'} going` });
  if (into) reasons.push({ ok: true, text: times ? `You've been to ${times} ${act.label.toLowerCase()} plan${times === 1 ? '' : 's'}` : `You're into ${act.label.toLowerCase()}` });
  else if (near) reasons.push({ ok: false, text: `Like ${profile.interests.filter((i) => ACT[i].cat === act.cat).map((i) => ACT[i].label.toLowerCase())[0]}` });
  reasons.push({ ok: true, text: dist < 0.8 ? `In ${plan.place}` : `${dist.toFixed(1)} km` });
  if (freeFit === 1) reasons.push({ ok: true, text: 'Fits your free time' });
  if (goal.goal) reasons.push({ ok: true, text: goal.reason });
  if (left > 0 && left <= 2) reasons.push({ ok: true, text: `${left} spot${left === 1 ? '' : 's'} left` });
  if (mine && plan.skill && levelFit < 0.8) reasons.push({ ok: false, text: `${cap(plan.skill)} level` });

  const clash = planTraits(plan, now).filter((tr) => (profile.avoid || []).includes(tr));
  return { plan, slot, dist, score, reasons, edges, into, near, left, clash };
}

// Goals are private: they never show on a profile, they only nudge recommendations.
const OUTDOOR_CATS = ['water', 'outdoors', 'team', 'racquet', 'fitness'];
const INDOOR_VENUES = ['manly-library', 'corso-cafe', 'wharf-bar', 'marrickville-gym'];
function goalFit(goals, plan, act, venue) {
  const checks = {
    fitness: [['fitness', 'team', 'racquet', 'water'].includes(act.cat) || act.id === 'hiking', 'Good for getting fitter'],
    friends: [plan.size >= 6 || (plan.interested || []).length >= 2, 'A good group to meet people'],
    learn: [plan.skill === 'beginner' || /learn|clinic|beginner|basics/i.test(`${plan.title} ${plan.note || ''}`), 'Good for learning'],
    compete: [['intermediate', 'competitive'].includes(plan.skill), 'A proper game'],
    outdoors: [OUTDOOR_CATS.includes(act.cat) && !(venue && INDOOR_VENUES.includes(venue.id)), 'Outdoors'],
    unwind: [plan.skill === 'casual' && ['games', 'creative', 'outdoors', 'local'].includes(act.cat), 'Relaxed and easy'],
  };
  const hit = goals.find((g) => checks[g] && checks[g][0]);
  if (!hit) return { score: goals.length ? 0.3 : 0.5, goal: null };
  const LABEL = { fitness: 'Get fitter', friends: 'Make new friends', learn: 'Learn something new', compete: 'Compete', outdoors: 'Get outdoors', unwind: 'Unwind' };
  return { score: 1, goal: hit, label: LABEL[hit], reason: checks[hit][1] };
}

// Recommendations: open events near you, best first. Avoided ones are held back, not deleted, so the UI can say how many.
// opts.busy:     [{id, start, end, title}] plans you're going to or hosting; an overlapping plan drops and says why
// opts.feedback: { dismissed: Set(planId), fewer: { activityId: n } } from "Not for me" on a card
// The top of the list is then re-ordered for variety, so one activity can't fill the whole carousel.
const FEED = { busyPenalty: 0.3, fewerPenalty: 0.12, repeatPenalty: 0.07, fullPenalty: 0.2, diversifyTop: 10 };

function rankFeed(profile, plans, opts = {}) {
  const now = opts.now || new Date();
  const ctx = opts.ctx || { played: {}, actCount: {} };
  const radius = opts.radius || profile.radius || 10;
  const fb = opts.feedback || {};
  const busy = opts.busy || [];
  const shown = [], hidden = [];
  let dismissed = 0;
  for (const plan of plans) {
    if (plan.past || plan.status === 'cancelled' || plan.visibility === 'invite' || plan.members.includes('me') || (opts.exclude && opts.exclude.has(plan.id)) || touchesBlocked(plan, ctx)) continue;
    if (eventPhase(plan, now) === 'done') continue;
    if (fb.dismissed && fb.dismissed.has(plan.id)) { dismissed++; continue; }
    const item = scoreEvent(profile, plan, ctx, now);
    if (item.dist > radius) continue;
    const fewer = (fb.fewer && fb.fewer[plan.act]) || 0;
    if (fewer) { item.score -= FEED.fewerPenalty * fewer; item.edges.push({ key: 'feedback', node: ACT[plan.act].label, you: 'you asked for fewer', ok: false }); }
    const overlap = busy.find((b) => b.id !== plan.id && b.start < item.slot.end && b.end > item.slot.start);
    if (overlap) { item.score -= FEED.busyPenalty; item.busy = overlap.title; item.reasons.unshift({ ok: false, text: `Clashes with ${overlap.title}` }); }
    if (item.left <= 0) item.score -= FEED.fullPenalty; // only a waitlist: still shown, lower down
    (item.clash.length ? hidden : shown).push(item);
  }
  shown.sort((a, b) => b.score - a.score);
  return { shown: diversify(shown), hidden, dismissed };
}

// Greedy re-rank of the top few: each earlier pick of the same activity costs a little.
function diversify(list) {
  const top = list.slice(0, FEED.diversifyTop), rest = list.slice(FEED.diversifyTop);
  const out = [], seen = {};
  while (top.length) {
    let best = 0, bestScore = -Infinity;
    top.forEach((x, i) => { const s = x.score - FEED.repeatPenalty * (seen[x.plan.act] || 0); if (s > bestScore) { bestScore = s; best = i; } });
    const [x] = top.splice(best, 1);
    seen[x.plan.act] = (seen[x.plan.act] || 0) + 1;
    out.push(x);
  }
  return [...out, ...rest];
}

// ---------- search ----------

// Words that never become a text filter: they are time, level, place or filler words the parser already
// handled (or that carry no meaning in a search). Without this, "tennis tonight" would look for the word "tonight".
const SEARCH_STOP = new Set(('a an the in at on of for to and or with near nearby me my i im i\'m we us our this next some any ' +
  'play playing want wanna like keen looking look find get go going join someone something anything stuff people person ' +
  'game games session sessions plan plans event events group who what where when around here local within km kms ' +
  'today tonight tomorrow tmrw week weekend weekends weekday weekdays weeknight weeknights day days night nights ' +
  'morning mornings afternoon afternoons arvo evening evenings lunch lunchtime before after work early sunrise dawn all ' +
  'am pm from till until between beginner beginners newbie casual social relaxed chill intermediate advanced ' +
  'competitive serious level levels learn learning lessons new more two three four five six seven eight nine ten').split(' '));

// Things people call an activity that Keen files under another one. Shown as "Showing football for footy".
const SEARCH_ALIASES = {
  footy: 'football', rugby: 'football', touch: 'football', oztag: 'football', netball: 'basketball', bball: 'basketball',
  badminton: 'tennis', 'table tennis': 'pickleball', boulder: 'climbing', paddleboard: 'surfing', sup: 'surfing',
  bodyboard: 'surfing', trail: 'running', walking: 'hiking', walks: 'hiking', cards: 'boardgames', mahjong: 'boardgames',
  scrabble: 'boardgames', camera: 'photowalk', music: 'jam', band: 'jam', sing: 'jam', conversation: 'language',
};

// Edit distance with swaps counted as one edit, so "padle" is one step from "padel".
function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// A word that isn't an activity, but nearly is: a typo, a plural or a local name for it.
function guessActivity(words) {
  for (const w of words) {
    const alias = SEARCH_ALIASES[w];
    if (alias) return { act: ACT[alias], from: w, kind: 'alias' };
  }
  const single = ACTIVITIES.flatMap((a) => a.words.filter((x) => !x.includes(' ') && x.length >= 4).map((x) => [x, a]));
  for (const w of words) {
    if (w.length < 4) continue;
    for (const [x, a] of single) if (w === x + 's' || w === x + 'es' || x === w + 's') return { act: a, from: w, kind: 'plural' };
  }
  let best = null;
  for (const w of words) {
    if (w.length < 5) continue;
    for (const [x, a] of single) {
      const dist = editDistance(w, x);
      if (dist <= (w.length >= 7 ? 2 : 1) && (!best || dist < best.dist)) best = { act: a, from: w, kind: 'typo', dist };
    }
  }
  return best;
}

const FIRST_NAMES = () => new Set([...PEOPLE, ...FRIENDS].map((p) => p.name.toLowerCase()));

// Search events (never people). The query goes through the same parser as asks, and only what the
// person actually typed becomes a filter: their profile is used to rank, not to narrow.
// Pipeline: parse -> repair (typos, aliases) -> filter -> bucket (exact / similar / held back) -> rank -> fallback.
function searchEvents(text, profile, plans, opts = {}) {
  const now = opts.now || new Date();
  const q = (text || '').trim();
  const it = parseIntent(q, profile.suburb, now);
  const f = opts.filters || {};
  const lower = ' ' + q.toLowerCase().replace(/[’`]/g, "'") + ' ';

  // Leftover words: whatever the parser didn't turn into a filter
  const placeWords = new Set(PLACES.flatMap((p) => [...p.name.toLowerCase().split(' '), ...(p.alias || []).flatMap((x) => x.split(' '))]));
  const venueWords = new Set(it.venue ? it.venue.name.toLowerCase().split(/[^a-z]+/) : []);
  const actWords = new Set(it.activity ? it.activity.heard.split(' ') : []);
  let rest = lower.split(/[^a-z']+/).filter((w) => w.length > 1 && !SEARCH_STOP.has(w) && !DOW.includes(w) && !(w in DOW_ABBR) && !placeWords.has(w) && !venueWords.has(w) && !actWords.has(w));

  // Repair: typos ("padle"), plurals ("hikes") and local names ("footy")
  let corrected = null;
  let guessed = null;
  if (!it.activity && f.act === undefined) {
    guessed = guessActivity(rest);
    if (guessed) { corrected = guessed.kind === 'plural' ? null : { from: guessed.from, to: guessed.act.label, kind: guessed.kind }; rest = rest.filter((w) => w !== guessed.from); }
  }

  // People are never searchable. A first name on its own gets an explanation instead of a silent zero.
  const names = FIRST_NAMES();
  const peopleQuery = rest.find((w) => names.has(w)) || null;
  if (peopleQuery) rest = rest.filter((w) => !names.has(w));

  const act = f.act !== undefined ? f.act : it.activity ? it.activity.id : guessed ? guessed.act.id : null;
  const venue = f.venue !== undefined ? f.venue : it.venue ? it.venue.id : null;
  const place = f.place !== undefined ? f.place : venue || it.place.assumed || it.place.remote ? null : it.place.name;
  // f.radius: a number from the filters sheet, null when the typed "within N km" was removed
  const typedRadius = f.radius !== null && it.place.radiusSet;
  const radiusSet = !!f.radius || typedRadius;
  const radius = f.radius || (typedRadius || place ? it.place.radius : profile.radius || 10);
  const time = f.time !== undefined ? f.time : it.time.assumed ? null : it.time;
  const skill = f.skill !== undefined ? f.skill : it.skill || null;
  const words = act || f.words === null ? [] : rest;
  const centre = PLACE[place || profile.suburb] || PLACE[ME.suburb];

  // One plan against the current filters; `relax` names a filter to ignore when looking for near misses.
  const passes = (plan, slot, dist, relax) => {
    if (relax !== 'place' && venue && plan.venueId !== venue) return false;
    if (relax !== 'place' && dist > radius) return false;
    if (relax !== 'time' && time && !time.slots.some((s) => (time.anyHour ? +startOfDay(s.start) === +startOfDay(slot.start) : s.start < slot.end && s.end > slot.start))) return false;
    if (relax !== 'time' && f.day != null && +startOfDay(slot.start) !== f.day) return false;
    if (relax !== 'skill' && skill && plan.skill !== skill && plan.skill !== 'casual') return false;
    if (f.spots && plan.members.length >= plan.size) return false;
    if (f.open && plan.approve) return false;
    return true;
  };
  const matchesText = (plan) => {
    if (act) return plan.act === act ? 'exact' : ACT[plan.act].cat === ACT[act].cat ? 'similar' : null;
    if (!words.length) return peopleQuery ? null : 'exact';
    const hay = `${plan.title} ${plan.note || ''} ${ACT[plan.act].label} ${ACT[plan.act].words.join(' ')} ${plan.venue}`.toLowerCase();
    return words.every((w) => hay.includes(w.replace(/s$/, ''))) ? 'exact' : null;
  };

  const exact = [], similar = [], hidden = [], near = { time: [], place: [], skill: [] };
  for (const plan of plans) {
    if (plan.past || plan.status === 'cancelled' || plan.visibility === 'invite' || eventPhase(plan, now) === 'done' || touchesBlocked(plan, opts.ctx)) continue;
    const kind = matchesText(plan);
    if (!kind) continue;
    const v = typeof VENUE !== 'undefined' && VENUE[plan.venueId];
    const slot = slotOf(plan, now);
    const dist = km(centre, v || PLACE[plan.place]);
    if (!passes(plan, slot, dist)) {
      // Near misses for the exact activity, so "padel 7am" can offer padel at other times
      if (kind === 'exact') for (const k of ['time', 'place', 'skill']) if (passes(plan, slot, dist, k)) { near[k].push(scoreEvent(profile, plan, opts.ctx, now)); break; }
      continue;
    }
    const item = scoreEvent(profile, plan, opts.ctx, now);
    (item.clash.length ? hidden : kind === 'exact' ? exact : similar).push(item);
  }

  const sorts = { best: (a, b) => b.score - a.score, soon: (a, b) => a.slot.start - b.slot.start, near: (a, b) => a.dist - b.dist || b.score - a.score };
  const by = sorts[opts.sort] || sorts.best;
  // Nothing exact: say which filter is in the way and show what's behind it
  let fallback = null;
  if (!exact.length) {
    const k = ['time', 'place', 'skill'].find((x) => near[x].filter((i) => !i.clash.length).length);
    if (k) fallback = { relax: k, items: near[k].filter((i) => !i.clash.length).sort(sorts.soon).slice(0, 3) };
  }
  // A word we don't know at all ("yoga") is demand: no activity, no venue, nothing matched
  const unknown = !act && !venue && words.length && !exact.length && !hidden.length ? words.join(' ') : null;

  return {
    intent: it,
    filters: { act, venue, place, radius, radiusSet, time, skill, words, spots: !!f.spots, open: !!f.open },
    corrected, peopleQuery, unknown, fallback,
    exact: exact.sort(by), similar: similar.sort(by), hidden,
  };
}

// Typeahead: what the box could mean so far. Activities and venues by prefix (or a near miss), each with how many
// open plans it has nearby, so a suggestion never leads to nothing without saying so.
function searchSuggest(text, profile, plans, opts = {}) {
  const now = opts.now || new Date();
  const t = (text || '').toLowerCase().trim();
  if (!t) return [];
  const last = t.split(/\s+/).pop();
  const idx = browseIndex(profile, plans, now, opts.ctx);
  const out = [];
  const it = parseIntent(t, profile.suburb, now);
  const head = t.slice(0, t.length - last.length);
  if (!it.activity) {
    for (const a of ACTIVITIES) {
      if (a.cat === 'service') continue;
      const hit = [a.label.toLowerCase(), ...a.words].find((w) => w.startsWith(last)) || a.label.toLowerCase().split(' ').find((p) => p.startsWith(last));
      const typo = !hit && last.length >= 4 && [a.label.toLowerCase(), ...a.words].some((w) => editDistance(last, w.slice(0, last.length + 1)) <= 1);
      if (hit || typo) out.push({ kind: 'act', id: a.id, label: a.label, q: (head + a.label.toLowerCase()).trim(), count: idx.byAct[a.id] || 0 });
    }
  }
  if (!it.venue && last.length >= 2) {
    for (const v of VENUES) {
      const n = v.name.toLowerCase();
      if (n.startsWith(last) || n.split(/[^a-z]+/).some((p) => p.length > 2 && p.startsWith(last) && last.length >= 3)) {
        const count = plans.filter((g) => g.venueId === v.id && !g.past && g.status !== 'cancelled' && g.visibility !== 'invite' && eventPhase(g, now) !== 'done').length;
        out.push({ kind: 'venue', id: v.id, label: v.name.replace(/\s*\(.*\)$/, ''), sub: v.suburb, q: (head + v.name.replace(/\s*\(.*\)$/, '').toLowerCase()).trim(), count });
      }
    }
  }
  if (it.place.assumed && last.length >= 3) {
    for (const p of PLACES) {
      if (!p.name.toLowerCase().startsWith(last)) continue;
      const count = plans.filter((g) => !g.past && g.status !== 'cancelled' && g.visibility !== 'invite' && eventPhase(g, now) !== 'done' && km(p, VENUE[g.venueId] || PLACE[g.place]) <= DEFAULT_RADIUS_KM).length;
      out.push({ kind: 'place', id: p.name, label: p.name, sub: `within ${DEFAULT_RADIUS_KM} km`, q: (head + p.name.toLowerCase()).trim(), count });
    }
  }
  // Activity typed already: offer the common next words
  if (it.activity && !/\s$/.test(text) && t.endsWith(it.activity.heard)) {
    for (const w of ['this weekend', 'tonight', 'tomorrow', 'before work', 'for beginners']) out.push({ kind: 'more', label: `${it.activity.label} ${w}`, q: `${t} ${w}` });
  }
  return out.sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 6);
}

// Browse: how many open events per activity, per day (next 7 days) and per venue, within a radius of home.
// Counts include plans you'd avoid or have joined: browse shows what exists, recommendations decide what to push.
function browseIndex(profile, plans, now = new Date(), ctx = null, radius = null) {
  const byAct = {}, byDay = {}, byVenue = {};
  const home = PLACE[profile.suburb] || PLACE[ME.suburb];
  const r = radius || profile.radius || 10;
  for (const plan of plans) {
    if (plan.past || plan.status === 'cancelled' || plan.visibility === 'invite' || eventPhase(plan, now) === 'done' || touchesBlocked(plan, ctx)) continue;
    const venue = typeof VENUE !== 'undefined' && VENUE[plan.venueId];
    if (km(home, venue || PLACE[plan.place]) > r) continue;
    byAct[plan.act] = (byAct[plan.act] || 0) + 1;
    const d = +startOfDay(slotOf(plan, now).start);
    byDay[d] = (byDay[d] || 0) + 1;
    if (plan.venueId) byVenue[plan.venueId] = (byVenue[plan.venueId] || 0) + 1;
  }
  return { byAct, byDay, byVenue };
}

// Browse collections: fixed, explainable rules over open plans near you (not a personal ranking; that's §6).
// Each one says why a plan is in it, and the ones that map onto a search filter get a "See all".
const COLLECTIONS = [
  { id: 'now', title: 'Happening now', why: 'Started or starting within 30 minutes', test: (x, now) => eventPhase(x.plan, now) === 'live' },
  { id: 'soon', title: 'Next 48 hours', why: 'Starts in the next two days', test: (x, now) => eventPhase(x.plan, now) === 'upcoming' && x.slot.start - now < 2 * 864e5, see: { when: 'tomorrow' } },
  { id: 'weekend', title: 'This weekend', why: 'Saturday or Sunday', test: (x, now) => [0, 6].includes(x.slot.start.getDay()) && x.slot.start - now < 7 * 864e5, see: { when: 'this weekend' } },
  { id: 'needs', title: 'Needs one or two more', why: 'One or two spots left, so your yes makes it happen', test: (x) => x.left >= 1 && x.left <= 2 },
  { id: 'beginners', title: 'Good for beginners', why: 'Beginner level, or a clinic or lesson', test: (x) => x.plan.skill === 'beginner' || /clinic|learn|lesson|basics/i.test(x.plan.title), see: { level: 'beginner' } },
  { id: 'evenings', title: 'After work', why: 'Weekdays from 5pm', test: (x) => x.slot.start.getDay() % 6 !== 0 && hourOf(x.slot.start) >= 17, see: { q: 'after work' } },
];

function browseCollections(profile, plans, opts = {}) {
  const now = opts.now || new Date();
  const { shown } = rankFeed(profile, plans, { now, ctx: opts.ctx, radius: opts.radius });
  const soonest = [...shown].sort((a, b) => a.slot.start - b.slot.start);
  return COLLECTIONS.map((c) => ({ ...c, items: soonest.filter((x) => c.test(x, now)) })).filter((c) => c.items.length);
}

// ---------- the other direction: which people a plan reaches ----------

// Walks the same edges from the plan's side. Each person is checked against their own private fields
// (travel distance, avoid list, free times, level, weekly cap) and the result says why anyone was held back.
// Organisers only ever see the counts, never who.
function reachForEvent(plan, opts = {}) {
  const now = opts.now || new Date();
  const people = opts.people || PEOPLE;
  const blocked = opts.blocked || new Set();
  const slot = slotOf(plan, now);
  const venue = (typeof VENUE !== 'undefined' && VENUE[plan.venueId]) || PLACE[plan.place];
  const traits = planTraits(plan, now);
  const bucket = bucketOf(slot.start);
  const act = ACT[plan.act];
  const asked = [], likely = [];
  const held = { blocked: 0, far: 0, avoid: 0, level: 0, busy: 0, cap: 0 };
  for (const p of people) {
    if (plan.members.includes(p.id) || p.id === plan.org) continue;
    const ask = OPEN_ASKS.find((a) => a.who === p.id && (a.act === plan.act) && resolveWhen(a.when, now).some((s) => s.start < slot.end && s.end > slot.start));
    const into = p.interests.includes(plan.act);
    if (!ask && !into) continue; // no edge to this activity at all
    if (blocked.has(p.id)) { held.blocked++; continue; }
    if (km(PLACE[p.suburb], venue) > (p.radius || 10)) { held.far++; continue; }
    if (traits.some((t) => (p.avoid || []).includes(t))) { held.avoid++; continue; }
    const lvl = p.levels && p.levels[plan.act];
    if (lvl && plan.skill && Math.abs(SKILLS.indexOf(lvl) - SKILLS.indexOf(plan.skill)) >= 2) { held.level++; continue; }
    if (ask) { asked.push(p); continue; } // they asked for this: always told, no cap
    if (p.free && p.free.length && !p.free.includes(bucket)) { held.busy++; continue; }
    if ((p.asksThisWeek || 0) >= (p.askCap || 3)) { held.cap++; continue; }
    likely.push(p);
  }
  return { asked, likely, held, heldTotal: Object.values(held).reduce((a, b) => a + b, 0), activity: act.label };
}

// Directions links. Coordinates go to the maps app; nothing about the person is sent.
function mapsLinks(v) {
  const q = `${v.lat},${v.lng}`;
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    apple: `https://maps.apple.com/?daddr=${q}&q=${encodeURIComponent(v.name)}`,
  };
}

// Screen chat messages for things scammers rely on: moving off-app and talking about money.
const CHAT_PATTERNS = [
  { re: /(?:\+?61|\b0)[\s-]?4(?:[\s-]?\d){8}\b/g, label: 'phone number' },
  { re: /\b(?:\d[\s-]?){8,}\d\b/g, label: 'phone number' },
  { re: /[\w.+-]+@[\w-]+\.[\w.]+/g, label: 'email' },
  { re: /\b(?:https?:\/\/|www\.)\S+/gi, label: 'link' },
  { re: /\b(?:whatsapp|telegram|signal|snapchat|instagram|insta|wechat|kik)\b/gi, label: 'other app' },
  { re: /\b(?:bank|bsb|paypal|crypto|bitcoin|gift ?cards?|wire|invest(?:ment)?|deposit)\b/gi, label: 'payment' },
];

function screenMessage(text) {
  const hits = new Set();
  let out = text;
  for (const { re, label } of CHAT_PATTERNS) out = out.replace(re, () => { hits.add(label); return `[${label} hidden]`; });
  return { text: out, hits: [...hits] };
}

// Goodwill levels. Thresholds assume roughly 90 points per attended plan (see GOODWILL_RULES).
const GOODWILL_LEVELS = [
  { min: 0, name: 'New', key: 'new' },
  { min: 200, name: 'Regular', key: 'regular' },
  { min: 1000, name: 'Trusted', key: 'trusted' },
  { min: 3000, name: 'Local legend', key: 'legend' },
];
const levelFor = (pts) => [...GOODWILL_LEVELS].reverse().find((l) => pts >= l.min);
const nextLevel = (pts) => GOODWILL_LEVELS.find((l) => l.min > pts) || null;

if (typeof module !== 'undefined') {
  module.exports = { FEED, diversify, browseCollections, COLLECTIONS, searchSuggest, editDistance, guessActivity, reachForEvent, touchesBlocked, GOODWILL_LEVELS, wordRe, cap, SKILLS, DOW, startOfDay, slotOf, bucketOf, eventPhase, socialContext, scoreEvent, searchEvents, browseIndex, mapsLinks, parseIntent, parseTime, match, scoreFit, screenMessage, rankFeed, planTraits, levelFor, nextLevel, fmtSlot, fmtDay, resolveWhen, km, ACT, PLACE, PERSON };
}
