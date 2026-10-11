// Plans: the "Happening near you" feed, posting a plan, and approving join requests.
// Loaded after app.js; adds its screens and actions to the shared VIEWS and ACTIONS.

// ---------- feed ----------

const FEED_TABS = [['foryou', 'For you'], ['nearby', 'All nearby'], ['weekend', 'This weekend']];

function feedItems() {
  const { shown, hidden } = rankFeed(ME, PLANS, { now: NOW });
  let list = shown;
  if (S.feedTab === 'foryou') list = shown.filter((x) => x.into || x.near);
  if (S.feedTab === 'weekend') list = shown.filter((x) => [0, 6].includes(x.slot.start.getDay()) && (x.slot.start - NOW) / 864e5 < 7);
  return { list, hidden };
}

function feedCard(x, clashed = false) {
  const g = x.plan, org = PERSON[g.org], asked = S.requested.has(g.id);
  const clashText = x.clash.map((c) => ({ alcohol: 'Licensed venue', water: 'Water', heights: 'Heights', contact: 'Contact sport', late: 'Finishes late', early: 'Early start', big: 'Big group' })[c]);
  return `<article class="card tap feed-card${clashed ? ' clashed' : ''}" data-act="plan" data-v="${g.id}">
    <div class="row"><span class="act-tag grow">${esc(ACT[g.act].label)}</span><span class="small muted num">${esc(fmtSlot(x.slot, NOW))}</span></div>
    <div class="h3">${esc(g.title)}</div>
    <div class="muted small" style="margin-top:-6px">${esc(g.venue)}</div>
    <div class="row">${spots(g.members.length, g.size)}<span class="small muted num">${g.members.length}/${g.size}</span></div>
    ${reasonsHTML([...x.reasons, ...clashText.map((t) => ({ ok: false, text: t }))])}
    <div class="foot"><span class="row small">${avatar(org, 's')}<span>${esc(org.name)} ${gw(org.points)}</span></span>
      <button type="button" class="btn sm ${asked ? 'done' : 'sea'}" data-act="join" data-v="${g.id}" ${asked ? 'disabled' : ''}>${asked ? 'Requested' : 'Ask to join'}</button></div>
  </article>`;
}

function feedHTML() {
  const { list, hidden } = feedItems();
  const avoided = [...new Set(hidden.flatMap((x) => x.clash))].map((c) => (AVOIDS.find((a) => a.id === c) || {}).label.toLowerCase());
  let h = `<div class="section-h"><h3 class="h3">Happening near you</h3><span class="small muted">within ${ME.radius || 10} km of ${esc(ME.suburb)}</span></div>
    <div class="chips" role="tablist">${FEED_TABS.map(([k, label]) => `<button type="button" class="chip" role="tab" data-act="feed-tab" data-v="${k}" aria-pressed="${S.feedTab === k}">${label}</button>`).join('')}</div>`;
  h += list.length ? list.map((x) => feedCard(x)).join('') : `<p class="small muted">Nothing here yet. Try "All nearby", or post a plan of your own.</p>`;
  if (hidden.length) {
    h += `<div class="hidden-note"><span>${plural(hidden.length, 'plan')} hidden because you'd rather avoid ${esc(avoided.join(' and '))}.</span><button type="button" class="link-btn" data-act="feed-hidden">${S.showHidden ? 'Hide again' : 'Show'}</button></div>`;
    if (S.showHidden) h += hidden.map((x) => feedCard(x, true)).join('');
  }
  return h;
}

// ---------- compose ----------

const START_TIMES = [6, 7, 8, 9, 10, 11, 12, 14, 16, 17, 17.5, 18, 18.5, 19, 20];

