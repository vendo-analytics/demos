// Keen prototype UI. Plain DOM, one render function per screen, one click handler for the whole phone.

const NOW = new Date();
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const fmtPts = (n) => n.toLocaleString('en-AU');
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

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
  requested: new Set(),
  hidden: new Set(),
  myAsks: MY_ASKS.map((a) => ({ ...a })),
  myPlans: [],
  points: ME.points,
  idVerified: false,
  ledger: [
    { text: 'Attended Sunrise run', pts: 50 },
    { text: 'Left feedback: Sunrise run', pts: 20 },
    { text: '3 good reviews from Sunday padel', pts: 30 },
    { text: 'Organised Sunday padel, 4 came', pts: 100 },
  ],
  feedbackDone: false,
  fb: null,
  onboarding: true,
  ob: null,
  feedTab: 'foryou',
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
const bar = (title, withBack = true, extra = '') =>
  `<div class="bar">${withBack ? `<button class="icon-btn" data-act="back" aria-label="Back">${ICON_BACK}</button>` : ''}<h2>${title}</h2>${extra}</div>`;

const avatar = (p, size = 'm') => `<span class="av ${size}" style="--h:${p.hue}" aria-hidden="true">${esc(p.name[0])}</span>`;
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
  ${bar('Keen', false, `<span class="muted small">Near ${ME.suburb}</span>`)}
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
    <div class="row">${avatar(p)}<div class="grow"><div class="name">${esc(p.name)}</div><div class="muted small">${esc(p.suburb)} · ★ ${p.rating} · ${plural(p.events, 'event')}</div></div>${gw(p.points)}</div>
    <p class="quote">${esc(x.ask.text)}</p>
    ${reasonsHTML(x.fit.reasons)}
    <div class="foot"><span class="stats">${x.ask.have > 1 ? `${x.ask.have} of them · ` : ''}${p.idVerified ? 'ID verified' : 'Phone verified'}</span>
      <button type="button" class="btn sm ${invited ? 'done' : 'sea'}" data-act="invite" data-v="${p.id}" ${invited ? 'disabled' : ''}>${invited ? 'Invited' : 'Invite'}</button></div>
  </article>`;
}

function planCard(x) {
  const g = x.plan, org = PERSON[g.org], asked = S.requested.has(g.id);
  return `<article class="card tap" data-act="plan" data-v="${g.id}">
    <div class="row"><div class="grow"><p class="eyebrow">${esc(ACT[g.act].label)} · group</p><div class="h3">${esc(g.title)}</div><div class="muted small">${esc(g.venue)}</div></div></div>
    <div class="row">${spots(g.members.length, g.size)}<span class="small muted num">${g.members.length}/${g.size}</span></div>
    ${reasonsHTML(x.fit.reasons)}
    <div class="foot"><span class="row small">${avatar(org, 's')}<span>Run by ${esc(org.name)} ${gw(org.points)}</span></span>
      <button type="button" class="btn sm ${asked ? 'done' : 'sea'}" data-act="join" data-v="${g.id}" ${asked ? 'disabled' : ''}>${asked ? 'Requested' : 'Ask to join'}</button></div>
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

