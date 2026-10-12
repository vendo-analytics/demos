// Keen prototype UI. Plain DOM, one render function per screen, one click handler for the whole phone.

const NOW = new Date();
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const fmtPts = (n) => n.toLocaleString('en-AU');
const plural = (n, w) => `${n} ${n === 1 ? w : w === 'person' ? 'people' : `${w}s`}`;

const EXAMPLES = [
  "Padel Saturday morning in Manly, we're two looking for two more",
  'Play football Friday Manly, looking for 7 people',
  'Teach me how to surf, Saturday morning',
  'Show me around Mosman next weekend',
  'Board games in Newtown tonight',
  'Fix my sink this weekend',
  "Football Friday 6pm at Manly Oval, we're 4, need 7",
];

const S = {
  tab: 'ask',
  stack: [],
  text: '',
  over: {},
  intent: null,
  result: null,
  reachOut: true,
  invited: new Set(),
  mem: {}, // my membership per event: interested | requested | waitlist | going | checked_in | attended | left
  read: {}, // messages read per thread
  replyTo: null,
  ratings: {}, // RATED edges from feedback you gave: person -> 'good' | 'bad' (private)
  gsel: null,
  rc: null,
  ex: { q: '', act: null, day: null, drop: {}, when: null, radius: null, level: null, spots: false, open: false, sort: 'best', focus: false, view: 'list', mapR: null, pin: null },
  searchRecent: [],
  recFb: { dismissed: new Set(), fewer: {} },
  savedSearches: [],
  hidden: new Set(),
  myAsks: MY_ASKS.map((a) => ({ ...a })),
  myPlans: [...MY_HOSTED],
  points: 0, // set from the ledger at start-up
  idVerified: false,
  ledger: [],
  feedbackDone: false,
  fb: null,
  onboarding: true,
  ob: null,
  showHidden: false,
  draft: null,
  chat: Object.fromEntries(Object.entries(SEED_CHAT).map(([k, v]) => [k, v.map((m) => ({ ...m }))])),
};

// ---------- navigation ----------

const view = () => (S.onboarding ? { name: 'onboard' } : S.stack[S.stack.length - 1] || { name: S.tab });
function go(name, v) { S.stack.push({ name, v }); render(); }
function back() { S.stack.pop(); render(); }
function setTab(tab) { S.tab = tab; S.stack = []; render(); }

// ---------- shared bits ----------

const ICON_BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
// Navigation bar. Tab roots get an iOS-style large title that hands over to the bar on scroll;
// `over` makes the bar float transparently over a full-bleed image until you scroll.
const bar = (title, withBack = true, extra = '', opts = {}) =>
  `<div class="bar${withBack ? '' : ' root'}${opts.over ? ' over' : ''}">${withBack ? `<button class="icon-btn" data-act="back" aria-label="Back">${ICON_BACK}</button>` : ''}<h2>${title}</h2>${extra}</div>${withBack || opts.noLarge ? '' : `<h1 class="large-title">${title}</h1>`}`;

// Photos sit over the initials; if a photo is missing or fails to load it's removed and the initials show.
const avatar = (p, size = 'm') => `<span class="av ${size}" style="--h:${p.hue}" aria-hidden="true">${esc(p.name[0])}${p.photo ? `<img src="img/people/${p.id}.jpg" alt="" loading="lazy" data-fallback>` : ''}</span>`;

// Activity imagery: a photo at img/acts/<id>.jpg, over a gradient in the activity category's colours.
const ART = {
  racquet: ['#00A86B', '#7BD389'], team: ['#1E5BFF', '#4FC3F7'], fitness: ['#FF6B35', '#FF3D7F'], water: ['#0077B6', '#48CAE4'],
  outdoors: ['#2D8A4E', '#A7D676'], local: ['#7B5CFF', '#FF7AC6'], games: ['#6A3DE8', '#B388FF'], language: ['#E63946', '#F4A261'],
  music: ['#D6336C', '#845EF7'], creative: ['#F08C00', '#FF6B6B'], service: ['#5C6773', '#A3ACB9'],
};
function actArt(actId) {
  const a = ACT[actId];
  const [g1, g2] = ART[a.cat] || ART.service;
  const photo = ACT_PHOTOS.includes(actId) ? `<img src="img/acts/${actId}.jpg" alt="" loading="lazy" data-fallback>` : '';
  return `<div class="art${photo ? ' has-photo' : ''}" style="--g1:${g1};--g2:${g2}"><span class="art-word" aria-hidden="true">${esc(a.label)}</span>${photo}</div>`;
}
const gw = (pts) => { const l = levelFor(pts); return `<span class="gw ${l.key}" title="${l.name}">${fmtPts(pts)}</span>`; };
const personPts = (p) => (p.id === 'me' ? S.points : p.points);

function spots(members, size, youCount = 0) {
  let h = '';
  for (let i = 0; i < size; i++) h += `<i class="${i < members ? '' : i < members + youCount ? 'you' : 'open'}"></i>`;
  return `<div class="spots" aria-label="${members} of ${size} spots taken">${h}</div>`;
}

const reasonsHTML = (reasons) => `<ul class="reasons">${reasons.map((r) => `<li class="${r.ok ? '' : 'partial'}">${esc(r.text)}</li>`).join('')}</ul>`;

function partyText(p) {
  if (p.have > 1) return `You + ${p.have - 1} · need ${p.seek}`;
  return `Need ${p.seek} more`;
}

function placeText(pl) { return pl.remote ? 'Online' : `${pl.name} · ${pl.radius} km`; }

function hashIdx(id, n) { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % n; }

// ---------- intent with manual edits ----------

function currentIntent() {
  const it = parseIntent(S.text || '', ME.suburb, NOW);
  const o = S.over;
  if (o.act) {
    const a = ACT[o.act];
    it.activity = { ...a, heard: '(picked)' };
    it.missing = it.missing.filter((m) => m !== 'what');
    it.flags = it.flags.filter((f) => f.type !== 'service');
    if (a.cat === 'service') it.flags.push({ type: 'service' });
    if (it.party.assumed && !o.party) it.party.seek = Math.max(1, a.size - it.party.have);
  }
  if (o.place) it.place = o.place === 'Online' ? { name: 'Online', radius: 0, remote: true, assumed: false } : { name: o.place, radius: it.place.radius || 5, remote: false, assumed: false };
  if (o.radius && !it.place.remote) it.place.radius = o.radius;
  if (o.when) { it.time = parseTime(' ' + o.when.toLowerCase() + ' ', NOW); it.time.assumed = false; it.missing = it.missing.filter((m) => m !== 'when'); }
  if (o.party) it.party = { ...o.party, assumed: false };
  if ('skill' in o) it.skill = o.skill;
  else if (!it.skill && it.activity && ME.levels && ME.levels[it.activity.id]) { it.skill = ME.levels[it.activity.id]; it.skillFromProfile = true; }
  return it;
}

// ---------- intent graph (Ask screen) ----------

function facetList(it, empty) {
  const role = it.role === 'learner' ? ' · learning' : it.role === 'teacher' ? ' · teaching' : '';
  return [
    { key: 'what', k: 'What', v: it.activity ? it.activity.label : '?', state: !it.activity ? 'missing' : S.over.act ? 'edited' : '', pos: [50, 14] },
    { key: 'where', k: 'Where', v: placeText(it.place), state: S.over.place || S.over.radius ? 'edited' : it.place.assumed ? 'assumed' : '', pos: [75, 40] },
    { key: 'when', k: 'When', v: it.time.label, state: S.over.when ? 'edited' : it.time.assumed ? 'missing' : '', pos: [72, 84] },
    { key: 'who', k: 'Group', v: partyText(it.party), state: S.over.party ? 'edited' : it.party.assumed ? 'assumed' : '', pos: [28, 84] },
    { key: 'level', k: 'Level', v: (it.skill ? cap(it.skill) : 'Any level') + role, state: 'skill' in S.over ? 'edited' : it.skillFromProfile ? 'profile' : it.skill ? '' : 'assumed', pos: [25, 40] },
  ].map((f) => (empty ? { ...f, v: '?', state: 'missing' } : f));
}