function startCompose(it) {
  if (!it.activity || it.flags.length) return;
  const days = [];
  for (const sl of it.time.slots) { const d = startOfDay(sl.start); if (!days.some((x) => +x === +d)) days.push(d); }
  const here = PLACE[it.place.name] || PLACE[ME.suburb];
  const venues = VENUES.filter((v) => v.acts.includes(it.activity.id))
    .map((v) => ({ v, d: km(PLACE[v.suburb], here) })).sort((a, b) => a.d - b.d).slice(0, 6).map((x) => x.v.name);
  const day = days.length === 1 ? +days[0] : null;
  S.draft = {
    act: it.activity.id, raw: it.raw, days: days.slice(0, 7).map(Number), day,
    window: [it.time.from, it.time.to], start: it.time.exact ? it.time.from : null, dur: it.time.exact ? Math.max(1, it.time.to - it.time.from) : 1.5,
    venues, venue: it.venue ? it.venue.name : venues.length === 1 ? venues[0] : null, placeName: it.place.remote ? ME.suburb : it.place.name,
    have: it.party.have, seek: it.party.seek, skill: it.skill || 'casual', note: '', approve: true, title: '', titleEdited: false,
  };
  if (it.venue && !venues.includes(it.venue.name)) S.draft.venues.unshift(it.venue.name);
  autoTitle();
  go('compose');
}

function autoTitle() {
  const d = S.draft;
  if (d.titleEdited) return;
  const act = ACT[d.act].label;
  d.title = d.day != null ? `${cap(DOW[new Date(d.day).getDay()])} ${act.toLowerCase()}` : `${act} meetup`;
}

function draftIntent(d) {
  const day = new Date(d.day != null ? d.day : d.days[0]);
  const start = d.start != null ? d.start : d.window[0];
  const end = d.start != null ? d.start + d.dur : d.window[1];
  const venue = VENUES.find((v) => v.name === d.venue);
  const place = venue ? venue.suburb : PLACE[d.placeName] ? d.placeName : ME.suburb;
  return {
    raw: d.raw, activity: ACT[d.act], place: { name: place, radius: ME.radius || 10, remote: false }, time: { slots: [{ start: at(day, start), end: at(day, end) }], label: '' },
    party: { have: d.have, seek: d.seek }, skill: d.skill, role: null, flags: [], missing: [],
  };
}