VIEWS.person = ({ v: id }) => {
  const p = PERSON[id];
  const ask = OPEN_ASKS.find((a) => a.who === id);
  const fit = S.result && S.result.people.find((x) => x.person.id === id);
  const d = km(PLACE[p.suburb], PLACE[ME.suburb]);
  const lvl = levelFor(p.points);
  const reviews = [REVIEW_BANK[hashIdx(id, REVIEW_BANK.length)], REVIEW_BANK[hashIdx(id + 'x', REVIEW_BANK.length)]].filter((x, i, a) => a.indexOf(x) === i);
  const reviewers = PEOPLE.filter((q) => q.id !== id);
  const byGroup = {};
  p.interests.forEach((a) => { (byGroup[ACT[a].group] ||= []).push(ACT[a].label); });
  const invited = S.invited.has(id);
  return bar(esc(p.name)) + `<div class="pad">
    <div class="hero">${avatar(p, 'l')}<h1 class="h1">${esc(p.name)}</h1>
      <div class="muted small">Around ${esc(p.suburb)}${d > 0.8 ? ` · about ${Math.round(d)} km away` : ''} · on Keen since ${p.joined}</div>
      <div class="row" style="justify-content:center">${gw(p.points)}<span class="small"><b>${lvl.name}</b></span></div></div>
    <div class="kpis"><div><b>${p.events}</b><span>events</span></div><div><b>★ ${p.rating}</b><span>avg rating</span></div><div><b>${p.noShows}</b><span>no-shows</span></div></div>
    <div class="badges"><span class="badge">Phone verified</span>${p.idVerified ? '<span class="badge">ID verified</span>' : '<span class="badge off">ID not verified</span>'}<span class="badge">Real photo</span></div>
    ${p.bio ? `<p class="quote" style="text-align:center">${esc(p.bio)}</p>` : ''}
    ${ask ? `<div class="card"><p class="eyebrow">Their open ask</p><p class="quote">${esc(ask.text)}</p>${fit ? reasonsHTML(fit.fit.reasons) : ''}</div>` : ''}
    <div><h3 class="h3">Into</h3>${Object.entries(byGroup).map(([g, xs]) => `<p class="small muted" style="margin:6px 0 4px">${g}</p><div class="chips">${xs.map((x) => `<span class="chip">${x}</span>`).join('')}</div>`).join('')}</div>
    <div><h3 class="h3">What people say</h3><div style="display:grid;gap:10px;margin-top:8px">${reviews.map((rv, i) => {
      const by = reviewers[hashIdx(id + i, reviewers.length)];
      return `<div class="review"><span class="small">${esc(rv.text)}</span><span class="small muted">${esc(by.name)} · ${rv.tags.join(', ')}</span></div>`;
    }).join('')}</div></div>
    <div class="card shown"><div><b class="small">On ${esc(p.name)}'s profile</b><ul class="muted"><li>First name, photo</li><li>Suburb, rounded distance</li><li>Interests and level</li><li>Goodwill and feedback</li></ul></div>
      <div><b class="small">Never shown</b><ul class="muted"><li>Surname</li><li>Phone and email</li><li>Address or live location</li><li>Age, employer</li></ul></div></div>
    <button type="button" class="btn block ${invited ? 'done' : 'sea'}" data-act="invite" data-v="${id}" ${invited ? 'disabled' : ''}>${invited ? 'Invited to your ask' : S.intent ? 'Invite to your ask' : 'Invite to a plan'}</button>
    <button type="button" class="link-btn" data-act="report" data-v="${id}" style="justify-self:center;color:var(--flag)">Report or block ${esc(p.name)}</button>
  </div>`;
};

function findPlan(id) { return PLANS.find((g) => g.id === id) || PAST_PLANS.find((g) => g.id === id) || S.myPlans.find((g) => g.id === id); }

