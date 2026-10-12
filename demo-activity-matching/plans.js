// Creating events: from an ask ("Post as a plan") or from scratch, with venue, meeting point
// and directions; and the organiser's side of join requests.
// Loaded after app.js; adds its screens and actions to the shared VIEWS and ACTIONS.

const START_TIMES = [6, 7, 8, 9, 10, 11, 12, 14, 16, 17, 17.5, 18, 18.5, 19, 20];

function venuesFor(act, near) {
  const here = PLACE[near] || PLACE[ME.suburb];
  return VENUES.filter((v) => v.acts.includes(act)).map((v) => ({ v, d: km(v, here) })).sort((a, b) => a.d - b.d).slice(0, 6).map((x) => x.v.id);
}

function blankDraft() {
  const days = Array.from({ length: 7 }, (_, i) => +startOfDay(new Date(+NOW + (i + 1) * 864e5)));
  return {
    act: null, raw: '', days, day: null, window: [7, 21], start: null, dur: 1.5, venues: [], venueId: null, placeName: ME.suburb,
    have: 1, seek: 3, skill: 'casual', note: '', bring: '', meet: '', meetEdited: false, directions: '', dirEdited: false,
    approve: true, title: '', titleEdited: false,
  };
}

function startComposeBlank() { S.draft = blankDraft(); go('compose'); }

function startCompose(it) {
  if (!it.activity || it.flags.length) return;
  const d = blankDraft();
  const days = [];
  for (const sl of it.time.slots) { const x = +startOfDay(sl.start); if (!days.includes(x)) days.push(x); }
  Object.assign(d, {
    act: it.activity.id, raw: it.raw, days: days.slice(0, 7), day: days.length === 1 ? days[0] : null,
    window: [it.time.from, it.time.to], start: it.time.exact ? it.time.from : null, dur: it.time.exact ? Math.max(1, it.time.to - it.time.from) : 1.5,
    placeName: it.place.remote ? ME.suburb : it.place.name, have: it.party.have, seek: it.party.seek, skill: it.skill || 'casual',
  });
  d.venues = venuesFor(d.act, d.placeName);
  if (it.venue && !d.venues.includes(it.venue.id)) d.venues.unshift(it.venue.id);
  S.draft = d;
  pickVenue(it.venue ? it.venue.id : d.venues.length === 1 ? d.venues[0] : null);
  autoTitle();
  go('compose');
}

function pickVenue(id) {
  const d = S.draft;
  d.venueId = id;
  const v = VENUE[id];
  if (!v) return;
  if (!d.meetEdited) d.meet = v.meet;
  if (!d.dirEdited) d.directions = [v.transport, v.parking].filter(Boolean).join(' ');
}

function autoTitle() {
  const d = S.draft;
  if (d.titleEdited || !d.act) return;
  const act = ACT[d.act].label;
  d.title = d.day != null ? `${cap(DOW[new Date(d.day).getDay()])} ${act.toLowerCase()}` : `${act} meetup`;
}

function draftIntent(d) {
  const day = new Date(d.day != null ? d.day : d.days[0]);
  const start = d.start != null ? d.start : d.window[0];
  const end = d.start != null ? d.start + d.dur : d.window[1];
  const v = VENUE[d.venueId];
  const place = v ? v.suburb : PLACE[d.placeName] ? d.placeName : ME.suburb;
  return {
    raw: d.raw, activity: ACT[d.act], place: { name: place, radius: ME.radius || 10, remote: false }, time: { slots: [{ start: at(day, start), end: at(day, end) }], label: '' },
    party: { have: d.have, seek: d.seek }, skill: d.skill, role: null, flags: [], missing: [],
  };
}

function draftCheck(d) {
  const scan = screenMessage(`${d.note || ''} ${d.meet || ''} ${d.directions || ''} ${d.bring || ''}`);
  const size = d.have + d.seek;
  const sizeBlocked = size > 6 && S.points < 200 && !S.idVerified;
  let why = null;
  if (!d.act) why = 'Pick an activity';
  else if (d.day == null) why = 'Pick a day';
  else if (d.start == null) why = 'Pick a start time';
  else if (!d.venueId) why = 'Pick a venue';
  else if (!d.meet.trim()) why = 'Add a meeting point';
  else if (!d.title.trim()) why = 'Give it a title';
  else if (scan.hits.length) why = 'Fix the text to post';
  else if (sizeBlocked) why = 'Verify ID to post a plan this big';
  return { ok: !why, why, scan, size, sizeBlocked };
}

