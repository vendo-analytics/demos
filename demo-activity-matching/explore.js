// Explore: search, browse and recommendations for events. People are never searchable.
// Loaded after app.js; adds its screens and actions to the shared VIEWS and ACTIONS.

const ICON_SEARCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';

function openEvents() { return [...PLANS, ...S.myPlans.filter((g) => g.org !== 'me')]; }

// One card for an event in any list: recommendation, search result or browse.
function eventCard(x, opts = {}) {
  const g = x.plan, org = PERSON[g.org], st = myStatus(g);
  const clashText = (x.clash || []).map((c) => ({ alcohol: 'Licensed venue', water: 'Water', heights: 'Heights', contact: 'Contact sport', late: 'Finishes late', early: 'Early start', big: 'Big group' })[c]);
  const full = g.members.length >= g.size;
  const cta = st
    ? `<span class="status ${['going', 'attended', 'hosting'].includes(st) ? 'ok' : 'wait'}">${STATUS_LABEL[st]}</span>`
    : `<button type="button" class="btn sm sea" data-act="join" data-v="${g.id}">${full ? 'Waitlist' : g.approve ? 'Ask to join' : 'Join'}</button>`;
  return `<article class="card tap feed-card${opts.clashed ? ' clashed' : ''}" data-act="plan" data-v="${g.id}">
    <div class="row"><span class="act-tag grow">${esc(ACT[g.act].label)}</span><span class="small muted num">${esc(fmtSlot(x.slot, NOW))}</span></div>
    <div class="h3">${esc(g.title)}</div>
    <div class="muted small" style="margin-top:-6px">${esc(g.venue)}</div>
    <div class="row">${spots(g.members.length, g.size)}<span class="small muted num">${g.members.length}/${g.size}</span>${(g.interested || []).length ? `<span class="small muted">· ${g.interested.length} interested</span>` : ''}</div>
    ${reasonsHTML([...x.reasons, ...clashText.map((t) => ({ ok: false, text: t }))].slice(0, opts.short ? 3 : 6))}
    <div class="foot"><span class="row small">${avatar(org, 's')}<span>${esc(org.name)} ${gw(org.points)}</span></span>${cta}</div>
  </article>`;
}

function hiddenNoteHTML(hidden, act) {
  if (!hidden.length) return '';
  const avoided = [...new Set(hidden.flatMap((x) => x.clash))].map((c) => (AVOIDS.find((a) => a.id === c) || {}).label.toLowerCase());
  return `<div class="hidden-note"><span>${plural(hidden.length, 'plan')} hidden because you'd rather avoid ${esc(avoided.join(' and '))}.</span><button type="button" class="link-btn" data-act="${act}">${S.showHidden ? 'Hide again' : 'Show'}</button></div>${S.showHidden ? hidden.map((x) => eventCard(x, { clashed: true })).join('') : ''}`;
}

// Ask tab: the top few recommendations under the ask box.
function feedHTML() {
  const { shown } = rankFeed(ME, openEvents(), { now: NOW, ctx: ctxNow() });
  const top = shown.filter((x) => !myStatus(x.plan)).slice(0, 3);
  return `<div class="section-h"><h3 class="h3">Picked for you</h3><button type="button" class="link-btn" data-act="tab" data-v="explore">See all in Explore</button></div>
    ${top.map((x) => eventCard(x, { short: true })).join('') || '<p class="small muted">Nothing nearby yet. Ask for what you want above.</p>'}`;
}

// ---------- Explore screen ----------

VIEWS.explore = () => bar('Explore', false, `<button type="button" class="btn sm" data-act="create">Create</button>`) + `<div class="pad">
  <div class="search-box">${ICON_SEARCH}<input id="exInput" type="search" autocomplete="off" placeholder="Search plans: padel this weekend" value="${esc(S.ex.q)}" aria-label="Search plans"><button type="button" class="link-btn" data-act="ex-clear" id="exClear" ${S.ex.q || S.ex.act || S.ex.day != null ? '' : 'hidden'}>Clear</button></div>
  <div id="exBody" class="ex-body">${exploreBodyHTML()}</div>
</div>`;

const searching = () => !!(S.ex.q.trim() || S.ex.act || S.ex.day != null);

function exploreBodyHTML() { return searching() ? searchResultsHTML() : exploreHomeHTML(); }

function updateExplore() {
  const b = $('#exBody');
  if (b) b.innerHTML = exploreBodyHTML();
  const c = $('#exClear');
  if (c) c.hidden = !searching();
  renderNotes();
}

