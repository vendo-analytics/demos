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
    if (from != null) {
      // a time with no day: today if it hasn't passed, else tomorrow
      days = [at(today, to) > now ? today : addDays(today, 1)];
      dayLabel = fmtDay(days[0], now);
    } else {
      days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(today, i));
      dayLabel = 'Next 7 days';
      assumed = true;
    }
  }
  if (from == null) { from = 7; to = 21; hourLabel = days.length === 1 ? 'any time' : null; }
  // "Sunday 8am" said on Sunday evening means next Sunday
  if (byWeekday && at(days[0], to) <= now) days = [addDays(days[0], 7)];
  if (byWeekday && !dayLabel) dayLabel = fmtDay(days[0], now);

  const slots = days.map((d) => ({ start: at(d, from), end: at(d, to) })).filter((s) => s.end > now);
  const label = [dayLabel, hourLabel].filter(Boolean).join(' · ');
  return { slots: slots.length ? slots : days.map((d) => ({ start: at(d, from), end: at(d, to) })), label, assumed, recurring, exact, from, to };
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
    if (r) place.radius = Math.min(50, Math.max(1, +r[1]));
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

// ---------- the "Happening near you" feed ----------

// What a plan involves, for checking against someone's private avoid list.
function planTraits(plan, now = new Date()) {
  const t = new Set(ACT[plan.act].traits || []);
  if (plan.alcohol) t.add('alcohol');
  const slot = plan.slots ? plan.slots[0] : resolveWhen(plan.when, now)[0];
  const h = (d) => d.getHours() + d.getMinutes() / 60;
  if (h(slot.end) >= 22 || h(slot.end) < 4) t.add('late');
  if (h(slot.start) < 7) t.add('early');
  if (plan.size >= 8) t.add('big');
  return [...t];
}

// Rank open plans for a profile. Avoided plans are held back, not deleted, so the UI can say how many.
function rankFeed(profile, plans, opts = {}) {
  const now = opts.now || new Date();
  const home = PLACE[profile.suburb] || PLACE[ME.suburb];
  const radius = profile.radius || 10;
  const shown = [], hidden = [];
  for (const plan of plans) {
    if (plan.past || plan.members.includes('me')) continue;
    const slot = plan.slots ? plan.slots[0] : resolveWhen(plan.when, now)[0];
    if (slot.end < now) continue;
    const dist = km(home, PLACE[plan.place] || home);
    if (dist > radius) continue;
    const act = ACT[plan.act];
    const into = profile.interests.includes(plan.act);
    const near = !into && profile.interests.some((i) => ACT[i].cat === act.cat);
    const interest = into ? 1 : near ? 0.5 : 0.1;
    const days = (slot.start - now) / 864e5;
    const soon = Math.max(0, 1 - days / 7);
    const left = plan.size - plan.members.length;
    const momentum = left <= 0 ? 0 : 1 - left / plan.size;
    const trust = Math.min(1, (PERSON[plan.org] ? PERSON[plan.org].points : 0) / 1500);
    let levelFit = 1;
    const mine = profile.levels && profile.levels[plan.act];
    if (mine && plan.skill) levelFit = [1, 0.8, 0.5, 0.3][Math.abs(SKILLS.indexOf(mine) - SKILLS.indexOf(plan.skill))];
    const score = 0.4 * interest + 0.2 * soon + 0.15 * momentum + 0.1 * trust + 0.15 * levelFit;

    const reasons = [];
    if (into) reasons.push({ ok: true, text: `You're into ${act.label.toLowerCase()}` });
    else if (near) reasons.push({ ok: false, text: `Like ${profile.interests.filter((i) => ACT[i].cat === act.cat).map((i) => ACT[i].label.toLowerCase())[0]}` });
    reasons.push({ ok: true, text: dist < 0.8 ? `In ${plan.place}` : `${dist.toFixed(1)} km` });
    if (left > 0 && left <= 2) reasons.push({ ok: true, text: `${left} spot${left === 1 ? '' : 's'} left` });
    if (mine && plan.skill && levelFit < 0.8) reasons.push({ ok: false, text: `${cap(plan.skill)} level` });

    const clash = planTraits(plan, now).filter((tr) => (profile.avoid || []).includes(tr));
    const item = { plan, slot, dist, score, reasons, into, near, left, clash };
    (clash.length ? hidden : shown).push(item);
  }
  shown.sort((a, b) => b.score - a.score);
  return { shown, hidden };
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

const LEVELS = [
  { min: 0, name: 'New', key: 'new' },
  { min: 100, name: 'Regular', key: 'regular' },
  { min: 500, name: 'Trusted', key: 'trusted' },
  { min: 1000, name: 'Local legend', key: 'legend' },
];
const levelFor = (pts) => [...LEVELS].reverse().find((l) => pts >= l.min);
const nextLevel = (pts) => LEVELS.find((l) => l.min > pts) || null;

if (typeof module !== 'undefined') {
  module.exports = { wordRe, cap, SKILLS, parseIntent, parseTime, match, scoreFit, screenMessage, rankFeed, planTraits, levelFor, nextLevel, fmtSlot, fmtDay, resolveWhen, km, ACT, PLACE, PERSON };
}