function noteWarnHTML(scan) {
  if (!scan.hits.length) return '';
  const money = scan.hits.includes('payment');
  return `<div class="notice bad"><b>${money ? 'No payments on Keen' : 'No contact details in plans'}</b>${money ? 'Plans are free to join. Take out anything about paying, deposits or transfers.' : 'Phone numbers, emails, links and other apps unlock after people have met once. Take them out to post.'}</div>`;
}

function publishBtnHTML() {
  const c = draftCheck(S.draft);
  return `<button type="button" class="btn block" id="publishBtn" data-act="publish" ${c.ok ? '' : 'disabled'}>${c.ok ? 'Post plan' : c.why}</button>`;
}

// Typing into the text fields updates the warnings and the button without re-rendering (keeps focus).
function composeLive() {
  const c = draftCheck(S.draft);
  const w = $('#noteWarn');
  if (w) w.innerHTML = noteWarnHTML(c.scan);
  const p = $('#publishWrap');
  if (p) p.innerHTML = publishBtnHTML();
}

function fmtHourLabel(h) {
  const hh = Math.floor(h), mm = Math.round((h % 1) * 60);
  return `${((hh + 11) % 12) + 1}${mm ? ':' + String(mm).padStart(2, '0') : ''}${hh < 12 ? 'am' : 'pm'}`;
}

VIEWS.compose = () => {
  const d = S.draft;
  if (!d.act) {
    const groups = {};
    ACTIVITIES.filter((a) => a.cat !== 'service').forEach((a) => (groups[a.group] ||= []).push(a));
    return bar('Create a plan') + `<div class="pad">
      <div><p class="eyebrow">New plan</p><h1 class="h1">What are you organising?</h1></div>
      ${Object.entries(groups).map(([gname, acts]) => `<p class="small muted" style="margin:0">${gname}</p><div class="tile-grid">${acts.map((a) => `<button type="button" class="tile" data-act="d-act" data-v="${a.id}">${actArt(a.id)}<span class="tile-label">${esc(a.label)}</span></button>`).join('')}</div>`).join('')}
      <p class="small muted" style="margin:0">Home help and paid services aren't in the MVP.</p>
    </div>`;
  }
  const act = ACT[d.act];
  const c = draftCheck(d);
  const reach = match(draftIntent(d), { now: NOW });
  const v = VENUE[d.venueId];
  const wide = d.window[0] === 7 && d.window[1] === 21;
  let times = START_TIMES.filter((h) => wide || (h >= d.window[0] && h <= d.window[1] - 0.5));
  if (d.start != null && !times.includes(d.start)) times = [...times, d.start].sort((a, b) => a - b);
  if (!times.length) times = START_TIMES;
  const stepper = (k, label) => `<div class="stepper"><span>${label}</span><span class="ctl"><button type="button" class="icon-btn" data-act="d-party" data-v="${k}:-1" aria-label="Fewer">−</button><b>${d[k]}</b><button type="button" class="icon-btn" data-act="d-party" data-v="${k}:1" aria-label="More">+</button></span></div>`;
  return bar('Create a plan') + `<div class="pad">
    <div><div class="row"><p class="eyebrow grow">${esc(act.label)} · new plan</p><button type="button" class="link-btn" data-act="d-act" data-v="">Change</button></div>
      <input id="draftTitle" class="title-input" value="${esc(d.title)}" maxlength="60" aria-label="Plan title"></div>
    <section class="field"><h3 class="h3">Day</h3><div class="chips">${d.days.map((x) => `<button type="button" class="chip" data-act="d-day" data-v="${x}" aria-pressed="${d.day === x}">${esc(fmtDay(new Date(x), NOW))}</button>`).join('')}</div></section>
    <section class="field"><h3 class="h3">Starts</h3><div class="chips">${times.map((h) => `<button type="button" class="chip num" data-act="d-start" data-v="${h}" aria-pressed="${d.start === h}">${fmtHourLabel(h)}</button>`).join('')}</div>
      <p class="eyebrow">For</p><div class="chips">${[1, 1.5, 2, 3].map((h) => `<button type="button" class="chip" data-act="d-dur" data-v="${h}" aria-pressed="${d.dur === h}">${h === 1 ? '1 hour' : `${h} hours`}</button>`).join('')}</div></section>
    <section class="field"><h3 class="h3">Where</h3><p class="small muted" style="margin:0">Public places only: courts, ovals, beaches, cafés, libraries.</p>
      <div class="chips">${d.venues.map((id) => `<button type="button" class="chip" data-act="d-venue" data-v="${id}" aria-pressed="${d.venueId === id}">${esc(VENUE[id].name)}${VENUE[id].alcohol ? ' · licensed' : ''}</button>`).join('') || '<span class="small muted">No listed venues for this yet.</span>'}</div></section>
    ${v ? `<section class="field"><h3 class="h3">Directions</h3>
      <div class="small muted">${esc(v.address)} · <a href="${mapsLinks(v).google}" target="_blank" rel="noopener">Check it on a map</a></div>
      <label class="eyebrow" for="draftMeet">Meeting point</label><input id="draftMeet" class="text-input" value="${esc(d.meet)}" maxlength="80" placeholder="e.g. North end, by the nets">
      <label class="eyebrow" for="draftDir">Getting there</label><textarea id="draftDir" rows="3" maxlength="300">${esc(d.directions)}</textarea>
      <p class="small muted" style="margin:0">Everyone sees the venue and address. The meeting point only shows to people who are interested or going.</p></section>` : ''}
    <section class="field"><h3 class="h3">Spots</h3>${stepper('have', 'We are')}${stepper('seek', 'Looking for')}<div class="row">${spots(d.have, c.size)}<span class="small muted num">${c.size} total</span></div></section>
    <section class="field"><h3 class="h3">Level</h3><div class="chips">${SKILLS.map((s) => `<button type="button" class="chip" data-act="d-skill" data-v="${s}" aria-pressed="${d.skill === s}">${cap(s)}</button>`).join('')}</div></section>
    <section class="field"><h3 class="h3">Details</h3>
      <textarea id="draftNote" rows="2" maxlength="200" placeholder="What's the plan? e.g. Two sets, then swap partners.">${esc(d.note)}</textarea>
      <label class="eyebrow" for="draftBring">What to bring</label><input id="draftBring" class="text-input" value="${esc(d.bring)}" maxlength="80" placeholder="e.g. Racquet and water">
      <div id="noteWarn">${noteWarnHTML(c.scan)}</div></section>
    <label class="toggle"><input type="checkbox" id="draftApprove" data-act="d-approve" ${d.approve ? 'checked' : ''}>I confirm who joins</label>
    <div class="card"><p class="eyebrow">When you post</p><div class="ledger">
      <div><span>People with a matching ask, told now</span><b class="num">${reach.people.length}</b></div>
      <div><span>People who might be keen, within their 3-a-week cap</span><b class="num">${reach.passive.length}</b></div>
      <div><span>Shown in Explore and search within</span><b class="num">${ME.radius || 10} km</b></div>
    </div></div>
    ${c.sizeBlocked ? '<div class="notice warn"><b>Big plans need trust</b>Plans over 6 people need ID or the Regular level (200+ Goodwill). Verify your ID on the Me tab.</div>' : c.size > 6 ? `<p class="small muted" style="margin:0">Plans over 6 people need ID or the Regular level (200+ Goodwill). You have ${fmtPts(S.points)}.</p>` : ''}
    <div id="publishWrap">${publishBtnHTML()}</div>
  </div>`;
};