function draftCheck(d) {
  const scan = screenMessage(d.note || '');
  const size = d.have + d.seek;
  const sizeBlocked = size > 6 && S.points < 100 && !S.idVerified;
  let why = null;
  if (d.day == null) why = 'Pick a day';
  else if (d.start == null) why = 'Pick a start time';
  else if (!d.venue) why = 'Pick a venue';
  else if (!d.title.trim()) why = 'Give it a title';
  else if (scan.hits.length) why = 'Fix the note to post';
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

function composeLive() {
  const w = $('#noteWarn');
  if (w) w.innerHTML = noteWarnHTML(screenMessage(S.draft.note || ''));
  const p = $('#publishWrap');
  if (p) p.innerHTML = publishBtnHTML();
}

VIEWS.compose = () => {
  const d = S.draft, act = ACT[d.act];
  const c = draftCheck(d);
  const reach = match(draftIntent(d), { now: NOW });
  const inWindow = (h) => d.window[0] === 7 && d.window[1] === 21 ? true : h >= d.window[0] && h <= d.window[1] - 0.5;
  let times = START_TIMES.filter(inWindow);
  if (d.start != null && !times.includes(d.start)) times = [...times, d.start].sort((a, b) => a - b);
  if (!times.length) times = START_TIMES;
  const venueChip = (name) => {
    const v = VENUES.find((x) => x.name === name);
    return `<button type="button" class="chip" data-act="d-venue" data-v="${esc(name)}" aria-pressed="${d.venue === name}">${esc(name)}${v && v.alcohol ? ' · licensed' : ''}</button>`;
  };
  const stepper = (k, label) => `<div class="stepper"><span>${label}</span><span class="ctl"><button type="button" class="icon-btn" data-act="d-party" data-v="${k}:-1" aria-label="Fewer">−</button><b>${d[k]}</b><button type="button" class="icon-btn" data-act="d-party" data-v="${k}:1" aria-label="More">+</button></span></div>`;
  return bar('Post a plan') + `<div class="pad">
    <div><p class="eyebrow">${esc(act.label)} · new plan</p><input id="draftTitle" class="title-input" value="${esc(d.title)}" maxlength="60" aria-label="Plan title"></div>
    <section class="field"><h3 class="h3">Day</h3><div class="chips">${d.days.map((x) => `<button type="button" class="chip" data-act="d-day" data-v="${x}" aria-pressed="${d.day === x}">${esc(fmtDay(new Date(x), NOW))}</button>`).join('')}</div></section>
    <section class="field"><h3 class="h3">Starts</h3><div class="chips">${times.map((h) => `<button type="button" class="chip num" data-act="d-start" data-v="${h}" aria-pressed="${d.start === h}">${fmtHourLabel(h)}</button>`).join('')}</div>
      <p class="eyebrow">For</p><div class="chips">${[1, 1.5, 2, 3].map((h) => `<button type="button" class="chip" data-act="d-dur" data-v="${h}" aria-pressed="${d.dur === h}">${h === 1 ? '1 hour' : `${h} hours`}</button>`).join('')}</div></section>
    <section class="field"><h3 class="h3">Where</h3><p class="small muted" style="margin:0">Public places only. Courts, ovals, beaches, cafés.</p><div class="chips">${d.venues.map(venueChip).join('') || '<span class="small muted">No listed venues for this yet.</span>'}</div></section>
    <section class="field"><h3 class="h3">Spots</h3>${stepper('have', 'We are')}${stepper('seek', 'Looking for')}<div class="row">${spots(d.have, c.size)}<span class="small muted num">${c.size} total</span></div></section>
    <section class="field"><h3 class="h3">Level</h3><div class="chips">${SKILLS.map((s) => `<button type="button" class="chip" data-act="d-skill" data-v="${s}" aria-pressed="${d.skill === s}">${cap(s)}</button>`).join('')}</div></section>
    <section class="field"><h3 class="h3">Note</h3><textarea id="draftNote" rows="2" maxlength="200" placeholder="Bibs and ball sorted. Bring water.">${esc(d.note)}</textarea><div id="noteWarn">${noteWarnHTML(c.scan)}</div></section>
    <label class="toggle"><input type="checkbox" id="draftApprove" data-act="d-approve" ${d.approve ? 'checked' : ''}>I approve who joins</label>
    <div class="card"><p class="eyebrow">When you post</p><div class="ledger">
      <div><span>People with a matching ask, told now</span><b class="num">${reach.people.length}</b></div>
      <div><span>People who might be keen, within their 3-a-week cap</span><b class="num">${reach.passive.length}</b></div>
      <div><span>Shows in "Happening near you" within</span><b class="num">${ME.radius || 10} km</b></div>
    </div></div>
    ${c.sizeBlocked ? '<div class="notice warn"><b>Big plans need trust</b>Plans over 6 people need ID or 100+ Goodwill. Verify your ID on the Me tab.</div>' : c.size > 6 ? `<p class="small muted" style="margin:0">Plans over 6 people need ID or 100+ Goodwill. You have ${fmtPts(S.points)}.</p>` : ''}
    <div id="publishWrap">${publishBtnHTML()}</div>
  </div>`;
};

function fmtHourLabel(h) {
  const hh = Math.floor(h), mm = Math.round((h % 1) * 60);
  return `${((hh + 11) % 12) + 1}${mm ? ':' + String(mm).padStart(2, '0') : ''}${hh < 12 ? 'am' : 'pm'}`;
}

// ---------- join requests on your own plans ----------

function requestsHTML(g) {
  const reqs = g.requests || [];
  if (!reqs.length) return '';
  return `<div class="card"><p class="eyebrow">Asking to join</p>${reqs.map((pid) => {
    const p = PERSON[pid];
    return `<div class="member">${avatar(p, 's')}<div style="flex:1;min-width:0"><b>${esc(p.name)}</b> ${gw(p.points)}<div class="small muted">★ ${p.rating} · ${plural(p.events, 'event')} · ${p.noShows ? plural(p.noShows, 'no-show') : 'no no-shows'}</div></div>
      <button type="button" class="btn sm sea" data-act="approve" data-v="${g.id}:${pid}">Accept</button><button type="button" class="btn sm ghost" data-act="decline" data-v="${g.id}:${pid}" aria-label="Decline ${esc(p.name)}">No</button></div>`;
  }).join('')}<p class="small muted" style="margin:0">Check their Goodwill and no-shows. Declining is private.</p></div>`;
}

function simulateRequests(plan, candidates) {
  const queue = candidates.filter((id) => !plan.members.includes(id)).slice(0, Math.min(2, plan.size - plan.members.length));
  queue.forEach((pid, i) => {
    setTimeout(() => {
      plan.seen = Math.max(plan.seen, Math.min(plan.sent, 2 + i * 2));
      plan.keen += 1;
      if (plan.approve) plan.requests.push(pid);
      else { plan.members.push(pid); S.chat[plan.id].push({ sys: true, text: `${PERSON[pid].name} joined.` }); }
      updateBadge();
      const v = view();
      if ((v.name === 'plan' && v.v === plan.id) || v.name === 'activity') render(true);
      toast(plan.approve ? `${PERSON[pid].name} asked to join "${trunc(plan.title, 24)}"` : `${PERSON[pid].name} joined "${trunc(plan.title, 24)}"`);
    }, 3000 + i * 4000);
  });
}

Object.assign(ACTIONS, {
  'feed-tab': (v) => { S.feedTab = v; updatePreview(); },
  'feed-hidden': () => { S.showHidden = !S.showHidden; updatePreview(); },
  compose: () => startCompose(currentIntent()),
  'compose-from-results': () => startCompose(S.intent),
  'd-day': (v) => { S.draft.day = +v; autoTitle(); render(true); },
  'd-start': (v) => { S.draft.start = +v; render(true); },
  'd-dur': (v) => { S.draft.dur = +v; render(true); },
  'd-venue': (v) => { S.draft.venue = v; render(true); },
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
    const venue = VENUES.find((x) => x.name === d.venue) || { name: d.venue, suburb: d.placeName };
    const reach = match(draftIntent(d), { now: NOW });
    const id = 'mine' + (S.myPlans.length + 1);
    const plan = {
      id, mine: true, posted: true, org: 'me', act: d.act, title: d.title.trim(), place: venue.suburb, venue: venue.name, alcohol: !!venue.alcohol,
      slots: [{ start: at(day, d.start), end: at(day, d.start + d.dur) }], members: ['me', ...FRIENDS.slice(0, d.have - 1).map((f) => f.id)],
      size: d.have + d.seek, skill: d.skill, note: d.note.trim(), approve: d.approve,
      sent: reach.people.length + reach.passive.length, seen: 0, keen: 0, passed: 0, requests: [],
    };
    S.myPlans.unshift(plan);
    S.chat[id] = [{ sys: true, text: `Plan posted. People who join can chat here.${plan.members.length > 1 ? ` ${plan.members.slice(1).map((m) => PERSON[m].name).join(' and ')} ${plan.members.length > 2 ? 'are' : 'is'} in with you.` : ''}` }];
    S.text = ''; S.over = {}; S.draft = null;
    S.tab = 'activity';
    S.stack = [{ name: 'plan', v: id }];
    render();
    toast(`Posted. ${plural(reach.people.length, 'person')} told now; it's in the feed within ${ME.radius || 10} km.`);
    simulateRequests(plan, [...reach.people.map((x) => x.person.id), ...reach.passive.map((p) => p.id)]);
  },
  approve: (v) => {
    const [gid, pid] = v.split(':');
    const g = findPlan(gid);
    g.requests = g.requests.filter((x) => x !== pid);
    if (g.members.length < g.size) g.members.push(pid);
    S.chat[gid].push({ sys: true, text: `${PERSON[pid].name} joined.` });
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