VIEWS.plan = ({ v: id }) => {
  const g = findPlan(id);
  const org = PERSON[g.org];
  const slot = g.slots ? g.slots[0] : resolveWhen(g.when, NOW)[0];
  const asked = S.requested.has(id);
  const inside = asked || g.past || g.mine;
  const members = g.members.map((m) => PERSON[m]);
  const left = g.size - g.members.length;
  const msgs = S.chat[id] || [];
  let cta = '';
  if (g.past) {
    cta = `${!S.feedbackDone ? `<button type="button" class="btn block" data-act="feedback" data-v="${id}">Rate this plan</button>` : ''}
      <button type="button" class="btn block ghost" data-act="again" data-v="${id}">Run it again next week</button>
      <p class="small muted" style="margin:0;text-align:center">Sends the same plan to the ${g.members.length - 1} people who came.</p>`;
  } else if (g.mine) {
    cta = `${requestsHTML(g)}<div class="card"><p class="eyebrow">Your plan so far</p>${funnelHTML(g)}<p class="small muted" style="margin:0">${g.posted ? `Sent to ${plural(g.sent, 'person')} who fit, and showing in "Happening near you" within ${ME.radius || 10} km.` : 'It goes ahead when enough people say yes.'} Everyone gets a reminder 2 hours before.</p></div>`;
  } else {
    cta = `<button type="button" class="btn block ${asked ? 'done' : ''}" data-act="join" data-v="${id}" ${asked ? 'disabled' : ''}>${asked ? `Requested · ${esc(org.name)} will confirm` : 'Ask to join'}</button>`;
  }
  return bar(esc(g.title)) + `<div class="pad">
    <div><p class="eyebrow">${esc(ACT[g.act].label)}${g.past ? ' · finished' : g.mine ? ' · proposed by you' : ' · open group'}</p><h1 class="h1">${esc(g.title)}</h1></div>
    <div class="meta">
      <div><span class="k">When</span><span>${esc(fmtSlot(slot, NOW))}</span></div>
      <div><span class="k">Where</span><span>${esc(g.venue)}<br><span class="muted small">${esc(g.place)} · public venue${g.alcohol ? ' · licensed' : ''}</span></span></div>
      <div><span class="k">Level</span><span>${cap(g.skill)}</span></div>
      <div><span class="k">Spots</span><span class="row">${spots(g.members.length, g.size)}<span class="small muted num">${g.past ? `${g.members.length} came` : `${left} left`}</span></span></div>
    </div>
    ${g.note ? `<p class="quote">${esc(g.note)}</p>` : ''}
    ${cta}
    <div><h3 class="h3">${g.past ? 'Who came' : "Who's in"}</h3><div style="margin-top:4px">${members.map((m) => `
      <div class="member" ${m.id !== 'me' ? `data-act="person" data-v="${m.id}" style="cursor:pointer"` : ''}>${avatar(m, 's')}<div class="grow" style="flex:1;min-width:0"><b>${esc(m.id === 'me' ? 'You' : m.name)}</b>${m.id === g.org ? ' <span class="small muted">organiser</span>' : ''}<div class="small muted">★ ${m.rating} · ${plural(m.events, 'event')}</div></div>${gw(personPts(m))}</div>`).join('')}</div></div>
    <div class="notice info"><b>Safe by default</b>Public venue only. Chat stays in Keen. Phone numbers, emails, links and payment talk are hidden until you've met once.</div>
    <div><h3 class="h3">Group chat</h3><p class="small muted" style="margin:2px 0 8px">Everyone in the plan sees this. There are no private messages with people you haven't met.</p>
      <div class="chat" id="chat">${msgs.map(msgHTML).join('') || '<p class="small muted">No messages yet.</p>'}</div></div>
    ${inside ? `<form class="chat-form" data-plan="${id}" id="chatForm"><input id="chatInput" autocomplete="off" placeholder="Message the group (try a phone number)" aria-label="Message"><button class="btn sm sea" type="submit">Send</button></form>`
      : `<p class="small muted" style="text-align:center;margin:0">Ask to join to chat with the group.</p>`}
    <button type="button" class="link-btn" data-act="report" data-v="${g.org}" style="justify-self:center;color:var(--flag)">Report this plan</button>
  </div>`;
};

function msgHTML(m) {
  if (m.sys) return `<div class="msg sys">${esc(m.text)}</div>`;
  const p = PERSON[m.who];
  return `<div class="msg ${m.who === 'me' ? 'mine' : ''}"><small>${m.who === 'me' ? 'You' : esc(p.name)}</small>${esc(m.text)}</div>`;
}

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