function graphHTML(it, empty) {
  const fs = facetList(it, empty);
  const c = [50, 56];
  const lines = fs.map((f) => `<line class="ln ${f.state === 'missing' ? 'missing' : f.state === 'assumed' ? 'assumed' : ''}" x1="${c[0]}" y1="${c[1]}" x2="${f.pos[0]}" y2="${f.pos[1]}"/>`).join('');
  const nodes = fs.map((f) => `<button type="button" class="node ${f.state}" data-act="facet" data-v="${f.key}" style="left:${f.pos[0]}%;top:${f.pos[1]}%" aria-label="${f.k}: ${esc(f.v)}. Tap to change."><span class="k">${f.k}${f.state === 'assumed' ? ' · guess' : f.state === 'edited' ? ' · edited' : f.state === 'profile' ? ' · profile' : ''}</span><span class="v">${esc(f.v)}</span></button>`).join('');
  const centre = `<span class="node center" style="left:${c[0]}%;top:${c[1]}%">${it.party.have > 1 && !empty ? `You + ${it.party.have - 1}` : 'You'}</span>`;
  return `<div class="igraph" aria-label="Your ask as a graph"><svg class="lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>${centre}${nodes}</div>`;
}

function flagsHTML(it) {
  return it.flags.map((f) => {
    if (f.type === 'banned') return `<div class="notice bad" role="alert"><b>We can't post this ask</b>Keen is for doing activities together. Asks about sex, drugs or offensive content are blocked, and repeat attempts get the account reviewed.</div>`;
    if (f.type === 'money') return `<div class="notice bad" role="alert"><b>No money asks</b>Asks about payments, loans or investing are blocked. Money is the start of most scams, so Keen stays money-free.</div>`;
    return `<div class="notice warn" role="alert"><b>Home help isn't in the MVP</b>Jobs at someone's home combine money, an address and a stranger, which is where most scams and safety problems start. We'll revisit this once trust signals are proven.</div>`;
  }).join('');
}

function previewHTML() {
  const empty = !S.text.trim() && !S.over.act;
  if (empty) {
    return `<div class="try-row" aria-label="Example asks">${EXAMPLES.map((e, i) => `<button type="button" class="example" data-act="example" data-v="${i}">${esc(e)}</button>`).join('')}</div>${feedHTML()}`;
  }
  const it = currentIntent();
  let h = graphHTML(it, empty);
  h += `<div class="graph-legend"><span><i></i>understood</span><span><i class="d"></i>guess or missing</span><span>Tap any node to fix it</span></div>`;
  h += flagsHTML(it);
  if (!it.activity) h += `<div class="notice info"><b>What do you want to do?</b>We didn't catch an activity. Tap <em>What</em> to pick one, or add it to your ask.</div>`;
  if (it.missing.includes('when')) {
    h += `<div class="when-quick"><p class="eyebrow">When suits you?</p><div class="chips">${['Tonight', 'Tomorrow morning', 'This weekend', 'Weeknights'].map((w) => `<button type="button" class="chip" data-act="set-when" data-v="${w}">${w}</button>`).join('')}</div></div>`;
  }
  const ok = it.activity && !it.flags.length;
  const organising = ok && it.eventLike;
  const findBtn = `<button type="button" class="btn ${organising ? 'ghost' : ''}" data-act="find" ${ok ? '' : 'disabled'}>${it.missing.includes('when') ? 'Find people this week' : 'Find people'}</button>`;
  const postBtn = `<button type="button" class="btn ${organising ? '' : 'ghost'}" data-act="compose" ${ok ? '' : 'disabled'}>Post as a plan</button>`;
  if (organising) h += `<div class="notice info"><b>Sounds like you're organising</b>Post it as a plan with a time and a public venue. We tell the people who fit, and it shows in their feed.</div>`;
  h += `<div class="btn-pair">${organising ? postBtn + findBtn : findBtn + postBtn}</div>`;
  return h;
}

function updatePreview() {
  const p = $('#preview');
  if (p) p.innerHTML = previewHTML();
  const clear = $('#clearAsk');
  if (clear) clear.hidden = !S.text;
  renderNotes();
}

// ---------- views ----------

const VIEWS = {};

VIEWS.ask = () => `
  ${bar('Keen', false, `<span class="muted small">Near ${ME.suburb}</span>`, { noLarge: true })}
  <div class="pad">
    <div><p class="eyebrow">Hi ${ME.name}</p><h1 class="h1">What do you want to do?</h1></div>
    <div class="ask-box">
      <label for="askInput" class="eyebrow" hidden>Your ask</label>
      <textarea id="askInput" rows="3" placeholder="e.g. Padel Saturday morning, we're two looking for two more">${esc(S.text)}</textarea>
      <div class="ask-hint"><span>Say what, where and when. Plain English is fine.</span><button type="button" class="link-btn" id="clearAsk" data-act="clear" ${S.text ? '' : 'hidden'}>Clear</button></div>
    </div>
    <div id="preview" style="display:grid;gap:12px">${previewHTML()}</div>
  </div>`;

function matchGraphSVG(it, r) {
  const facets = [
    ['what', 'WHAT', it.activity.label],
    ['where', 'WHERE', placeText(it.place)],
    ['when', 'WHEN', it.time.label],
    ['level', 'LEVEL', it.skill ? cap(it.skill) : 'Any level'],
    ['who', 'GROUP', partyText(it.party)],
  ];
  const nodes = [
    ...r.plans.slice(0, 2).map((x) => ({ type: 'plan', id: x.plan.id, label: x.plan.title, p: PERSON[x.plan.org], fit: x.fit })),
    ...r.people.slice(0, 4).map((x) => ({ type: 'person', id: x.person.id, label: x.person.name, p: x.person, fit: x.fit })),
  ].sort((a, b) => b.fit.score - a.fit.score).slice(0, 5);
  const W = 340, rowF = 44, H = Math.max(facets.length * rowF, nodes.length * 52) + 8;
  const fy = (i) => ((i + 0.5) * H) / facets.length;
  const ny = (j) => ((j + 0.5) * (H - 14)) / nodes.length;
  const cx = W - 46;
  let left = '', right = '';
  facets.forEach(([key, k, v], i) => {
    const y = fy(i);
    left += `<rect class="mg-pill" x="6" y="${y - 16}" width="140" height="32" rx="9"/><text class="mg-k" x="16" y="${y - 3}">${k}</text><text class="mg-v" x="16" y="${y + 10}">${esc(trunc(v, 22))}</text>`;
  });
  nodes.forEach((n, j) => {
    const y = ny(j);
    let paths = '';
    n.fit.reasons.forEach((rs) => {
      const i = facets.findIndex((f) => f[0] === rs.key);
      if (i < 0) return;
      paths += `<path class="mg-edge ${rs.ok ? '' : 'partial'}" d="M146 ${fy(i)} C 220 ${fy(i)}, 220 ${y}, ${cx - 17} ${y}"/>`;
    });
    const shape = n.type === 'plan'
      ? `<rect x="${cx - 15}" y="${y - 15}" width="30" height="30" rx="7" style="fill:hsl(${n.p.hue} 48% var(--av-l))"/>`
      : `<circle cx="${cx}" cy="${y}" r="15" style="fill:hsl(${n.p.hue} 48% var(--av-l))"/>`;
    right += `<g class="mg-node mg-hit${j === 0 ? ' top' : ''}" data-act="${n.type}" data-v="${n.id}">${paths}${shape}<text class="mg-init" x="${cx}" y="${y + 4}" text-anchor="middle">${esc(n.p.name[0])}</text><text class="mg-name" x="${cx}" y="${y + 27}" text-anchor="middle">${esc(trunc(n.label, 14))}</text></g>`;
  });
  return `<svg viewBox="0 0 ${W} ${H + 6}" role="img" aria-label="How your ask connects to the top matches">${left}${right}</svg>`;
}

function personCard(x) {
  const p = x.person, invited = S.invited.has(p.id);
  return `<article class="card tap" data-act="person" data-v="${p.id}">
    <div class="row">${avatar(p)}<div class="grow"><div class="name">${esc(p.name)}</div><div class="muted small">${esc(p.suburb)} · ${levelLabel(p.levels[x.ask.act]) || 'New to it'} · ${plural(p.events, 'plan')}</div></div>${gw(p.points)}</div>
    <p class="quote">${esc(x.ask.text)}</p>
    ${reasonsHTML(x.fit.reasons)}
    <div class="foot"><span class="stats">${x.ask.have > 1 ? `${x.ask.have} of them · ` : ''}${p.idVerified ? 'ID verified' : 'Phone verified'}</span>
      <button type="button" class="btn sm ${invited ? 'done' : 'sea'}" data-act="invite" data-v="${p.id}" ${invited ? 'disabled' : ''}>${invited ? 'Invited' : 'Invite'}</button></div>
  </article>`;
}