// ---------- join requests on your own plans ----------

function requestsHTML(g) {
  const reqs = g.requests || [];
  if (!reqs.length) return '';
  return `<div class="card"><p class="eyebrow">Asking to join</p>${reqs.map((pid) => {
    const p = PERSON[pid];
    return `<div class="member">${avatar(p, 's')}<div style="flex:1;min-width:0"><b>${esc(p.name)}</b> ${gw(p.points)}<div class="small muted">${levelLabel(p.levels[g.act]) || 'New to it'} · ${plural(p.events, 'plan')} · ${p.noShows ? plural(p.noShows, 'no-show') : 'no no-shows'}</div></div>
      <button type="button" class="btn sm sea" data-act="approve" data-v="${g.id}:${pid}">Accept</button><button type="button" class="btn sm ghost" data-act="decline" data-v="${g.id}:${pid}" aria-label="Decline ${esc(p.name)}">No</button></div>`;
  }).join('')}<p class="small muted" style="margin:0">Check their Goodwill and no-shows. Declining is private.</p></div>`;
}

function simulateRequests(plan, candidates) {
  const queue = candidates.filter((id) => !plan.members.includes(id)).slice(0, Math.min(2, plan.size - plan.members.length));
  queue.forEach((pid, i) => {
    setTimeout(() => {
      plan.seen = Math.max(plan.seen, Math.min(plan.sent, 2 + i * 2));
      plan.keen += 1;
      if (i === 0) { plan.interested.push(pid); msgsOf(plan.id).push({ sys: true, text: `${PERSON[pid].name} is interested`, at: new Date() }, { who: pid, text: 'Hi! Is it OK if I come on my own?', at: new Date() }); }
      if (plan.approve) plan.requests.push(pid);
      else { plan.members.push(pid); postSys(plan.id, `${PERSON[pid].name} joined`); }
      updateBadge();
      const v = view();
      if ((['plan', 'thread'].includes(v.name) && v.v === plan.id) || v.name === 'activity') render(true);
      toast(plan.approve ? `${PERSON[pid].name} asked to join "${trunc(plan.title, 24)}"` : `${PERSON[pid].name} joined "${trunc(plan.title, 24)}"`);
    }, 3000 + i * 4000);
  });
}