VIEWS.activity = () => {
  const past = PAST_PLANS[0];
  const upcoming = [...S.myPlans, ...PLANS.filter((g) => S.requested.has(g.id))];
  let h = bar('Plans', false) + '<div class="pad">';
  if (!S.feedbackDone) {
    h += `<article class="card tap" data-act="feedback" data-v="${past.id}">
      <div class="row"><div class="grow"><p class="eyebrow">Needs your feedback</p><div class="h3">${esc(past.title)}</div><div class="muted small">${esc(fmtSlot(resolveWhen(past.when, NOW)[0], NOW))} · ${esc(past.venue)}</div></div><span class="status due">Due</span></div>
      <div class="foot"><span class="stack">${past.members.filter((m) => m !== 'me').map((m) => avatar(PERSON[m], 's')).join('')}</span><span class="btn sm">Rate · +20</span></div></article>`;
  }
  h += `<div class="section-h"><h3 class="h3">Your asks</h3><span class="small muted num">${S.myAsks.length}</span></div>`;
  h += S.myAsks.length ? S.myAsks.map((a) => `
    <article class="card tap" data-act="myask" data-v="${a.id}">
      <div class="row"><div class="grow"><div class="name">${esc(a.text)}</div><div class="muted small">${esc(a.summary)}</div></div><span class="status ${a.keen ? 'ok' : 'wait'}">${a.keen ? `${a.keen} keen` : 'Waiting'}</span></div>
      <div class="small muted num">Sent ${a.sent} · Seen ${a.seen} · Keen ${a.keen} · Passed ${a.passed}</div>
    </article>`).join('') : '<p class="small muted">No open asks. Head to Ask to start one.</p>';
  h += `<div class="section-h"><h3 class="h3">Upcoming</h3><span class="small muted num">${upcoming.length}</span></div>`;
  h += upcoming.length ? upcoming.map((g) => `
    <article class="card tap" data-act="plan" data-v="${g.id}">
      <div class="row"><div class="grow"><div class="name">${esc(g.title)}</div><div class="muted small">${esc(fmtSlot(g.slots ? g.slots[0] : resolveWhen(g.when, NOW)[0], NOW))} · ${esc(g.venue)}</div></div>
      <span class="status wait">${g.mine ? 'Organiser' : 'Requested'}</span></div>
      <div class="row">${spots(g.members.length, g.size)}</div>
    </article>`).join('') : '<p class="small muted">Nothing booked. Join a group or propose a plan from your matches.</p>';
  h += `<div class="section-h"><h3 class="h3">Past</h3></div>
    <article class="card tap" data-act="plan" data-v="${past.id}"><div class="row"><div class="grow"><div class="name">${esc(past.title)}</div><div class="muted small">${esc(past.venue)} · ${past.members.length} came</div></div><span class="status ${S.feedbackDone ? 'ok' : 'due'}">${S.feedbackDone ? 'Rated' : 'Rate'}</span></div></article>`;
  return h + '</div>';
};

const GOOD_TAGS = ['On time', 'Friendly', 'Good sport', 'Skill as described', 'Would play again'];
const BAD_TAGS = ['Late', 'Rude', 'Skill not as described', 'Made me uncomfortable', 'Asked for contact details'];

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