function planCard(x) {
  const g = x.plan, org = PERSON[g.org], asked = !!myStatus(g);
  return `<article class="card tap" data-act="plan" data-v="${g.id}">
    <div class="row"><div class="grow"><p class="eyebrow">${esc(ACT[g.act].label)} · group</p><div class="h3">${esc(g.title)}</div><div class="muted small">${esc(g.venue)}</div></div></div>
    <div class="row">${spots(g.members.length, g.size)}<span class="small muted num">${g.members.length}/${g.size}</span></div>
    ${reasonsHTML(x.fit.reasons)}
    <div class="foot"><span class="row small">${avatar(org, 's')}<span>Run by ${esc(org.name)} ${gw(org.points)}</span></span>
      <button type="button" class="btn sm ${asked ? 'done' : 'sea'}" data-act="join" data-v="${g.id}" ${asked ? 'disabled' : ''}>${asked ? STATUS_LABEL[myStatus(g)] : g.approve ? 'Ask to join' : 'Join'}</button></div>
  </article>`;
}

VIEWS.results = () => {
  const it = S.intent, r = S.result;
  const people = r.people.filter((x) => !S.hidden.has(x.person.id));
  const any = people.length || r.plans.length;
  const echo = [it.activity.label, placeText(it.place), it.time.label, partyText(it.party), it.skill ? cap(it.skill) : null].filter(Boolean);
  let h = bar('Matches') + `<div class="pad">
    <div class="echo">${echo.map((e) => `<span>${esc(e)}</span>`).join('')}</div>`;

  if (any) {
    h += `<div class="mgraph">${matchGraphSVG(it, { ...r, people })}</div>
      <div class="graph-legend"><span><i></i>fits your ask</span><span><i class="d"></i>close</span><span>Brightest lines: best match. Hover to compare.</span></div>`;
  }

  const sg = r.suggestion;
  // Only suggest a new group when it gets you at least halfway, or when there's no group to join instead.
  const worthIt = sg && (sg.filled / sg.total >= 0.5 || !r.plans.length);
  if (worthIt && sg.members.every((m) => !S.hidden.has(m.person.id))) {
    const names = [it.party.have > 1 ? `You + ${it.party.have - 1}` : 'You', ...sg.members.map((m) => m.person.name)];
    const nameList = names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    const done = S.myPlans.some((p) => p.fromSuggestion === it.raw);
    h += `<article class="card suggest">
      <p class="eyebrow muted">Keen can make this happen</p>
      <div class="h3">${esc(nameList)}: ${sg.filled} of ${sg.total} for ${esc(it.activity.label.toLowerCase())}</div>
      <div class="row"><span class="stack">${avatar(ME, 's')}${sg.members.map((m) => avatar(m.person, 's')).join('')}</span>${spots(sg.filled - it.party.have, sg.total, it.party.have)}</div>
      <p class="small muted" style="margin:0">Everyone is free ${esc(fmtSlot(sg.when, NOW))}. We'll send one plan to all of them; it goes ahead when they say yes.</p>
      <button type="button" class="btn ${done ? 'done' : ''}" data-act="propose" ${done ? 'disabled' : ''}>${done ? 'Plan proposed' : 'Propose this plan'}</button>
    </article>`;
  }

  if (r.plans.length) h += `<div class="section-h"><h3 class="h3">Groups looking for people</h3><span class="small muted num">${r.plans.length}</span></div>${r.plans.map(planCard).join('')}`;
  if (people.length) h += `<div class="section-h"><h3 class="h3">Keen right now</h3><span class="small muted num">${people.length}</span></div>${people.map(personCard).join('')}`;

  const n = r.passive.length;
  if (!any) {
    h += `<div class="card empty"><span class="ring">0</span><div class="h3">Nobody has asked for this yet</div>
      <p class="small muted" style="margin:0;max-width:30ch">${n
        ? `Save your ask and we'll send it to ${plural(n, 'person')} nearby who ${n === 1 ? 'lists' : 'list'} ${esc(it.activity.label.toLowerCase())}. You'll hear the moment someone says yes.`
        : `No one nearby lists ${esc(it.activity.label.toLowerCase())} yet. Save your ask and it stays open for 7 days; the first matching ask gets connected to you.`}</p>
      ${!it.place.remote && it.place.radius < 20 ? `<button type="button" class="btn sm ghost" data-act="widen">Widen to ${it.place.radius < 10 ? 10 : 20} km</button>` : ''}</div>`;
  }
  if (n) {
    h += `<div class="card reach"><span class="big num">${n}</span><div class="h3">might be keen</div>
      <p class="small muted" style="margin:0">${n === 1 ? 'person lists' : 'people list'} ${esc(it.activity.label.toLowerCase())} within ${it.place.radius} km but hasn't asked. We don't show who; we pass your ask on.</p>
      <label class="toggle" style="grid-column:1/-1;margin-top:6px"><input type="checkbox" id="reachOut" data-act="reach" ${S.reachOut ? 'checked' : ''}>Send my ask to them</label></div>`;
  }
  h += `</div><div class="sticky-cta"><button type="button" class="btn block" data-act="save-ask">${any ? 'Save ask and notify me' : 'Save my ask'}</button><button type="button" class="link-btn" data-act="compose-from-results" style="justify-self:center">Post it as a plan instead</button></div>`;
  return h;
};

function funnelHTML(a) {
  const max = Math.max(1, a.sent);
  const rows = [['Sent', a.sent], ['Seen', a.seen], ['Keen', a.keen], ['Passed', a.passed]];
  return `<div class="funnel">${rows.map(([k, n]) => `<div><span class="muted">${k}</span><span class="track"><span class="fill" style="display:block;width:${(n / max) * 100}%"></span></span><span class="num">${n}</span></div>`).join('')}</div>`;
}

VIEWS.myask = ({ v: id }) => {
  const a = S.myAsks.find((x) => x.id === id);
  return bar('Your ask') + `<div class="pad">
    <div><p class="eyebrow">Saved ${esc(a.created)}</p><h1 class="h1" style="font-size:24px">${esc(a.text)}</h1></div>
    <div class="echo">${a.summary.split(' · ').map((s) => `<span>${esc(s)}</span>`).join('')}</div>
    <div class="card"><p class="eyebrow">Reach-out</p>${funnelHTML(a)}</div>
    <p class="small muted" style="margin:0">We reach out in waves: people with a matching open ask first, then people nearby who list the activity. Nobody sees your ask twice, and nobody gets more than 3 asks a week from Keen.</p>
    ${a.keen ? `<div class="notice info"><b>${plural(a.keen, 'person')} said keen</b>Open their profile to accept, or propose a plan to all of them.</div>` : `<div class="notice warn"><b>No one yet</b>Your ask stays open for 7 days. We'll tell you when someone says yes.</div>`}
    <button type="button" class="btn block ghost" data-act="edit-ask" data-v="${id}">Edit and search again</button>
    <button type="button" class="link-btn" data-act="close-ask" data-v="${id}" style="justify-self:center">Close this ask</button>
  </div>`;
};

const GOOD_TAGS = POSITIVE_TAGS;
const BAD_TAGS = NEGATIVE_TAGS;

VIEWS.feedback = ({ v: id }) => {
  const g = findPlan(id);
  if (!S.fb) S.fb = { stars: 0, people: Object.fromEntries(g.members.filter((m) => m !== 'me').map((m) => [m, { came: true, vibe: null, tags: [] }])) };
  const fb = S.fb;
  const ready = fb.stars > 0;
  return bar('How was it?') + `<div class="pad">
    <div><p class="eyebrow">${esc(fmtSlot(resolveWhen(g.when, NOW)[0], NOW))}</p><h1 class="h1" style="font-size:24px">${esc(g.title)}</h1><div class="small muted">${esc(g.venue)}</div></div>
    <div class="card"><div class="h3">Rate the plan</div><div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-act="fb-star" data-v="${n}" aria-pressed="${n <= fb.stars}" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('')}</div></div>
    <div class="card" style="gap:0"><div class="h3" style="margin-bottom:4px">The people</div>
      ${Object.entries(fb.people).map(([pid, st]) => {
        const p = PERSON[pid];
        const tags = st.vibe === 'bad' ? BAD_TAGS : GOOD_TAGS;
        return `<div class="fb-row"><div class="row">${avatar(p, 's')}<b class="grow">${esc(p.name)}</b>
          <span class="seg"><button type="button" data-act="fb-came" data-v="${pid}:1" aria-pressed="${st.came}">Came</button><button type="button" data-act="fb-came" data-v="${pid}:0" aria-pressed="${!st.came}">No-show</button></span></div>
          ${st.came ? `<div class="row"><span class="seg"><button type="button" data-act="fb-vibe" data-v="${pid}:good" aria-pressed="${st.vibe === 'good'}">Good</button><button type="button" data-act="fb-vibe" data-v="${pid}:bad" aria-pressed="${st.vibe === 'bad'}">Not great</button></span></div>
          ${st.vibe ? `<div class="chips">${tags.map((tg) => `<button type="button" class="chip" data-act="fb-tag" data-v="${pid}:${tg}" aria-pressed="${st.tags.includes(tg)}">${tg}</button>`).join('')}</div>` : ''}` : ''}
          ${st.vibe === 'bad' || !st.came ? '<p class="small muted" style="margin:0">Only Keen sees this. It never shows on their profile as written.</p>' : ''}
        </div>`;
      }).join('')}
    </div>
    <button type="button" class="btn block" data-act="fb-submit" ${ready ? '' : 'disabled'}>${ready ? 'Send feedback · +20 Goodwill' : 'Rate the plan to send'}</button>
    <button type="button" class="link-btn" data-act="report-who" data-v="${id}" style="justify-self:center;color:var(--flag)">Something serious happened? Report privately</button>
  </div>`;
};

// ---------- sheets ----------

function sheet(html) {
  $('#overlay').innerHTML = `<div class="scrim" data-act="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
}
function closeSheet() { $('#overlay').innerHTML = ''; }