Object.assign(ACTIONS, {
  create: () => startComposeBlank(),
  compose: () => startCompose(currentIntent()),
  'compose-from-results': () => startCompose(S.intent),
  'd-act': (v) => {
    const d = S.draft;
    if (!v) { d.act = null; render(); return; }
    d.act = v;
    d.seek = Math.max(1, ACT[v].size - d.have);
    d.skill = (ME.levels && ME.levels[v]) || 'casual';
    d.venues = venuesFor(v, d.placeName);
    d.venueId = null;
    if (d.venues.length === 1) pickVenue(d.venues[0]);
    autoTitle();
    render();
  },
  'd-day': (v) => { S.draft.day = +v; autoTitle(); render(true); },
  'd-start': (v) => { S.draft.start = +v; render(true); },
  'd-dur': (v) => { S.draft.dur = +v; render(true); },
  'd-venue': (v) => { pickVenue(v); render(true); },
  'd-skill': (v) => { S.draft.skill = v; render(true); },
  'd-party': (v) => {
    const [k, n] = v.split(':');
    S.draft[k] = Math.min(k === 'have' ? 4 : 20, Math.max(1, S.draft[k] + +n));
    render(true);
  },
  'd-approve': (v, el) => { S.draft.approve = el.checked; },
  publish: () => {
    const d = S.draft;
    if (!draftCheck(d).ok) return;
    const day = new Date(d.day);
    const v = VENUE[d.venueId];
    const reach = match(draftIntent(d), { now: NOW });
    const id = 'mine' + (S.myPlans.length + 1);
    const plan = {
      id, mine: true, posted: true, org: 'me', act: d.act, title: d.title.trim(), venueId: v.id, venue: v.name, place: v.suburb, alcohol: !!v.alcohol,
      meet: d.meet.trim(), directions: d.directions.trim(), bring: d.bring.trim(), note: d.note.trim(),
      slots: [{ start: at(day, d.start), end: at(day, d.start + d.dur) }], members: ['me', ...FRIENDS.slice(0, d.have - 1).map((f) => f.id)], interested: [],
      size: d.have + d.seek, skill: d.skill, approve: d.approve, status: 'open',
      sent: reach.people.length + reach.passive.length, seen: 0, keen: 0, passed: 0, requests: [],
    };
    S.myPlans.unshift(plan);
    S.chat[id] = [{ sys: true, text: `Plan posted. People who are interested or going can chat here.${plan.members.length > 1 ? ` ${plan.members.slice(1).map((m) => PERSON[m].name).join(' and ')} ${plan.members.length > 2 ? 'are' : 'is'} in with you.` : ''}`, at: new Date() }];
    markRead(id);
    S.text = ''; S.over = {}; S.draft = null;
    S.tab = 'activity';
    S.stack = [{ name: 'plan', v: id }];
    render();
    toast(`Posted. ${plural(reach.people.length, 'person')} told now; it's in Explore within ${ME.radius || 10} km.`);
    simulateRequests(plan, [...reach.people.map((x) => x.person.id), ...reach.passive.map((p) => p.id)]);
  },
  approve: (v) => {
    const [gid, pid] = v.split(':');
    const g = findPlan(gid);
    g.requests = g.requests.filter((x) => x !== pid);
    if (g.members.length < g.size) g.members.push(pid);
    postSys(gid, `${PERSON[pid].name} joined`);
    updateBadge(); render(true);
    toast(`${PERSON[pid].name} is in. ${g.size - g.members.length ? `${g.size - g.members.length} spot${g.size - g.members.length === 1 ? '' : 's'} left.` : 'Your plan is full.'}`);
  },
  decline: (v) => {
    const [gid, pid] = v.split(':');
    const g = findPlan(gid);
    g.requests = g.requests.filter((x) => x !== pid);
    g.passed += 1;
    updateBadge(); render(true);
    toast(`Declined. ${PERSON[pid].name} sees "this plan is full".`);
  },
});
