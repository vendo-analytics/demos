// Explore: search, browse and recommendations for events. People are never searchable.
// Loaded after app.js; adds its screens and actions to the shared VIEWS and ACTIONS.

const ICON_SEARCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';

function openEvents() { return [...PLANS, ...S.myPlans.filter((g) => g.org !== 'me')]; }

// One card for an event in any list: a big image with the title over it, then who's going and why it fits.
function eventCard(x, opts = {}) {
  const g = x.plan, org = PERSON[g.org], st = myStatus(g);
  const clashText = (x.clash || []).map((c) => ({ alcohol: 'Licensed venue', water: 'Water', heights: 'Heights', contact: 'Contact sport', late: 'Finishes late', early: 'Early start', big: 'Big group' })[c]);
  const full = g.members.length >= g.size;
  const left = g.size - g.members.length;
  const cta = st
    ? `<span class="status ${['going', 'attended', 'hosting'].includes(st) ? 'ok' : 'wait'}">${STATUS_LABEL[st]}</span>`
    : `<button type="button" class="btn sm" data-act="join" data-v="${g.id}">${full ? 'Waitlist' : g.approve ? 'Ask to join' : 'Join'}</button>`;
  const faces = g.members.slice(0, 4).map((m) => avatar(PERSON[m], 's')).join('');
  return `<article class="ecard${opts.slide ? ' slide' : ''}${opts.clashed ? ' clashed' : ''}" data-act="plan" data-v="${g.id}">
    <div class="ecard-media">${actArt(g.act)}<div class="ecard-shade"></div>
      <div class="ecard-top"><span class="pill-glass">${esc(ACT[g.act].label)}</span><span class="pill-glass${eventPhase(g, NOW) === 'live' ? ' hot' : ''}">${esc(fmtSlot(x.slot, NOW))}</span></div>
      <div class="ecard-title"><h3>${esc(g.title)}</h3><p>${esc(g.venue)}</p></div>
    </div>
    <div class="ecard-body">
      <div class="row"><span class="stack">${faces}</span><span class="small muted grow">${g.members.length} going${(g.interested || []).length ? ` · ${g.interested.length} interested` : ''}</span><span class="small ${left <= 2 && left > 0 ? '' : 'muted'}" style="${left <= 2 && left > 0 ? 'color:var(--flag);font-weight:600' : ''}">${full ? 'Full' : `${left} left`}</span></div>
      ${reasonsHTML([...x.reasons, ...clashText.map((t) => ({ ok: false, text: t }))].slice(0, opts.short ? 3 : 5))}
      <div class="foot"><span class="row small">${avatar(org, 's')}<span>${esc(org.name)}</span>${gw(org.points)}</span>${cta}</div>
    </div>
  </article>`;
}

function hiddenNoteHTML(hidden, act) {
  if (!hidden.length) return '';
  const avoided = [...new Set(hidden.flatMap((x) => x.clash))].map((c) => (AVOIDS.find((a) => a.id === c) || {}).label.toLowerCase());
  return `<div class="hidden-note"><span>${plural(hidden.length, 'plan')} hidden because you'd rather avoid ${esc(avoided.join(' and '))}.</span><button type="button" class="link-btn" data-act="${act}">${S.showHidden ? 'Hide again' : 'Show'}</button></div>${S.showHidden ? hidden.map((x) => eventCard(x, { clashed: true })).join('') : ''}`;
}

// Ask tab: the top few recommendations under the ask box, as sliding cards.
function feedHTML() {
  const { shown } = rankFeed(ME, openEvents(), { now: NOW, ctx: ctxNow() });
  const top = shown.filter((x) => !myStatus(x.plan)).slice(0, 5);
  return `<div class="section-h"><h3 class="h3">Picked for you</h3><button type="button" class="link-btn" data-act="tab" data-v="explore">See all</button></div>
    ${top.length ? `<div class="carousel">${top.map((x) => eventCard(x, { short: true, slide: true })).join('')}</div>` : '<p class="small muted">Nothing nearby yet. Ask for what you want above.</p>'}`;
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
  const recs = shown.filter((x) => !myStatus(x.plan));
  const weekend = recs.filter((x) => [0, 6].includes(x.slot.start.getDay()) && (x.slot.start - NOW) / 864e5 < 7);
  const idx = browseIndex(ME, openEvents(), NOW, ctxNow());
  const days = Array.from({ length: 7 }, (_, i) => +startOfDay(new Date(+NOW + i * 864e5)));
  const acts = ACTIVITIES.filter((a) => a.cat !== 'service');
  const withPlans = acts.filter((a) => idx.byAct[a.id]).sort((a, b) => idx.byAct[b.id] - idx.byAct[a.id]);
  const without = acts.filter((a) => !idx.byAct[a.id]);
  return `
    <div class="section-h"><h3 class="h3">For you</h3><span class="small muted">${plural(recs.length, 'plan')}</span></div>
    <div class="carousel">${recs.slice(0, 6).map((x) => eventCard(x, { slide: true, short: true })).join('')}</div>
    ${hiddenNoteHTML(hidden, 'ex-hidden')}
    ${weekend.length ? `<div class="section-h"><h3 class="h3">This weekend</h3><span class="small muted">${plural(weekend.length, 'plan')}</span></div>
    <div class="carousel">${weekend.map((x) => eventCard(x, { slide: true, short: true })).join('')}</div>` : ''}
    <div class="section-h"><h3 class="h3">Browse by activity</h3></div>
    <div class="carousel tiles">${withPlans.map((a) => `<button type="button" class="tile" data-act="ex-act" data-v="${a.id}">${actArt(a.id)}<span class="tile-label">${esc(a.label)}<small>${plural(idx.byAct[a.id], 'plan')}</small></span></button>`).join('')}</div>
    ${without.length ? `<p class="small muted" style="margin:0">Nothing nearby yet for ${esc(without.slice(0, 4).map((a) => a.label.toLowerCase()).join(', '))}${without.length > 4 ? ` and ${without.length - 4} more` : ''}. <button type="button" class="link-btn" data-act="tab" data-v="ask">Ask for it</button> or <button type="button" class="link-btn" data-act="create">start one</button>.</p>` : ''}
    <div class="section-h"><h3 class="h3">Browse by day</h3><span class="small muted">within ${ME.radius || 10} km</span></div>
    <div class="day-strip">${days.map((d) => `<button type="button" class="day" data-act="ex-day" data-v="${d}" ${idx.byDay[d] ? '' : 'disabled'}><span class="small muted">${new Date(d).toLocaleDateString('en-AU', { weekday: 'short' })}</span><b class="num">${new Date(d).getDate()}</b><span class="small num" style="color:var(--flag)">${idx.byDay[d] || ''}</span></button>`).join('')}</div>`;
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