let toastTimer;
// opts.undo: an action name; the toast then carries an Undo button that runs it.
function toast(msg, opts = {}) {
  closeSheet();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  if (opts.undo) el.insertAdjacentHTML('beforeend', ` <button type="button" class="toast-undo" data-act="${opts.undo}" data-v="${esc(opts.v || '')}">Undo</button>`);
  $('#phone').appendChild(el);
  clearTimeout(toastTimer);
  document.querySelectorAll('.toast').forEach((t) => t !== el && t.remove());
  toastTimer = setTimeout(() => el.remove(), 3600);
}

const WHEN_PRESETS = ['Tonight', 'Tomorrow morning', 'Tomorrow after work', 'Saturday morning', 'Saturday afternoon', 'Sunday morning', 'This weekend', 'Weeknights', 'Next 7 days'];

function facetSheet(key) {
  const it = currentIntent();
  if (key === 'what') {
    const groups = {};
    ACTIVITIES.forEach((a) => (groups[a.group] ||= []).push(a));
    return sheet(`<div class="h3">What do you want to do?</div>
      ${Object.entries(groups).map(([g, xs]) => `<p class="eyebrow">${g}</p><div class="chips">${xs.map((a) => `<button type="button" class="chip" data-act="set-act" data-v="${a.id}" aria-pressed="${it.activity && it.activity.id === a.id}">${a.label}</button>`).join('')}</div>`).join('')}
      <p class="small muted" style="margin:0">Tags are a fixed list so asks can meet. "Soccer" and "football" are the same tag. Unknown words go to review and can become new tags.</p>`);
  }
  if (key === 'where') {
    return sheet(`<div class="h3">Where?</div>
      <div class="chips">${['Online', ...PLACES.map((p) => p.name)].map((n) => `<button type="button" class="chip" data-act="set-place" data-v="${n}" aria-pressed="${it.place.name === n}">${n}</button>`).join('')}</div>
      <p class="eyebrow">How far will you go?</p>
      <div class="chips">${[2, 5, 10, 20].map((r) => `<button type="button" class="chip" data-act="set-radius" data-v="${r}" aria-pressed="${it.place.radius === r}">${r} km</button>`).join('')}</div>
      <button type="button" class="btn block ghost" data-act="close-sheet">Done</button>`);
  }
  if (key === 'when') {
    return sheet(`<div class="h3">When?</div><div class="chips">${WHEN_PRESETS.map((w) => `<button type="button" class="chip" data-act="set-when" data-v="${w}" aria-pressed="${S.over.when === w}">${w}</button>`).join('')}</div>
      <p class="small muted" style="margin:0">Or type a time in your ask, like "Sunday 19:00–20:00" or "10/05 – 12/05".</p>`);
  }
  if (key === 'who') {
    const p = it.party;
    return sheet(`<div class="h3">Who's coming?</div>
      <div class="stepper"><span>We are</span><span class="ctl"><button type="button" class="icon-btn" data-act="party" data-v="have:-1" aria-label="Fewer">−</button><b>${p.have}</b><button type="button" class="icon-btn" data-act="party" data-v="have:1" aria-label="More">+</button></span></div>
      <div class="stepper"><span>Looking for</span><span class="ctl"><button type="button" class="icon-btn" data-act="party" data-v="seek:-1" aria-label="Fewer">−</button><b>${p.seek}</b><button type="button" class="icon-btn" data-act="party" data-v="seek:1" aria-label="More">+</button></span></div>
      <p class="small muted" style="margin:0">Coming as a group? Your friends join the plan with you, and the people you meet see you're ${p.have > 1 ? `${p.have} together` : 'on your own'}.</p>
      <button type="button" class="btn block ghost" data-act="close-sheet">Done</button>`);
  }
  if (key === 'level') {
    return sheet(`<div class="h3">What level?</div><div class="chips">${[null, ...SKILLS].map((s) => `<button type="button" class="chip" data-act="set-skill" data-v="${s || ''}" aria-pressed="${it.skill === s}">${s ? cap(s) : 'Any level'}</button>`).join('')}</div>`);
  }
}

function reportSheet(id) {
  const p = PERSON[id];
  sheet(`<div class="h3">Report ${esc(p.name)}</div>
    <p class="small muted" style="margin:0">${esc(p.name)} won't know you reported them. Two independent reports pause their plans while we review.</p>
    <div class="chips">${['Fake profile', 'Asked for money', 'Wanted to move off Keen', 'Inappropriate messages', 'Made me feel unsafe', 'No-show'].map((r) => `<button type="button" class="chip" data-act="report-pick" data-v="${r}">${r}</button>`).join('')}</div>
    <button type="button" class="btn block" data-act="report-send" data-v="${id}">Report and block</button>
    <button type="button" class="btn block ghost" data-act="close-sheet">Cancel</button>`);
}

// ---------- actions ----------

function runSearch() {
  S.intent = currentIntent();
  S.result = match(S.intent, { now: NOW });
  S.tab = 'ask';
  S.stack = [{ name: 'results' }];
  render();
}

function addPoints(pts, text) {
  S.points = Math.max(0, S.points + pts);
  S.ledger.unshift({ text, pts });
}

function summaryOf(it) {
  return [it.activity.label, placeText(it.place), it.time.label, partyText(it.party)].join(' · ');
}

function simulateReplies(a) {
  if (!a.sent) return;
  setTimeout(() => { a.seen = Math.max(1, Math.round(a.sent * 0.6)); if (view().name === 'activity' || view().name === 'myask') render(); }, 2500);
  setTimeout(() => {
    a.keen = Math.min(2, a.sent); a.passed = a.sent > 3 ? 1 : 0; a.seen = Math.max(a.seen, a.keen + a.passed);
    updateBadge();
    if (view().name === 'activity' || view().name === 'myask') render();
    toast(`${plural(a.keen, 'person')} said keen to "${trunc(a.text, 28)}"`);
  }, 6000);
}