VIEWS.me = () => {
  const lvl = levelFor(S.points), nx = nextLevel(S.points);
  const pct = nx ? ((S.points - lvl.min) / (nx.min - lvl.min)) * 100 : 100;
  const byGroup = {};
  ME.interests.forEach((a) => { (byGroup[ACT[a].group] ||= []).push(ACT[a].label + (ME.levels && ME.levels[a] ? ` · ${LEVEL_LABEL[ME.levels[a]]}` : '')); });
  const labelOf = (list, id) => (list.find((x) => x.id === id) || {}).label;
  return bar('Me', false) + `<div class="pad">
    <div class="row">${avatar(ME)}<div class="grow"><div class="h3">${ME.name}</div><div class="small muted">${ME.suburb} · ${plural(ME.events, 'event')} · ★ ${ME.rating}</div></div></div>
    <div class="gw-hero">
      <p class="eyebrow muted">Goodwill</p>
      <div class="row" style="align-items:baseline;justify-content:space-between"><span class="big" id="gwBig">${fmtPts(S.points)}</span><b>${lvl.name}</b></div>
      <div class="gw-bar"><div style="width:${pct}%"></div></div>
      <span class="small muted">${nx ? `${fmtPts(nx.min - S.points)} to ${nx.name}` : 'Top level'}</span>
    </div>
    <div class="card"><div class="h3">Recent</div><div class="ledger">${S.ledger.slice(0, 6).map((l) => `<div><span>${esc(l.text)}</span><span class="${l.pts > 0 ? 'plus' : 'minus'}">${l.pts > 0 ? '+' : ''}${l.pts}</span></div>`).join('')}</div></div>
    <div class="card"><div class="h3">How Goodwill works</div><div class="ledger">
      <div><span>Turn up, confirmed by someone who was there</span><span class="plus">+50</span></div>
      <div><span>Organise a plan that goes ahead (3+ people)</span><span class="plus">+100</span></div>
      <div><span>Leave feedback after a plan</span><span class="plus">+20</span></div>
      <div><span>Good review received (max 3 per plan)</span><span class="plus">+10</span></div>
      <div><span>Verify your ID (once)</span><span class="plus">+100</span></div>
      <div><span>No-show, reported by 2 or more people</span><span class="minus">−150</span></div>
    </div><p class="small muted" style="margin:0">Goodwill can't be bought, sent or spent. Points from the same small group are capped, so fake accounts can't farm each other.</p></div>
    <div class="card"><div class="h3">Trust</div><div class="badges" style="justify-content:flex-start"><span class="badge">Phone verified</span><span class="badge">Real photo</span>${S.idVerified ? '<span class="badge">ID verified</span>' : '<span class="badge off">ID not verified</span>'}</div>
      ${S.idVerified ? '' : '<button type="button" class="btn sm sea" data-act="verify" style="justify-self:start">Verify ID · +100</button>'}
      <p class="small muted" style="margin:0">Under 100 Goodwill you can join plans but can send only 3 invites a day. Organising plans for more than 6 people needs ID.</p></div>
    <div><h3 class="h3">Your interests</h3>${Object.entries(byGroup).map(([g, xs]) => `<p class="small muted" style="margin:6px 0 4px">${g}</p><div class="chips">${xs.map((x) => `<span class="chip">${x}</span>`).join('')}</div>`).join('')}
      ${ME.goals && ME.goals.length ? `<p class="small muted" style="margin:10px 0 4px">Here to</p><div class="chips">${ME.goals.map((g) => `<span class="chip">${labelOf(GOALS, g)}</span>`).join('')}</div>` : ''}</div>
    <div class="card"><div class="row"><div class="h3 grow">Only you see this</div><span class="lock">private</span></div>
      <div class="meta small">
        <div><span class="k">Age</span><span>${ME.age != null ? ME.age : 'Not given'}</span></div>
        <div><span class="k">Avoid</span><span>${ME.avoid && ME.avoid.length ? ME.avoid.map((a) => labelOf(AVOIDS, a)).join(', ') : 'Nothing'}</span></div>
        <div><span class="k">Free</span><span>${ME.free && ME.free.length ? ME.free.map((f) => labelOf(AVAILABILITY, f)).join(', ') : 'Not given'}</span></div>
        <div><span class="k">Distance</span><span>Up to ${ME.radius || 10} km from ${esc(ME.suburb)}</span></div>
      </div>
      <p class="small muted" style="margin:0">Used to filter what Keen suggests. Never shown on your profile.</p>
      <button type="button" class="btn sm ghost" data-act="ob-restart" style="justify-self:start">Redo the getting-to-know-you chat</button></div>
    <div class="card shown"><div><b class="small">Others see</b><ul class="muted"><li>${ME.name}, your photo</li><li>${ME.suburb}</li><li>Interests, level</li><li>Goodwill, feedback</li></ul></div><div><b class="small">Never shown</b><ul class="muted"><li>Surname</li><li>Phone, email</li><li>Address</li><li>Live location</li></ul></div></div>
  </div>`;
};

// ---------- sheets ----------

function sheet(html) {
  $('#overlay').innerHTML = `<div class="scrim" data-act="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
}
function closeSheet() { $('#overlay').innerHTML = ''; }

let toastTimer;
function toast(msg) {
  closeSheet();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
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
  S.points += pts;
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
  join: (v) => {
    S.requested.add(v);
    const g = findPlan(v);
    toast(`Request sent. ${PERSON[g.org].name} confirms new players.`);
    updateBadge(); render();
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
    addPoints(20, 'Left feedback: Friday 6-a-side');
    setTimeout(() => { addPoints(50, 'Attended Friday 6-a-side, confirmed by Luca'); if (view().name === 'me') render(); toast('Luca confirmed you came: +50 Goodwill'); }, 4000);
    S.fb = null; S.stack = []; S.tab = 'activity';
    updateBadge(); render();
    toast('+20 Goodwill. Your +50 for turning up lands when someone confirms you came.');
  },
  again: (v) => {
    const g = findPlan(v);
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
    toast(`Reported. You won't see ${PERSON[v].name} again.`);
    if (view().name === 'person') back(); else render();
  },
  verify: () => { S.idVerified = true; addPoints(100, 'Verified ID'); render(); toast('ID verified: +100 Goodwill'); },
};