function exploreHomeHTML() {
  const { shown, hidden } = rankFeed(ME, openEvents(), { now: NOW, ctx: ctxNow() });
  const recs = shown.filter((x) => !myStatus(x.plan)).slice(0, 4);
  const idx = browseIndex(ME, openEvents(), NOW);
  const days = Array.from({ length: 7 }, (_, i) => +startOfDay(new Date(+NOW + i * 864e5)));
  const groups = {};
  ACTIVITIES.filter((a) => a.cat !== 'service').forEach((a) => (groups[a.group] ||= []).push(a));
  return `
    <div class="section-h"><h3 class="h3">For you</h3><span class="small muted">from your interests, history and free time</span></div>
    ${recs.map((x) => eventCard(x)).join('')}
    ${hiddenNoteHTML(hidden, 'ex-hidden')}
    <div class="section-h"><h3 class="h3">Browse by day</h3><span class="small muted">within ${ME.radius || 10} km</span></div>
    <div class="day-strip">${days.map((d) => `<button type="button" class="day" data-act="ex-day" data-v="${d}" ${idx.byDay[d] ? '' : 'disabled'}><span class="small muted">${new Date(d).toLocaleDateString('en-AU', { weekday: 'short' })}</span><b class="num">${new Date(d).getDate()}</b><span class="small num">${idx.byDay[d] || 0}</span></button>`).join('')}</div>
    <div class="section-h"><h3 class="h3">Browse by activity</h3></div>
    ${Object.entries(groups).map(([gname, acts]) => `<p class="small muted" style="margin:0">${gname}</p><div class="chips">${acts.map((a) => `<button type="button" class="chip" data-act="ex-act" data-v="${a.id}" ${idx.byAct[a.id] ? '' : 'disabled'}>${esc(a.label)} <span class="num muted">${idx.byAct[a.id] || 0}</span></button>`).join('')}</div>`).join('')}
    <p class="small muted" style="margin:0">Can't find it? <button type="button" class="link-btn" data-act="tab" data-v="ask">Ask for it</button> and we'll find people, or <button type="button" class="link-btn" data-act="create">create a plan</button>.</p>`;
}

function exFilters() {
  const f = {};
  if (S.ex.act) f.act = S.ex.act; else if (S.ex.drop.act) f.act = null;
  if (S.ex.drop.place) f.place = null;
  if (S.ex.drop.time) f.time = null;
  if (S.ex.drop.skill) f.skill = null;
  if (S.ex.day != null) f.day = S.ex.day;
  return f;
}

function searchResultsHTML() {
  const r = searchEvents(S.ex.q, ME, openEvents(), { now: NOW, ctx: ctxNow(), filters: exFilters() });
  const fl = r.filters;
  const chips = [];
  if (fl.act) chips.push(['act', ACT[fl.act].label]);
  if (fl.place) chips.push(['place', `${fl.place} · ${fl.radius} km`]);
  if (fl.time) chips.push(['time', fl.time.label]);
  if (fl.skill) chips.push(['skill', cap(fl.skill)]);
  if (S.ex.day != null) chips.push(['day', fmtDay(new Date(S.ex.day), NOW)]);
  if (fl.words && fl.words.length) chips.push(['words', `"${fl.words.join(' ')}"`]);
  const n = r.exact.length;
  let h = `<div class="chips filter-chips">${chips.map(([k, label]) => `<button type="button" class="chip on" data-act="ex-drop" data-v="${k}" aria-label="Remove ${esc(label)}">${esc(label)} <span aria-hidden="true">×</span></button>`).join('')}</div>
    <p class="small muted" style="margin:0">${plural(n, 'plan')}${!fl.place ? ` within ${ME.radius || 10} km of ${esc(ME.suburb)}` : ''}. Search finds plans, never people.</p>`;
  h += r.exact.map((x) => eventCard(x)).join('');
  if (r.similar.length) h += `<div class="section-h"><h3 class="h3">Similar</h3><span class="small muted num">${r.similar.length}</span></div>${r.similar.map((x) => eventCard(x, { short: true })).join('')}`;
  h += hiddenNoteHTML(r.hidden, 'ex-hidden');
  if (!n && !r.similar.length) {
    h += `<div class="card empty"><span class="ring">0</span><div class="h3">No plans match</div>
      <p class="small muted" style="margin:0;max-width:30ch">Nobody has posted this yet. Post it yourself, or save it as an ask and we'll find people who want the same.</p>
      <div class="btn-pair" style="width:100%"><button type="button" class="btn" data-act="ex-post">Post a plan</button><button type="button" class="btn ghost" data-act="ex-ask">Save as an ask</button></div></div>`;
  }
  return h;
}

Object.assign(ACTIONS, {
  'ex-clear': () => { S.ex = { q: '', act: null, day: null, drop: {} }; render(); },
  'ex-act': (v) => { S.ex.act = S.ex.act === v ? null : v; updateExplore(); $('#screen').scrollTop = 0; },
  'ex-day': (v) => { S.ex.day = S.ex.day === +v ? null : +v; updateExplore(); $('#screen').scrollTop = 0; },
  'ex-drop': (k) => {
    if (k === 'act') { S.ex.act = null; S.ex.drop.act = true; }
    else if (k === 'day') S.ex.day = null;
    else if (k === 'words') { S.ex.q = ''; const i = $('#exInput'); if (i) i.value = ''; }
    else S.ex.drop[k] = true;
    updateExplore();
  },
  'ex-hidden': () => { S.showHidden = !S.showHidden; if (view().name === 'explore') updateExplore(); else updatePreview(); },
  'ex-post': () => {
    const it = parseIntent(S.ex.q || '', ME.suburb, NOW);
    if (S.ex.act) it.activity = { ...ACT[S.ex.act] };
    if (it.activity) startCompose(it); else startComposeBlank();
  },
  'ex-ask': () => { S.text = S.ex.q || (S.ex.act ? ACT[S.ex.act].label : ''); S.over = {}; setTab('ask'); },
});