const ACTIONS = {
  tab: (v) => setTab(v),
  back: () => back(),
  example: (v) => { S.text = EXAMPLES[+v]; S.over = {}; render(); },
  clear: () => { S.text = ''; S.over = {}; render(); $('#askInput').focus(); },
  facet: (v) => facetSheet(v),
  'close-sheet': () => closeSheet(),
  'set-act': (v) => { S.over.act = v; closeSheet(); updatePreview(); flash('what'); },
  'set-place': (v) => { S.over.place = v; facetSheet('where'); updatePreview(); },
  'set-radius': (v) => { S.over.radius = +v; facetSheet('where'); updatePreview(); },
  'set-when': (v) => { S.over.when = v; closeSheet(); updatePreview(); flash('when'); },
  'set-skill': (v) => { S.over.skill = v || null; closeSheet(); updatePreview(); flash('level'); },
  party: (v) => {
    const [k, d] = v.split(':');
    const p = { ...currentIntent().party };
    p[k] = Math.min(k === 'have' ? 8 : 20, Math.max(1, p[k] + +d));
    S.over.party = { have: p.have, seek: p.seek };
    facetSheet('who'); updatePreview();
  },
  find: () => runSearch(),
  widen: () => { S.over.radius = S.intent.place.radius < 10 ? 10 : 20; if (!S.text) S.text = S.intent.raw; runSearch(); },
  person: (v) => go('person', v),
  plan: (v) => go('plan', v),
  myask: (v) => go('myask', v),
  invite: (v) => {
    S.invited.add(v);
    toast(`Invite sent to ${PERSON[v].name}. You can chat once they accept.`);
    render();
  },
  propose: () => {
    const it = S.intent, sg = S.result.suggestion;
    const id = 'mine' + (S.myPlans.length + 1);
    S.myPlans.unshift({
      id, mine: true, fromSuggestion: it.raw, org: 'me', act: it.activity.id, title: `${it.activity.label} with ${sg.members.map((m) => m.person.name).join(' & ')}`,
      place: it.place.remote ? 'Online' : it.place.name, venue: it.place.remote ? 'Video call' : `${it.place.name} (venue to agree)`, slots: [sg.when],
      members: ['me'], size: sg.total, skill: it.skill || 'casual', sent: sg.members.length, seen: 0, keen: 0, passed: 0,
    });
    S.chat[id] = [{ sys: true, text: 'Plan proposed. Everyone you invited can see this chat once they say yes.' }];
    sg.members.forEach((m) => S.invited.add(m.person.id));
    toast(`Plan sent to ${sg.members.map((m) => m.person.name).join(' and ')}.`);
    updateBadge(); render();
  },
  reach: (v, el) => { S.reachOut = el.checked; },
  'save-ask': () => {
    const it = S.intent, r = S.result;
    const sent = r.people.length + (S.reachOut ? r.passive.length : 0);
    const a = { id: 'r' + Date.now(), text: it.raw.trim() || summaryOf(it), summary: summaryOf(it), sent, seen: 0, keen: 0, passed: 0, created: 'just now' };
    S.myAsks.unshift(a);
    simulateReplies(a);
    S.text = ''; S.over = {};
    setTab('activity');
    toast(sent ? `Saved. We're sending it to ${plural(sent, 'person')}.` : "Saved. We'll tell you when someone asks for the same thing.");
  },
  'edit-ask': (v) => { const a = S.myAsks.find((x) => x.id === v); S.text = a.text; S.over = {}; setTab('ask'); },
  'close-ask': (v) => { S.myAsks = S.myAsks.filter((x) => x.id !== v); back(); toast('Ask closed. No one else will receive it.'); },
  feedback: (v) => go('feedback', v),
  'fb-star': (v) => { S.fb.stars = +v; render(true); },
  'fb-came': (v) => { const [p, c] = v.split(':'); S.fb.people[p].came = c === '1'; if (c === '0') { S.fb.people[p].vibe = null; S.fb.people[p].tags = []; } render(true); },
  'fb-vibe': (v) => { const [p, c] = v.split(':'); const st = S.fb.people[p]; if (st.vibe !== c) st.tags = []; st.vibe = c; render(true); },
  'fb-tag': (v) => { const i = v.indexOf(':'); const p = v.slice(0, i), tg = v.slice(i + 1); const t = S.fb.people[p].tags; t.includes(tg) ? t.splice(t.indexOf(tg), 1) : t.push(tg); render(true); },
  'fb-submit': () => {
    S.feedbackDone = true;
    for (const [pid, st] of Object.entries(S.fb.people)) if (st.came && st.vibe) S.ratings[pid] = st.vibe;
    CTX = null;
    PAST_PLANS[0].rated = S.fb.stars;
    PAST_PLANS[0].confirmed = true;
    addPoints(20, 'Left feedback: Friday 6-a-side');
    setTimeout(() => {
      FEEDBACK_ABOUT_ME.reviews += 1;
      ['On time', 'Good sport'].forEach((t) => { FEEDBACK_ABOUT_ME.tags[t] += 1; });
      CTX = null;
      addPoints(10, 'Good review from Ben: On time, Good sport');
      if (view().name === 'me') render(true);
      toast('Ben said you were on time and a good sport. +10 Goodwill.');
    }, 8000);
    setTimeout(() => { addPoints(50, 'Attended Friday 6-a-side, confirmed by Luca'); if (view().name === 'me') render(); toast('Luca confirmed you came: +50 Goodwill'); }, 4000);
    S.fb = null; S.stack = []; S.tab = 'activity';
    updateBadge(); render();
    toast('+20 Goodwill. Your +50 for turning up lands when someone confirms you came.');
  },
  again: (v) => {
    const g = findPlan(v);
    if (g.org === 'me') { startClone(v); return; }
    toast(`Sent to the ${g.members.length - 1} people who came. It's on once 6 say yes.`);
  },
  report: (v) => reportSheet(v),
  'report-who': (v) => {
    const g = findPlan(v);
    sheet(`<div class="h3">Who do you want to report?</div><div style="display:grid;gap:4px">${g.members.filter((m) => m !== 'me').map((m) => `<button type="button" class="member" style="background:none;border-left:0;border-right:0;border-bottom:0;text-align:left" data-act="report" data-v="${m}">${avatar(PERSON[m], 's')}<b>${esc(PERSON[m].name)}</b></button>`).join('')}</div><button type="button" class="btn block ghost" data-act="close-sheet">Cancel</button>`);
  },
  'report-pick': (v, el) => { el.setAttribute('aria-pressed', el.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); },
  'report-send': (v) => {
    S.hidden.add(v);
    CTX = null;
    toast(`Reported. You won't see ${PERSON[v].name} again.`);
    if (view().name === 'person') back(); else render();
  },
  verify: () => { S.idVerified = true; ME.idVerified = true; addPoints(GOODWILL_RULES.idVerified, 'Verified ID'); render(true); toast('ID verified: +100 Goodwill'); },
};