function flash(key) {
  const n = document.querySelector(`.node[data-v="${key}"]`);
  if (n) { n.classList.remove('flash'); void n.offsetWidth; n.classList.add('flash'); }
}

function updateBadge() {
  const n = (S.feedbackDone ? 0 : 1) + S.myAsks.filter((a) => a.keen).length + S.myPlans.reduce((k, g) => k + (g.requests ? g.requests.length : 0), 0);
  const b = $('#planBadge');
  b.hidden = !n; b.textContent = n;
}

// ---------- render ----------

function render(keepScroll = false) {
  const scr = $('#screen');
  const y = scr.scrollTop;
  const v = view();
  scr.innerHTML = VIEWS[v.name](v);
  scr.scrollTo({ top: keepScroll ? y : 0, behavior: 'instant' });
  $('#phone').classList.toggle('no-tabs', v.name === 'onboard');
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
    title: 'Posting a plan',
    body: `<ul>
      <li>A plan is an ask made specific: a fixed start time, a public venue and spots to fill. Typing "Football Friday 6pm at Manly Oval, we're 4, need 7" offers this flow first.</li>
      <li>Venues come from a list of public places. Licensed venues are marked, and people who avoid alcohol never see those plans.</li>
      <li>Before you post you see who it reaches: people with a matching ask are told now, people who might be keen hear about it within their weekly cap, and it appears in the feed for people nearby.</li>
      <li>Notes are screened like chat. Phone numbers, links and payment talk block posting. Plans are free to join.</li>
      <li>Organisers approve who joins by default. Plans over 6 people need ID or 100+ Goodwill.</li>
    </ul>`,
  },
  ask: {
    title: 'One box, no search',
    body: `<ul>
      <li><b>Happening near you.</b> Below the box is a feed of open plans, ranked by your interests, your level, how soon they are and how close they are to filling. You can browse events. You can never browse people.</li>
      <li>Plans that clash with your private avoid list are held back, with a count and a way to show them.</li>
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
      <li>Shown: first name, photo, suburb, interests, level, Goodwill, events, rating, verification badges, recent feedback.</li>
      <li>Never shown: surname, phone, email, address, exact location, age, employer.</li>
      <li>Distance is measured between suburb centres and rounded, so nobody can work out where someone lives.</li>
      <li>Feedback appears as short tagged quotes. Negative feedback is private and goes to review instead.</li>
      <li>Report and block is one tap away on every profile and plan.</li>
    </ul>`,
  },
  plan: {
    title: 'A plan is an ask with people in it',
    body: `<ul>
      <li>An ask and a plan are the same object: activity, place, time, how many you have, how many you need. When asks merge they become a plan.</li>
      <li>Venues are public places. There are no home addresses in the MVP.</li>
      <li>The organiser confirms join requests, so a plan can't be flooded.</li>
      <li>Chat is group-only. Phone numbers, emails, links, other apps and payment talk are hidden until you've met once. Try typing a phone number.</li>
      <li>From the notebook: after the plan, everyone rates it, and <em>Run it again</em> resends it to everyone who came.</li>
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
      <li>One list for everything you organise, are invited to, have asked to join or have finished, matching the notebook's task list.</li>
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
    title: 'Goodwill',
    body: `<ul>
      <li>Earned only through things other people confirm: turning up, organising, good feedback.</li>
      <li>It can't be bought, transferred or spent. Points from the same small group are capped, so rings of fake accounts can't farm each other.</li>
      <li>Levels: New from 0, Regular from 100, Trusted from 500, Local legend from 1,000.</li>
      <li>Low Goodwill means limits, not a ban. New accounts can join plans but can only send 3 invites a day and can't organise plans for more than 6 people.</li>
      <li>Verification shows as a badge. The data behind it is never shown.</li>
    </ul>`,
  },
};

const FLOWS = [
  ['Onboarding', () => obRestart(), (n) => n === 'onboard'],
  ['Ask and feed', () => { S.onboarding = false; S.text = ''; S.over = {}; setTab('ask'); }, (n) => n === 'ask'],
  ['Matches', () => { S.text = EXAMPLES[0]; S.over = {}; runSearch(); }, (n) => n === 'results' && S.result && (S.result.people.length || S.result.plans.length)],
  ['No match', () => { S.text = EXAMPLES[4]; S.over = {}; runSearch(); }, (n) => n === 'results' && S.result && !S.result.people.length && !S.result.plans.length],
  ['Post a plan', () => { S.text = EXAMPLES[6]; S.over = {}; S.tab = 'ask'; S.stack = []; startCompose(currentIntent()); }, (n) => n === 'compose'],
  ['Blocked ask', () => { S.text = EXAMPLES[5]; S.over = {}; setTab('ask'); }, () => false],
  ['Group plan', () => { S.stack = [{ name: 'plan', v: 'g1' }]; render(); }, (n) => n === 'plan'],
  ['Profile', () => { S.stack = [{ name: 'person', v: 'p1' }]; render(); }, (n) => n === 'person'],
  ['Feedback', () => { S.fb = null; S.tab = 'activity'; S.stack = [{ name: 'feedback', v: 'past1' }]; render(); }, (n) => n === 'feedback'],
  ['Goodwill', () => setTab('me'), (n) => n === 'me'],
];

function renderNotes() {
  const name = view().name;
  const n = NOTES[name] || NOTES.ask;
  $('#notes').innerHTML = `
    <div><p class="eyebrow" style="margin-bottom:8px">Jump to</p><div class="flow">${FLOWS.map(([label, , cur], i) => `<button type="button" data-flow="${i}" aria-current="${!!cur(name)}">${label}</button>`).join('')}</div></div>
    <p class="eyebrow">Design notes · this screen</p>
    <h2>${n.title}</h2>
    ${n.body}
    ${name === 'ask' ? intentShape() : ''}
    ${name === 'onboard' ? obNotesExtra() : ''}
    <div class="note-block"><h3>Not in this prototype</h3><p class="small muted">Login, photo checks, calendar sync, payments, home-help jobs, 1:1 messages with strangers, location tracking and check-ins. The README in this folder has the full MVP scope, data model and safety plan.</p></div>`;
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
    if (e.target.id === 'draftTitle') { S.draft.title = e.target.value; S.draft.titleEdited = true; composeLive(); }
    if (e.target.id === 'draftNote') { S.draft.note = e.target.value; composeLive(); }
  });
  phone.addEventListener('keydown', (e) => {
    if (e.target.id === 'askInput' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const it = currentIntent();
      if (it.activity && !it.flags.length) runSearch();
    }
  });
  phone.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.id === 'obForm') { obSubmit(); return; }
    const form = e.target, input = form.querySelector('input');
    const raw = input.value.trim();
    if (!raw) return;
    const id = form.dataset.plan;
    const { text, hits } = screenMessage(raw);
    (S.chat[id] ||= []).push({ who: 'me', text });
    if (hits.length) S.chat[id].push({ sys: true, text: `Keen hid the ${hits.join(', ')}. Contact details unlock after you've met in a plan together. Never pay anyone you met here.` });
    render(true);
    const chat = $('#chat');
    if (chat) chat.lastElementChild.scrollIntoView({ block: 'nearest' });
    $('#chatInput')?.focus();
  });
  $('#screen').addEventListener('scroll', (e) => {
    const b = e.target.querySelector('.bar');
    if (b) b.classList.toggle('scrolled', e.target.scrollTop > 4);
  });
  $('#notes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-flow]');
    if (!b) return;
    closeSheet();
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    if (+b.dataset.flow !== 0) obLeave();
    FLOWS[+b.dataset.flow][1]();
  });
  S.ob = freshOnboarding();
  detectClaude();
  render();
}

document.addEventListener('DOMContentLoaded', init);