function flash(key) {
  const n = document.querySelector(`.node[data-v="${key}"]`);
  if (n) { n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash'); }
}

function updateBadge() {
  const n = needsYou().length + S.myAsks.filter((a) => a.keen).length + threadsList().reduce((k, t) => k + unread(t.g.id), 0);
  const b = $('#planBadge');
  b.hidden = !n; b.textContent = n;
}

// ---------- render ----------

function render(keepScroll = false) {
  const scr = $('#screen');
  const y = scr.scrollTop;
  const v = view();
  scr.innerHTML = VIEWS[v.name](v);
  scr.scrollTo({ top: keepScroll ? y : v.name === 'thread' ? scr.scrollHeight : 0, behavior: 'instant' });
  $('#phone').classList.toggle('no-tabs', ['onboard', 'thread'].includes(v.name));
  if (v.name === 'onboard') obAfterRender();
  document.querySelectorAll('#tabs button').forEach((b) => {
    if (b.dataset.v === S.tab) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  updateBadge();
  renderNotes();
}

// ---------- design notes ----------

function intentShape() {
  const it = currentIntent();
  if (!S.text.trim() && !S.over.act) return '';
  const lines = [
    `what   ${it.activity ? `${it.activity.id}   (heard "${it.activity.heard}", ${CATEGORIES[it.activity.cat].toLowerCase()})` : '?'}`,
    `where  ${it.place.remote ? 'online' : `${it.place.name}, ${it.place.radius} km${it.place.assumed ? '   (home suburb)' : ''}`}`,
    `when   ${it.time.label}   (${plural(it.time.slots.length, 'slot')})`,
    `group  have ${it.party.have}, need ${it.party.seek}${it.party.assumed ? '   (usual size)' : ''}`,
    `level  ${it.skill || 'any'}${it.role ? `, ${it.role}` : ''}`,
    `flags  ${it.flags.length ? it.flags.map((f) => f.type).join(', ') : 'none'}`,
  ];
  return `<div class="note-block"><h3>What the parser heard</h3><pre class="shape">${esc(lines.join('\n'))}</pre></div>`;
}

const NOTES = {
  explore: {
    title: 'Browse and recommendations',
    body: `<ul>
      <li><b>For you</b> ranks open plans by how you connect to them in the graph: activities you list and actually turn up to, distance, whether it fits your free time, your level, people you've played with who are going, how close it is to filling, and the organiser's Goodwill.</li>
      <li>Plans that clash with your private avoid list are held back, with a count and a way to show them.</li>
      <li>A plan at the same time as one you're going to drops down and says "Clashes with …". The top of the list is mixed so one activity can't fill it.</li>
      <li>The "⋯" on a For you card: <b>Not for me</b> hides the plan, <b>Show fewer</b> lowers that activity. Both have Undo and a Reset. The organiser is never told.</li>
      <li>Browse rows have fixed rules, shown under each title: next 48 hours, this weekend, needs one or two more, good for beginners, after work. "See all" opens search with that filter.</li>
      <li><b>Browse by day</b> and <b>by activity</b> show counts within your travel radius. Activities with nothing on are greyed, not hidden.</li>
      <li><b>Map</b> pins venues with the number of open plans; close pins group until you zoom in. A venue has directions and "Start one here". People are never on the map.</li>
      <li>You can browse and search events. You can never browse or search people.</li>
    </ul>`,
  },
  search: {
    title: 'Search is the ask parser',
    body: `<ul>
      <li>The box uses the same plain-English parser as Ask. "padel this weekend" becomes removable chips. Only what you typed narrows results; your profile ranks them.</li>
      <li>Typos and local names are repaired: try "padle", "tenis" or "footy". Time and level words never become text filters, so "tonight" or "something sunday morning" just work.</li>
      <li>"before work" with no day means the next 7 days. "manly oval" filters to the venue. "padel within 2km" sets the distance.</li>
      <li>Typeahead shows activities, venues and suburbs with how many plans each has. Filters (the button by the box) adds when, distance, level, spots left and join straight away. Sort by best, soonest or nearest.</li>
      <li>Zero is never a dead end: "padel 7am" shows padel at other times, "surf in bondi" shows surfing further away, "yoga" is logged as demand.</li>
      <li>Try "Mia": people can't be searched, and it says so. "Notify me" saves a private search that tells you when a matching plan is posted.</li>
    </ul>`,
  },
  thread: {
    title: 'One thread per plan',
    body: `<ul>
      <li>Every plan has one message thread. You're in it as soon as you say you're interested, ask to join or join. You leave it when you leave the plan.</li>
      <li>The organiser's pinned card keeps the time, venue and meeting point at the top.</li>
      <li>Everyone in the thread sees every message. There are no private messages with people you haven't met.</li>
      <li>Phone numbers, emails, links, other apps and payment talk are hidden until people have met once. Try typing a number.</li>
      <li>Reply to a specific message to keep questions and answers together. In this demo the organiser answers common questions about where to meet, parking and what to bring.</li>
    </ul>`,
  },
  rollcall: {
    title: 'Marking attendance',
    body: `<ul>
      <li>Attendance is what Goodwill is built on, so it needs two sides: people check in when they arrive, and the organiser or another attendee confirms.</li>
      <li>The organiser's roll call shows who checked in. Those people start as Came; anyone who didn't check in must be marked Came, Late or No-show before it can be confirmed, so Goodwill is never given by default.</li>
      <li>Confirming gives everyone who came (late included) +50, and the organiser +100 if 3 or more came. The plan page then shows the summary.</li>
      <li>On the day, once you've checked in, <b>Who's here</b> lets you confirm others you can see. Try Check-in: Mia is waiting for a confirm.</li>
      <li>A no-show only costs Goodwill when a second person reports it too, so one grudge can't hurt anyone.</li>
      <li>Plans without a roll call 24 hours after the end fall back to check-ins confirmed by any other attendee.</li>
    </ul>`,
  },
  history: {
    title: 'History',
    body: `<ul>
      <li>Every plan you went to or hosted, newest first, with the rating you gave and anything still due.</li>
      <li>History builds the graph: activities you actually turn up to rank higher than ones you only list, and people you've played with show up in "who's going".</li>
      <li>Other people see only your counts per activity, never where or when. A full history would show someone's routine.</li>
    </ul>`,
  },
  onboard: {
    title: 'Onboarding is a conversation',
    body: `<ul>
      <li>New members talk to an agent instead of filling in forms. It asks one thing at a time: name, what they like doing, how they rate themselves, where they are, age, what they want from Keen, what to avoid, and when they're free.</li>
      <li>The profile card above the chat fills in as they talk. It's the source of truth: every fact is visible and removable, and nothing is saved that they can't see.</li>
      <li>Age and the avoid list are private. They only filter suggestions ("no alcohol" hides plans at licensed venues) and never appear on the profile.</li>
      <li>Levels are self-rated in plain words ("pretty decent", "7 out of 10") and mapped to four levels. Feedback after plans corrects them over time.</li>
      <li>Under 18s are stopped kindly. Surname, phone, email and address are never asked for.</li>
      <li>Quick replies under the chat mean nobody has to type on a phone.</li>
    </ul>`,
  },
  compose: {
    title: 'Creating and editing a plan',
    body: `<ul>
      <li>The same screen edits a plan you host. Everything can change except the activity once someone else has joined, and spots can't drop below the number going. Everyone in the plan gets a thread message listing what changed.</li>
      <li><b>Who can find it</b>: anyone nearby (Explore, search and suggestions) or only people you invite.</li>
      <li>Start from an ask ("Post as a plan"), from Explore or from the Plans tab. Starting fresh asks for the activity first.</li>
      <li><b>Directions</b>: picking a venue shows its card with distance and Apple and Google Maps links, and fills in the meeting point and how to get there (transport and parking). Both can be edited.</li>
      <li><b>Already on?</b> If the same activity is on within 2 km around the same time, Keen shows it and asks you to tap "Post mine anyway". Try football, Friday, 6pm, Manly Oval.</li>
      <li>Today is offered while there's a start time at least an hour away. A plan can repeat weekly. The preview shows the card as it will appear in Explore.</li>
      <li>A plan is an ask made specific: a fixed start time, a public venue and spots to fill. Typing "Football Friday 6pm at Manly Oval, we're 4, need 7" offers this flow first.</li>
      <li>Venues come from a list of public places. Licensed venues are marked, and people who avoid alcohol never see those plans.</li>
      <li>Before you post you see who it reaches: people with a matching ask are told now, people who might be keen hear about it within their weekly cap, and it appears in the feed for people nearby.</li>
      <li>Notes are screened like chat. Phone numbers, links and payment talk block posting. Plans are free to join.</li>
      <li>Organisers approve who joins by default. Plans over 6 people need ID or the Regular level (200+ Goodwill).</li>
    </ul>`,
  },
  ask: {
    title: 'One box, no search',
    body: `<ul>
      <li><b>Happening near you.</b> Below the box is a feed of open plans, ranked by your interests, your level, how soon they are and how close they are to filling. You can browse events. You can never browse people.</li>
      <li>Plans that clash with your private avoid list are held back, with a count and a way to show them.</li>
      <li>A plan at the same time as one you're going to drops down and says "Clashes with …". The top of the list is mixed so one activity can't fill it.</li>
      <li>The "⋯" on a For you card: <b>Not for me</b> hides the plan, <b>Show fewer</b> lowers that activity. Both have Undo and a Reset. The organiser is never told.</li>
      <li>People don't browse other people. They say what they want and Keen does the finding. From the notebook: <em>"We don't have search. You ask, we reach out to people that may be interested."</em></li>
      <li>The sentence becomes a small graph with five nodes: what, where, when, group, level. Activity and time are required. Place falls back to your home suburb.</li>
      <li>Every node is a tap target. When the parser gets something wrong you fix one node instead of retyping, so the UI never boxes in what someone can ask for. Dashed nodes are guesses.</li>
      <li>Synonyms collapse to one tag (soccer and football, paddle and padel) so asks can meet each other.</li>
      <li>Screening happens before anything is sent. Asks about sex, drugs or money are blocked. Home-help jobs are out of scope for the MVP.</li>
    </ul>`,
  },
  results: {
    title: 'Three ways to say yes',
    body: `<ul>
      <li><b>Groups looking for people.</b> Plans that already have a crew and need more, like "Football Friday Manly, need 7".</li>
      <li><b>Keen right now.</b> People whose open ask overlaps yours on activity, distance and time. Each card says why it matched.</li>
      <li><b>Might be keen.</b> People who list the activity nearby but haven't asked. We never show them. We pass the ask on, and they choose whether to reveal themselves.</li>
      <li><b>Suggested plan.</b> When individual asks add up to the group you need, Keen proposes one plan for all of you. This is where individual asks and group plans merge.</li>
      <li>No match is never a dead end. The ask is saved, sent to the might-be-keen pool, and you hear when someone says yes.</li>
      <li>In the graph, a solid edge means the match meets that part of your ask and a dashed one means it's close.</li>
    </ul>`,
  },
  person: {
    title: 'Enough to decide, nothing to stalk',
    body: `<ul>
      <li>Every profile uses the same layout as yours: a big photo (or initials on a gradient) with name, suburb and Goodwill over it, then verification, about, plans attended, hosted and no-shows, activities with levels and counts, and positive tag counts.</li>
      <li>People are never rated with stars. Stars belong to plans, so the only star figure on a profile is the hosting rating, shown once someone has hosted 3 plans.</li>
      <li>Never shown: surname, phone, email, address, exact location, age, goals, avoid list, free times, and negative feedback.</li>
      <li>Distance is measured between suburb centres and rounded, so nobody can work out where someone lives.</li>
      <li>"Invite" only appears when there's something to invite them to: your ask (coming from matches) or a plan you're hosting.</li>
    </ul>`,
  },
  graph: {
    title: 'The graph, from your side',
    body: `<ul>
      <li>Every line is an edge Keen uses to rank plans for you. Thickness is its weight: activities you actually turn up to outweigh ones you only list; people you've played with (and rated well) outweigh everyone else.</li>
      <li>Dashed lines are private filters: goals nudge, avoids hold plans back, blocks hide people both ways.</li>
      <li>Only <b>confirmed</b> attendance builds edges, the same rule as the numbers on your profile.</li>
      <li>Try it: rate someone after a plan, or block someone from their profile, then come back. The graph and your feed change.</li>
      <li>Nobody else sees this view. Others see your public profile only.</li>
    </ul>`,
  },
  graphData: {
    title: 'Graph data',
    body: `<ul>
      <li>10 node types and 12 edge types, all in ordinary Postgres tables (see <code>schema.sql</code>). Two derived edges, PLAYED_WITH and ATTENDED, are materialised views.</li>
      <li>The same edges are walked in two directions: from a person to plans (feed, search, "why you're seeing this") and from a plan to people (who it reaches when posted).</li>
      <li>Every person's private settings are respected in both directions: a plan never reaches someone who avoids its traits, lives too far, is far off in level, is usually busy then, or has had 3 asks this week.</li>
      <li>MODEL.md §3 has the same tables with weights and formulas.</li>
    </ul>`,
  },
  planData: {
    title: 'Plan fields',
    body: `<ul>
      <li>Every plan has the same 17 fields. 12 are set by the organiser; 5 are worked out by Keen from people, time and place.</li>
      <li><b>Status</b> is mostly calculated: Open and Full come from spots, Happening now starts 30 minutes before, Finished after the end. Only <b>Cancelled</b> is set by a person.</li>
      <li><b>Traits</b> (licensed venue, water, late finish, big group…) are derived and matched against people's private avoid lists. Organisers never tag them by hand.</li>
      <li>Descriptions shouldn't repeat live numbers like "one spot left". The app shows those, and a typed number goes stale as soon as someone joins.</li>
      <li>MODEL.md §2 has the same list with types, validation and examples.</li>
    </ul>`,
  },
  profileData: {
    title: 'Profile fields',
    body: `<ul>
      <li>This screen is the data dictionary in working form: every field on a profile, its database name, whether it's required, the allowed values, who sets it, and the current value.</li>
      <li><b>Shown on your profile</b> (5 fields): first name, photo, home suburb, about you, activities with levels. Photo is optional; without one, initials show on a colour gradient.</li>
      <li><b>Only you and Keen</b> (7): what you want from Keen (goals), age, mobile number, travel distance, things to avoid, free times, asks per week. Goals only tune recommendations ("Good for getting fitter").</li>
      <li><b>Worked out by Keen</b> (10): member since, verification, Goodwill and its level, plans attended and hosted, hosting rating, no-shows, positive tags, plans per activity. None of these can be typed in.</li>
      <li>Levels use one vocabulary everywhere: Beginner, Casual, Intermediate, Competitive. The onboarding chat accepts plain words ("pretty decent", "7 out of 10") and maps them to these.</li>
      <li>MODEL.md §1 has the same list with types and validation.</li>
    </ul>`,
  },
  plan: {
    title: 'The event page',
    body: `<ul>
      <li><b>For organisers</b>: accept or decline join requests, edit the plan, cancel it with a reason (everyone is told), take attendance, and run it again as a pre-filled copy for next week.</li>
      <li><b>Interested</b> puts you in the thread to ask questions, without taking a spot. <b>Join</b> takes a spot straight away, or asks the organiser if they confirm new people. Full plans have a waitlist.</li>
      <li>Join is two taps. The check in between shows when, where, level and spots, warns if it clashes with a plan you're going to, is well off your level, or involves something you avoid, and lets you say hi to an organiser who confirms people (screened like chat).</li>
      <li>Once you're going: add it to Google Calendar or download an .ics for Apple or Outlook, with a 2-hour reminder. The meeting point stays in the app.</li>
      <li><b>Directions</b>: venue, address and travel tips for everyone, with links to Google and Apple Maps. The exact meeting point only shows to people in the thread.</li>
      <li><b>Why you're seeing this</b> draws the graph path from you to the plan: activity, place, time, level and people you've played with.</li>
      <li>On the day: check in when you arrive, or tell the group you're running late. Leaving within 24 hours counts as a late cancel.</li>
      <li>Afterwards: rate it, see who came, and "Run it again".</li>
    </ul>`,
  },
  myask: {
    title: 'Show the reach-out working',
    body: `<ul>
      <li>From the notebook: <em>"see how many received, responded, read"</em>. A saved ask shows sent, seen, keen and passed.</li>
      <li>Reach-out is capped at 3 asks per person per week, so being on Keen never turns into spam.</li>
      <li>Asks expire after 7 days unless they recur, like "padel on Saturdays".</li>
    </ul>`,
  },
  activity: {
    title: 'Plans inbox',
    body: `<ul>
      <li><b>Needs you</b> collects anything waiting on you: check in, take attendance, review join requests, rate a plan.</li>
      <li>Going, interested and hosting in one list, with each thread's unread count, matching the notebook's task list (organiser, invited, accepted, declined).</li>
      <li><b>Messages</b> lists every plan thread you're in, newest first.</li>
      <li>Feedback is due right after a plan ends. It's what earns Goodwill and keeps the trust numbers honest.</li>
      <li>A saved ask is live: in this demo, replies start arriving a few seconds after you save one.</li>
    </ul>`,
  },
  feedback: {
    title: 'Feedback is the trust system',
    body: `<ul>
      <li>Attendance only counts when someone else who was there confirms it. Claiming it yourself earns nothing.</li>
      <li>Tags instead of free text keep it quick and harder to abuse. Negative tags stay private and go to review.</li>
      <li>Two independent no-show reports cost 150 Goodwill.</li>
      <li>Ratings feed matching. People you rated well, and who rated you well, rank higher next time. This is the "platform that learns from your experience".</li>
    </ul>`,
  },
  me: {
    title: 'Your profile',
    body: `<ul>
      <li>The top of the Me tab is your profile exactly as others see it: the same card everyone gets.</li>
      <li>Below it, what only you see: age, avoid list, free times, travel distance. <b>Edit profile</b> opens every field with its allowed values.</li>
      <li>Numbers are calculated, never typed: plans attended count once someone confirms you came; Goodwill is the sum of the ledger; tag counts come from feedback.</li>
      <li>Goodwill levels: New 0–199, Regular 200–999, Trusted 1,000–2,999, Local legend 3,000+. About 90 points per plan you turn up to and give feedback on.</li>
      <li>New-level limits: join plans freely, but only 3 invites a day and no hosting plans over 6 people without ID.</li>
    </ul>`,
  },
};

const FLOWS = [
  ['Onboarding', () => obRestart(), (n) => n === 'onboard'],
  ['Ask', () => { S.onboarding = false; S.text = ''; S.over = {}; setTab('ask'); }, (n) => n === 'ask'],
  ['Matches', () => { S.text = EXAMPLES[0]; S.over = {}; runSearch(); }, (n) => n === 'results' && S.result && (S.result.people.length || S.result.plans.length)],
  ['No match', () => { S.text = EXAMPLES[4]; S.over = {}; runSearch(); }, (n) => n === 'results' && S.result && !S.result.people.length && !S.result.plans.length],
  ['Explore', () => { S.ex = EX_BLANK(); setTab('explore'); }, (n) => n === 'explore' && !searching() && S.ex.view !== 'map'],
  ['Map', () => { S.ex = { ...EX_BLANK(), view: 'map' }; setTab('explore'); }, (n) => n === 'explore' && !searching() && S.ex.view === 'map'],
  ['Search', () => { S.ex = { ...EX_BLANK(), q: 'padel this weekend' }; setTab('explore'); }, (n) => n === 'explore' && searching()],
  ['Event page', () => { S.tab = 'explore'; S.stack = [{ name: 'plan', v: 'g1' }]; render(); }, (n) => n === 'plan'],
  ['Thread', () => { if (!myStatus(findPlan('g1'))) ACTIONS.interest('g1'); S.tab = 'activity'; S.stack = [{ name: 'plan', v: 'g1' }, { name: 'thread', v: 'g1' }]; render(); }, (n) => n === 'thread'],
  ['Create event', () => { S.tab = 'activity'; S.stack = []; startComposeBlank(); }, (n) => n === 'compose'],
  ['Host tools', () => { S.tab = 'activity'; S.stack = [{ name: 'plan', v: 'mine0' }]; render(); }, () => false],
  ['Plan data', () => { S.tab = 'explore'; S.stack = [{ name: 'plan', v: 'g1' }, { name: 'planData', v: 'g1' }]; render(); }, (n) => n === 'planData'],
  ['Check-in', () => { S.tab = 'activity'; S.stack = [{ name: 'plan', v: 'live1' }]; render(); }, () => false],
  ['Roll call', () => { S.tab = 'activity'; S.stack = [{ name: 'plan', v: 'h0' }]; if (findPlan('h0').needsRollcall) S.stack.push({ name: 'rollcall', v: 'h0' }); render(); }, (n) => n === 'rollcall'],
  ['Feedback', () => { S.fb = null; S.tab = 'activity'; S.stack = [{ name: 'feedback', v: 'past1' }]; render(); }, (n) => n === 'feedback'],
  ['History', () => { S.tab = 'me'; S.stack = [{ name: 'history' }]; render(); }, (n) => n === 'history'],
  ['Profile', () => { S.stack = [{ name: 'person', v: 'p1' }]; render(); }, (n) => n === 'person'],
  ['Me', () => setTab('me'), (n) => n === 'me'],
  ['Profile data', () => { S.tab = 'me'; S.stack = [{ name: 'profileData' }]; render(); }, (n) => n === 'profileData'],
  ['Your graph', () => { S.tab = 'me'; S.gsel = null; S.stack = [{ name: 'graph' }]; render(); }, (n) => n === 'graph'],
  ['Graph data', () => { S.tab = 'me'; S.stack = [{ name: 'graph' }, { name: 'graphData' }]; render(); }, (n) => n === 'graphData'],
];

function renderNotes() {
  const name = view().name;
  const n = (name === 'explore' && searching() ? NOTES.search : NOTES[name]) || NOTES.ask;
  $('#notes').innerHTML = `
    <div><p class="eyebrow" style="margin-bottom:8px">Jump to</p><div class="flow">${FLOWS.map(([label, , cur], i) => `<button type="button" data-flow="${i}" aria-current="${!!cur(name)}">${label}</button>`).join('')}</div></div>
    <p class="eyebrow">Design notes · this screen</p>
    <h2>${n.title}</h2>
    ${n.body}
    ${name === 'ask' ? intentShape() : ''}
    ${name === 'onboard' ? obNotesExtra() : ''}
    <div class="note-block"><h3>Not in this prototype</h3><p class="small muted">Login, photo checks, two-way calendar sync (adding a plan to your calendar works), payments, home-help jobs, 1:1 messages with strangers, and location tracking (check-in is confirmed by people who are there, not GPS). The README in this folder has the full MVP scope, data model and safety plan.</p></div>`;
}

// ---------- wiring ----------

function init() {
  const phone = $('#phone');
  phone.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    if (el.tagName === 'INPUT') { ACTIONS[el.dataset.act]?.(el.dataset.v, el, e); return; }
    e.preventDefault();
    e.stopPropagation();
    ACTIONS[el.dataset.act]?.(el.dataset.v, el, e);
  });
  phone.addEventListener('input', (e) => {
    if (e.target.id === 'askInput') {
      S.text = e.target.value;
      if (!S.text.trim()) S.over = {};
      updatePreview();
    }
    if (['pf-name', 'pf-bio', 'pf-age'].includes(e.target.id)) profileInput(e.target);
    if (e.target.id === 'exInput') { S.ex.q = e.target.value; S.ex.drop = {}; updateExplore(); }
    if (e.target.id === 'draftTitle') { S.draft.title = e.target.value; S.draft.titleEdited = true; composeLive(); }
    if (e.target.id === 'draftMeet') { S.draft.meet = e.target.value; S.draft.meetEdited = true; composeLive(); }
    if (e.target.id === 'draftDir') { S.draft.directions = e.target.value; S.draft.dirEdited = true; composeLive(); }
    if (e.target.id === 'draftBring') { S.draft.bring = e.target.value; composeLive(); }
    if (e.target.id === 'joinHi') ACTIONS['join-hi'](null, e.target);
    if (e.target.id === 'draftNote') { S.draft.note = e.target.value; composeLive(); }
  });
  phone.addEventListener('keydown', (e) => {
    if (e.target.id === 'exInput' && (e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); e.target.blur(); }
    if (e.target.id === 'askInput' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const it = currentIntent();
      if (it.activity && !it.flags.length) runSearch();
    }
  });
  phone.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.id === 'obForm') { obSubmit(); return; }
    if (e.target.id === 'threadForm') {
      const input = $('#threadInput');
      const raw = input.value.trim();
      if (raw) threadSend(e.target.dataset.plan, raw);
      $('#threadInput')?.focus();
    }
  });
  $('#screen').addEventListener('scroll', (e) => {
    const b = e.target.querySelector('.bar');
    if (b) b.classList.toggle('scrolled', e.target.scrollTop > (b.classList.contains('over') ? 240 : b.classList.contains('root') ? 40 : 4));
  });
  $('#notes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-flow]');
    if (!b) return;
    closeSheet();
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    if (+b.dataset.flow !== 0) obLeave();
    FLOWS[+b.dataset.flow][1]();
  });
  // Seed state from the mock data: my memberships, message times, what's already read.
  for (const g of [...PLANS, ...PAST_PLANS, ...HISTORY]) if (g.members.includes('me') && g.org !== 'me') S.mem[g.id] = g.past ? 'attended' : 'going';
  for (const [id, msgs] of Object.entries(S.chat)) {
    msgs.forEach((m) => { m.at = new Date(+NOW - (m.ago || 0) * 60e3); });
    S.read[id] = msgs.length - (id === 'live1' ? 1 : 0);
  }
  // Missing photos fall back to initials or gradient art (error events don't bubble, so listen in the capture phase).
  document.addEventListener('error', (e) => { const t = e.target; if (t && t.tagName === 'IMG' && t.hasAttribute('data-fallback')) t.remove(); }, true);
  S.ledger = seedLedger();
  S.points = S.ledger.reduce((k, l) => k + l.pts, 0);
  S.ob = freshOnboarding();
  detectClaude();
  render();
}

document.addEventListener('DOMContentLoaded', init);
