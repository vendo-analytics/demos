// Explore: search, browse and recommendations for events. People are never searchable.
// Loaded after app.js; adds its screens and actions to the shared VIEWS and ACTIONS.

const ICON_SEARCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';

function openEvents() { return [...PLANS, ...S.myPlans.filter((g) => g.org !== 'me')]; }

// Plans you've said yes to: a recommendation at the same time says it clashes.
function myBusy() {
  return allEvents().filter((g) => !g.past && g.status !== 'cancelled' && ['going', 'hosting', 'requested', 'checked_in'].includes(myStatus(g)))
    .map((g) => ({ ...slotOf(g, NOW), id: g.id, title: g.title }));
}
const feedNow = () => rankFeed(ME, openEvents(), { now: NOW, ctx: ctxNow(), busy: myBusy(), feedback: S.recFb });

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
      <div class="foot"><span class="row small">${avatar(org, 's')}<span>${esc(org.name)}</span>${gw(org.points)}</span><span class="row" style="gap:6px">${opts.feedback ? `<button type="button" class="icon-btn more-btn" data-act="rec-menu" data-v="${g.id}" aria-label="Options for ${esc(g.title)}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>` : ''}${cta}</span></div>
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
  const { shown } = feedNow();
  const top = shown.filter((x) => !myStatus(x.plan)).slice(0, 5);
  return `<div class="section-h"><h3 class="h3">Picked for you</h3><button type="button" class="link-btn" data-act="tab" data-v="explore">See all</button></div>
    ${top.length ? `<div class="carousel">${top.map((x) => eventCard(x, { short: true, slide: true, feedback: true })).join('')}</div>` : '<p class="small muted">Nothing nearby yet. Ask for what you want above.</p>'}`;
}

// ---------- Explore screen ----------

const ICON_FILTER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>';
const ICON_CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>';
const ICON_PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/></svg>';
const ICON_BELL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';

const EX_BLANK = () => ({ q: '', act: null, day: null, drop: {}, when: null, radius: null, level: null, spots: false, open: false, sort: 'best', focus: false, view: 'list', mapR: null, pin: null });
const SEARCH_EXAMPLES = ['padel this weekend', 'running before work', 'beginner tennis', 'board games tonight', 'something sunday morning'];
const WHEN_FILTERS = [['today', 'Today'], ['tomorrow', 'Tomorrow'], ['this weekend', 'This weekend'], ['next 7 days', 'Next 7 days']];
const SORTS = [['best', 'Best match'], ['soon', 'Soonest'], ['near', 'Nearest']];

VIEWS.explore = () => bar('Explore', false, `<button type="button" class="btn sm" data-act="create">Create</button>`) + `<div class="pad">
  <div class="search-row">
    <div class="search-wrap">
      <div class="search-box">${ICON_SEARCH}<input id="exInput" type="search" autocomplete="off" enterkeyhint="search" placeholder="Search plans: padel this weekend" value="${esc(S.ex.q)}" aria-label="Search plans" aria-controls="exSuggest"><button type="button" class="link-btn" data-act="ex-clear" id="exClear" ${searching() ? '' : 'hidden'}>Clear</button></div>
      <div id="exSuggest" class="suggest" role="listbox" hidden></div>
    </div>
    <button type="button" class="icon-btn filter-btn" data-act="ex-filters" aria-label="Filters" id="exFilterBtn">${ICON_FILTER}<span class="fbadge num" ${filterCount() ? '' : 'hidden'}>${filterCount()}</span></button>
  </div>
  <div id="exBody" class="ex-body">${exploreBodyHTML()}</div>
</div>`;

// Filters set from the sheet (not typed). Typed ones show as chips instead.
const filterCount = () => [S.ex.when, S.ex.radius, S.ex.level, S.ex.spots || null, S.ex.open || null].filter(Boolean).length;
const searching = () => !!(S.ex.q.trim() || S.ex.act || S.ex.day != null || filterCount());

function exploreBodyHTML() { return searching() ? searchResultsHTML() : exploreHomeHTML(); }

function updateExplore() {
  const b = $('#exBody');
  if (b) b.innerHTML = exploreBodyHTML();
  const c = $('#exClear');
  if (c) c.hidden = !searching();
  const fb = $('#exFilterBtn .fbadge');
  if (fb) { fb.hidden = !filterCount(); fb.textContent = filterCount(); }
  updateSuggest();
  renderNotes();
}

// ---------- typeahead ----------

function updateSuggest() {
  const box = $('#exSuggest');
  if (!box) return;
  const html = S.ex.focus ? suggestHTML() : '';
  box.hidden = !html;
  box.innerHTML = html;
}

function suggestHTML() {
  const q = S.ex.q;
  const row = (icon, label, sub, v, count) => `<button type="button" class="sug" role="option" data-act="ex-q" data-v="${esc(v)}"><span class="sug-ic">${icon}</span><span class="grow"><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>${count == null ? '' : `<span class="small muted num">${count ? plural(count, 'plan') : 'none yet'}</span>`}</button>`;
  if (!q.trim()) {
    const recent = S.searchRecent.slice(0, 4);
    return (recent.length ? `<div class="sug-h">Recent</div>${recent.map((r) => row(ICON_CLOCK, r, '', r)).join('')}` : '') +
      `<div class="sug-h">Try</div>${SEARCH_EXAMPLES.filter((e) => !recent.includes(e)).slice(0, 4).map((e) => row(ICON_SEARCH, e, '', e)).join('')}`;
  }
  const list = searchSuggest(q, ME, openEvents(), { now: NOW, ctx: ctxNow() });
  return list.map((x) => x.kind === 'act' ? row(`<span class="sug-art">${actArt(x.id)}</span>`, x.label, 'Activity', x.q, x.count)
    : x.kind === 'venue' ? row(ICON_PIN, x.label, `Venue · ${x.sub}`, x.q, x.count)
    : x.kind === 'place' ? row(ICON_PIN, x.label, `Suburb · ${x.sub}`, x.q, x.count)
    : row(ICON_SEARCH, x.label, '', x.q)).join('');
}

function rememberSearch(q) {
  q = (q || '').trim();
  if (q.length < 3) return;
  S.searchRecent = [q, ...S.searchRecent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 5);
}

// The suggestion list sits under the box; keep the input focused when it's tapped so the tap lands.
document.addEventListener('pointerdown', (e) => { if (e.target.closest && e.target.closest('#exSuggest')) e.preventDefault(); });
document.addEventListener('focusin', (e) => { if (e.target.id === 'exInput') { S.ex.focus = true; updateSuggest(); } });
document.addEventListener('focusout', (e) => { if (e.target.id === 'exInput') { S.ex.focus = false; rememberSearch(S.ex.q); updateSuggest(); } });

// ---------- saved searches ----------
// A saved search is a private standing query: when a new plan is posted that it matches, you get a notification.
// It never shows you to anyone, unlike an ask, which reaches people.

const savedKey = () => JSON.stringify([S.ex.q.trim().toLowerCase(), S.ex.act, S.ex.when, S.ex.radius, S.ex.level, S.ex.spots, S.ex.open]);
const savedLabel = (x) => x.q || [x.act && ACT[x.act].label, x.when && cap(x.when), x.level && cap(x.level)].filter(Boolean).join(' · ') || 'All plans';

function savedSearchesHTML() {
  if (!S.savedSearches.length) return '';
  return `<div class="section-h"><h3 class="h3">Saved searches</h3><span class="small muted">private</span></div>
    <div class="chips saved-row">${S.savedSearches.map((x, i) => {
      const n = searchEvents(x.q, ME, openEvents(), { now: NOW, ctx: ctxNow(), filters: filtersFrom(x) }).exact.length;
      return `<button type="button" class="chip saved" data-act="ex-run-saved" data-v="${i}">${ICON_BELL}<span>${esc(savedLabel(x))}</span><span class="num muted">${n}</span></button>`;
    }).join('')}</div>`;
}

// ---------- results ----------

function filtersFrom(x) {
  const f = {};
  if (x.act) f.act = x.act; else if (x.drop.act) f.act = null;
  if (x.drop.place) f.place = null;
  if (x.drop.venue) f.venue = null;
  if (x.drop.time) f.time = null;
  if (x.drop.skill) f.skill = null;
  if (x.drop.words) f.words = null;
  if (x.day != null) f.day = x.day;
  if (x.when) f.time = x.when === 'next 7 days' ? { ...parseTime('', NOW), assumed: false } : parseTime(x.when, NOW);
  if (x.radius) f.radius = x.radius;
  else if (x.drop.radius) f.radius = null;
  if (x.level) f.skill = x.level;
  if (x.spots) f.spots = true;
  if (x.open) f.open = true;
  return f;
}
const exFilters = () => filtersFrom(S.ex);

function searchResultsHTML() {
  const r = searchEvents(S.ex.q, ME, openEvents(), { now: NOW, ctx: ctxNow(), filters: exFilters(), sort: S.ex.sort });
  const fl = r.filters;
  const chips = [];
  if (fl.act) chips.push(['act', ACT[fl.act].label]);
  if (fl.venue) chips.push(['venue', VENUE[fl.venue].name.replace(/\s*\(.*\)$/, '')]);
  if (fl.place) chips.push(['place', `${fl.place} · ${fl.radius} km`]);
  else if (fl.radiusSet && !fl.venue) chips.push([S.ex.radius ? 'f-radius' : 'radius', `Within ${fl.radius} km`]);
  if (fl.time) chips.push([S.ex.when ? 'f-when' : 'time', fl.time.label]);
  if (fl.skill) chips.push([S.ex.level ? 'f-level' : 'skill', `${cap(fl.skill)}${fl.skill === 'casual' ? '' : ' or casual'}`]);
  if (S.ex.day != null) chips.push(['day', fmtDay(new Date(S.ex.day), NOW)]);
  if (fl.spots) chips.push(['f-spots', 'Has spots']);
  if (fl.open) chips.push(['f-open', 'Join straight away']);
  if (fl.words && fl.words.length) chips.push(['words', `"${fl.words.join(' ')}"`]);
  const n = r.exact.length;
  const saved = S.savedSearches.some((x) => x.key === savedKey());
  const where = fl.venue ? `at ${VENUE[fl.venue].name.replace(/\s*\(.*\)$/, '')}` : fl.place ? '' : `within ${fl.radius} km of ${ME.suburb}`;
  let h = chips.length ? `<div class="chips filter-chips">${chips.map(([k, label]) => `<button type="button" class="chip on" data-act="ex-drop" data-v="${k}" aria-label="Remove ${esc(label)}">${esc(label)} <span aria-hidden="true">×</span></button>`).join('')}</div>` : '';

  if (r.corrected) {
    h += r.corrected.kind === 'typo'
      ? `<div class="notice info"><span>Showing results for <b>${esc(r.corrected.to.toLowerCase())}</b>.</span><button type="button" class="link-btn" data-act="ex-literal">Search for "${esc(r.corrected.from)}" instead</button></div>`
      : `<div class="notice info"><span>There's no ${esc(r.corrected.from)} on Keen yet, so these are <b>${esc(r.corrected.to.toLowerCase())}</b> plans, the closest thing.</span></div>`;
  }
  if (r.peopleQuery) {
    h += `<div class="notice warn"><b>Search finds plans, not people</b><span>You can't look someone up by name on Keen, so nobody can look you up either. If you've played with ${esc(cap(r.peopleQuery))} before, open their profile from a plan in your history and invite them to one of yours. Or say what you want on Ask and we'll find people.</span><span class="row" style="gap:16px"><button type="button" class="link-btn" data-act="tab" data-v="me">Your history</button><button type="button" class="link-btn" data-act="tab" data-v="ask">Ask</button></span></div>`;
  }
  if (!r.peopleQuery || n) {
    h += `<div class="results-h"><p class="small muted grow" style="margin:0">${plural(n, 'plan')} ${where}</p>${n > 1 ? `<div class="seg" role="group" aria-label="Sort">${SORTS.map(([k, label]) => `<button type="button" data-act="ex-sort" data-v="${k}" aria-pressed="${S.ex.sort === k}">${label}</button>`).join('')}</div>` : ''}</div>`;
  }
  h += r.exact.map((x) => eventCard(x)).join('');

  if (r.fallback) {
    const what = fl.act ? ACT[fl.act].label : 'Plans';
    const head = { time: `${what} at other times`, place: `${what} further away`, skill: `${what} at other levels` }[r.fallback.relax];
    const [act, v] = {
      time: ['ex-drop', S.ex.when ? 'f-when' : 'time'],
      place: fl.venue ? ['ex-drop', 'venue'] : fl.place ? ['ex-drop', 'place'] : ['exf-radius', fl.radius < 20 ? 20 : 50],
      skill: ['ex-drop', S.ex.level ? 'f-level' : 'skill'],
    }[r.fallback.relax];
    h += `<div class="section-h"><h3 class="h3">${esc(head)}</h3><button type="button" class="link-btn" data-act="${act}" data-v="${v}">${r.fallback.relax === 'place' && act === 'exf-radius' ? `Widen to ${v} km` : 'Show all'}</button></div>${r.fallback.items.map((x) => eventCard(x, { short: true })).join('')}`;
  }
  if (r.similar.length) h += `<div class="section-h"><h3 class="h3">Similar</h3><span class="small muted num">${r.similar.length}</span></div>${r.similar.map((x) => eventCard(x, { short: true })).join('')}`;
  h += hiddenNoteHTML(r.hidden, 'ex-hidden');

  const anythingElse = r.fallback || r.similar.length || r.hidden.length;
  if (!n && !r.peopleQuery && anythingElse) {
    h += `<div class="notice info"><span>Not quite what you wanted? Post it yourself, or save it as an ask and we'll find people who want the same.</span><span class="row" style="gap:16px"><button type="button" class="link-btn" data-act="ex-post">Post a plan</button><button type="button" class="link-btn" data-act="ex-ask">Save as an ask</button></span></div>`;
  } else if (!n && !r.peopleQuery) {
    const thing = r.unknown || (fl.act ? ACT[fl.act].label.toLowerCase() : 'this');
    h += `<div class="card empty"><span class="ring">0</span><div class="h3">${r.unknown ? `No ${esc(thing)} plans yet` : 'No plans match'}</div>
      <p class="small muted" style="margin:0;max-width:32ch">${r.unknown ? `Keen counts searches that find nothing. When enough people nearby want ${esc(thing)}, we suggest it to people who could host it.` : "Nobody has posted this yet. Post it yourself, or save it as an ask and we'll find people who want the same."}</p>
      <div class="btn-pair" style="width:100%"><button type="button" class="btn" data-act="ex-post">Post a plan</button><button type="button" class="btn ghost" data-act="ex-ask">Save as an ask</button></div></div>`;
  }
  if (!r.peopleQuery) {
    h += `<button type="button" class="btn block ghost notify-btn" data-act="ex-save" aria-pressed="${saved}">${ICON_BELL}${saved ? 'Saved. You\'ll hear about new matches' : 'Notify me about new plans like this'}</button>`;
  }
  return h;
}

// ---------- filters sheet ----------

function filtersSheet() {
  const n = searchEvents(S.ex.q, ME, openEvents(), { now: NOW, ctx: ctxNow(), filters: exFilters() }).exact.length;
  const chip = (act, v, label, on) => `<button type="button" class="chip" data-act="${act}" data-v="${v}" aria-pressed="${on}">${label}</button>`;
  const html = (`<div class="h3">Filters</div>
    <div class="fgroup"><div class="eyebrow">When</div><div class="chips">${chip('exf-when', '', 'Any time', !S.ex.when)}${WHEN_FILTERS.map(([k, l]) => chip('exf-when', k, l, S.ex.when === k)).join('')}</div></div>
    <div class="fgroup"><div class="eyebrow">Distance from ${esc(ME.suburb)}</div><div class="chips">${[2, 5, 10, 20, 50].map((k) => chip('exf-radius', k, `${k} km`, (S.ex.radius || ME.radius || 10) === k)).join('')}</div></div>
    <div class="fgroup"><div class="eyebrow">Level</div><div class="chips">${chip('exf-level', '', 'Any', !S.ex.level)}${SKILL_LEVELS.map((l) => chip('exf-level', l.id, l.label, S.ex.level === l.id)).join('')}</div></div>
    <label class="toggle"><input type="checkbox" data-act="exf-spots" ${S.ex.spots ? 'checked' : ''}><span class="grow">Only plans with spots left</span></label>
    <label class="toggle"><input type="checkbox" data-act="exf-open" ${S.ex.open ? 'checked' : ''}><span class="grow">Join straight away (no host approval)</span></label>
    <div class="btn-pair"><button type="button" class="btn ghost" data-act="exf-reset">Reset</button><button type="button" class="btn" data-act="close-sheet">Show ${plural(n, 'plan')}</button></div>`);
  // Update in place when it's already open, so the sheet doesn't slide in again on every tap
  const open = $('#overlay .sheet');
  if (open) open.innerHTML = html; else sheet(html);
}

const setFilter = (k, v) => { S.ex[k] = v; updateExplore(); filtersSheet(); };

function exploreHomeHTML() {
  const seg = `<div class="seg wide" role="group" aria-label="View">${[['list', 'List'], ['map', 'Map']].map(([k, l]) => `<button type="button" data-act="ex-view" data-v="${k}" aria-pressed="${S.ex.view === k}">${l}</button>`).join('')}</div>`;
  return `${seg}${S.ex.view === 'map' ? mapViewHTML() : browseListHTML()}`;
}

// A smaller card for browse rows: image, title, when and spots. The full card (with reasons) is for "For you" and search.
function miniCard(x, why) {
  const g = x.plan, left = g.size - g.members.length;
  return `<button type="button" class="mcard" data-act="plan" data-v="${g.id}">
    <span class="mcard-media">${actArt(g.act)}<span class="pill-glass">${esc(ACT[g.act].label)}</span></span>
    <span class="mcard-body"><b>${esc(g.title)}</b><span class="small muted">${esc(fmtSlot(x.slot, NOW))}</span><span class="small muted">${esc(g.venue.replace(/\s*\(.*\)$/, ''))}</span>
    <span class="row small"><span class="stack">${g.members.slice(0, 3).map((m) => avatar(PERSON[m], 's')).join('')}</span><span class="grow"></span><span style="${left <= 2 && left > 0 ? 'color:var(--flag);font-weight:600' : ''}" class="${left > 2 ? 'muted' : ''}">${left <= 0 ? 'Full' : `${left} left`}</span></span></span>
  </button>`;
}

function browseListHTML() {
  const ctx = ctxNow();
  const { shown, hidden, dismissed } = feedNow();
  const recs = shown.filter((x) => !myStatus(x.plan));
  const top = recs.slice(0, 6);
  const seen = new Set(top.map((x) => x.plan.id));
  const idx = browseIndex(ME, openEvents(), NOW, ctx);
  const days = Array.from({ length: 7 }, (_, i) => +startOfDay(new Date(+NOW + i * 864e5)));
  const cols = browseCollections(ME, openEvents().filter((g) => !myStatus(g)), { now: NOW, ctx });
  const colHTML = cols.map((c) => {
    const rest = c.items.filter((x) => !seen.has(x.plan.id));
    const items = rest.length ? rest : c.items;
    const see = c.see ? `<button type="button" class="link-btn" data-act="ex-see" data-v="${c.id}">See all ${c.items.length}</button>` : `<span class="small muted num">${c.items.length}</span>`;
    return `<div class="section-h"><h3 class="h3">${esc(c.title)}</h3>${see}</div><p class="small muted sub-h">${esc(c.why)}</p>
      <div class="carousel minis">${items.map((x) => miniCard(x)).join('')}</div>`;
  }).join('');
  const groups = [...new Set(ACTIVITIES.filter((a) => a.cat !== 'service').map((a) => a.group))];
  const actHTML = groups.map((grp) => {
    const acts = ACTIVITIES.filter((a) => a.group === grp && a.cat !== 'service').sort((a, b) => (idx.byAct[b.id] || 0) - (idx.byAct[a.id] || 0));
    return `<div class="eyebrow grp-h">${esc(grp)}</div>
      <div class="carousel tiles">${acts.map((a) => `<button type="button" class="tile${idx.byAct[a.id] ? '' : ' empty-tile'}" data-act="ex-act" data-v="${a.id}">${actArt(a.id)}<span class="tile-label">${esc(a.label)}<small>${idx.byAct[a.id] ? plural(idx.byAct[a.id], 'plan') : 'None yet'}</small></span></button>`).join('')}</div>`;
  }).join('');
  return `${savedSearchesHTML()}
    <div class="section-h"><h3 class="h3">For you</h3><span class="small muted">${plural(recs.length, 'plan')}</span></div>
    <div class="carousel">${top.map((x) => eventCard(x, { slide: true, short: true, feedback: true })).join('')}</div>
    ${hiddenNoteHTML(hidden, 'ex-hidden')}
    ${feedbackNoteHTML(dismissed)}
    ${colHTML}
    <div class="section-h"><h3 class="h3">Browse by day</h3><span class="small muted">within ${ME.radius || 10} km</span></div>
    <div class="day-strip">${days.map((d, i) => `<button type="button" class="day${i === 0 ? ' today' : ''}" data-act="ex-day" data-v="${d}" ${idx.byDay[d] ? '' : 'disabled'} aria-label="${fmtDay(new Date(d), NOW)}, ${plural(idx.byDay[d] || 0, 'plan')}"><span class="small muted">${i === 0 ? 'Today' : new Date(d).toLocaleDateString('en-AU', { weekday: 'short' })}</span><b class="num">${new Date(d).getDate()}</b><span class="small num" style="color:var(--flag)">${idx.byDay[d] || ''}</span></button>`).join('')}</div>
    <div class="section-h"><h3 class="h3">Browse by activity</h3></div>
    ${actHTML}
    <p class="small muted" style="margin:0">Nothing for what you want? <button type="button" class="link-btn" data-act="tab" data-v="ask">Ask for it</button> or <button type="button" class="link-btn" data-act="create">start one</button>.</p>`;
}

// What you've told the feed, with a way to undo it all. Kept private, like goals.
function feedbackNoteHTML(dismissed) {
  const fewer = Object.keys(S.recFb.fewer).filter((a) => S.recFb.fewer[a]);
  if (!dismissed && !fewer.length) return '';
  const parts = [];
  if (dismissed) parts.push(`hidden ${plural(dismissed, 'plan')}`);
  if (fewer.length) parts.push(`asked for fewer ${fewer.map((a) => ACT[a].label.toLowerCase()).join(' and ')}`);
  return `<div class="hidden-note"><span>You've ${parts.join(' and ')}.</span><button type="button" class="link-btn" data-act="rec-reset">Reset</button></div>`;
}

const refreshFeed = () => { if (view().name === 'explore') updateExplore(); else if (S.tab === 'ask' && !S.stack.length) updatePreview(); };

// ---------- map ----------
// A schematic map around your home suburb: suburbs as labels, venues as pins sized by open plans,
// your travel radius as a ring. Pins that would overlap are grouped; zoom in with the distance chips.

function mapViewHTML() {
  const R = S.ex.mapR || ME.radius || 10;
  const home = PLACE[ME.suburb];
  const W = 360, H = 360, ring = 150, k = ring / R;
  const cos = Math.cos((home.lat * Math.PI) / 180);
  const xy = (p) => [W / 2 + (p.lng - home.lng) * 111.32 * cos * k, H / 2 - (p.lat - home.lat) * 110.57 * k];
  const inView = ([x, y]) => x > 8 && x < W - 8 && y > 8 && y < H - 8;
  const idx = browseIndex(ME, openEvents(), NOW, ctxNow(), R * 1.3);
  // group pins that would overlap at this zoom
  const clusters = [];
  for (const v of [...VENUES].sort((a, b) => (idx.byVenue[b.id] || 0) - (idx.byVenue[a.id] || 0))) {
    const p = xy(v);
    if (!inView(p)) continue;
    const c = clusters.find((c) => Math.hypot(c.x - p[0], c.y - p[1]) < 24);
    if (c) { c.ids.push(v.id); c.n += idx.byVenue[v.id] || 0; } else clusters.push({ x: p[0], y: p[1], ids: [v.id], n: idx.byVenue[v.id] || 0 });
  }
  const sel = S.ex.pin;
  const labels = PLACES.filter((p) => p.name !== ME.suburb).map((p) => [p, xy(p)]).filter(([, q]) => inView(q))
    .map(([p, [x, y]]) => `<text class="map-sub" x="${x.toFixed(1)}" y="${(y + 22).toFixed(1)}" text-anchor="middle">${esc(p.name)}</text>`).join('');
  const pins = clusters.map((c) => {
    const key = c.ids.join(',');
    const v = VENUE[c.ids[0]];
    const [g1, g2] = ART[ACT[v.acts[0]].cat] || ART.service;
    const r = c.n ? Math.min(20, 11 + c.n * 1.6) : 5;
    return `<g class="map-pin${c.n ? '' : ' none'}${sel === key ? ' sel' : ''}" data-act="ex-pin" data-v="${key}" role="button" aria-label="${esc(c.ids.length > 1 ? `${c.ids.length} venues` : v.name)}, ${plural(c.n, 'plan')}">
      <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${r}" fill="${c.n ? `url(#mg-${c.ids[0]})` : 'var(--muted)'}"/>
      ${c.n ? `<defs><linearGradient id="mg-${c.ids[0]}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${g1}"/><stop offset="1" stop-color="${g2}"/></linearGradient></defs><text x="${c.x.toFixed(1)}" y="${(c.y + 4.5).toFixed(1)}" text-anchor="middle" class="map-n">${c.n}</text>` : ''}
    </g>`;
  }).join('');
  const rings = [R / 2, R].map((d) => `<circle cx="${W / 2}" cy="${H / 2}" r="${d * k}" class="map-ring"/><text x="${W / 2 + d * k * 0.707 + 4}" y="${H / 2 - d * k * 0.707 - 4}" class="map-km">${d} km</text>`).join('');
  const svg = `<svg class="map" viewBox="0 0 ${W} ${H}" role="img" aria-label="Map of plans within ${R} km of ${esc(ME.suburb)}">
    <rect width="${W}" height="${H}" class="map-bg"/>${rings}${labels}
    <circle cx="${W / 2}" cy="${H / 2}" r="14" class="map-halo"/><circle cx="${W / 2}" cy="${H / 2}" r="6.5" class="map-me"/>
    <text x="${W / 2}" y="${H / 2 + 26}" text-anchor="middle" class="map-home">${esc(ME.suburb)}</text>${pins}</svg>`;
  const zoom = `<div class="chips">${[2, 5, 10, 20].map((d) => `<button type="button" class="chip" data-act="ex-mapr" data-v="${d}" aria-pressed="${R === d}">${d} km</button>`).join('')}</div>`;
  return `${zoom}<div class="map-card">${svg}</div>${sel ? pinPanelHTML(sel, R) : '<p class="small muted" style="margin:0">Tap a pin to see what\'s on there. Numbers are open plans. Grey dots are venues with nothing on yet.</p>'}`;
}

function pinPanelHTML(key, R) {
  const ids = key.split(',').filter((id) => VENUE[id]);
  const home = PLACE[ME.suburb];
  const plans = openEvents().filter((g) => ids.includes(g.venueId) && !g.past && g.status !== 'cancelled' && g.visibility !== 'invite' && eventPhase(g, NOW) !== 'done' && !touchesBlocked(g, ctxNow()));
  const items = plans.map((g) => scoreEvent(ME, g, ctxNow(), NOW)).sort((a, b) => a.slot.start - b.slot.start);
  const venuesHTML = ids.map((id) => {
    const v = VENUE[id];
    const n = items.filter((x) => x.plan.venueId === id).length;
    const links = mapsLinks(v);
    return `<div class="pin-venue"><span class="grow"><b>${esc(v.name)}</b><small class="muted">${esc(v.address)} · ${km(v, home).toFixed(1)} km${v.alcohol ? ' · licensed' : ''}</small></span>
      ${n ? `<span class="small muted num">${plural(n, 'plan')}</span>` : `<button type="button" class="link-btn" data-act="ex-start-here" data-v="${id}">Start one here</button>`}
      <a class="link-btn" href="${links.apple}" target="_blank" rel="noopener">Directions</a></div>`;
  }).join('');
  return `<div class="card pin-panel">
    <div class="row"><b class="grow">${ids.length > 1 ? `${ids.length} venues here` : esc(VENUE[ids[0]].name)}</b>${ids.length > 1 && R > 2 ? `<button type="button" class="link-btn" data-act="ex-mapr" data-v="${R > 5 ? 5 : 2}">Zoom in</button>` : ''}<button type="button" class="link-btn" data-act="ex-pin" data-v="">Close</button></div>
    ${venuesHTML}
    ${items.length ? `<div class="carousel minis">${items.map((x) => miniCard(x)).join('')}</div>` : ''}
  </div>`;
}


Object.assign(ACTIONS, {
  'ex-clear': () => { const { sort, view, mapR } = S.ex; S.ex = { ...EX_BLANK(), sort, view, mapR }; render(); },
  'ex-act': (v) => { S.ex.act = S.ex.act === v ? null : v; updateExplore(); $('#screen').scrollTop = 0; },
  'ex-day': (v) => { S.ex.day = S.ex.day === +v ? null : +v; updateExplore(); $('#screen').scrollTop = 0; },
  'ex-q': (v) => { S.ex.q = v; S.ex.drop = {}; rememberSearch(v); const i = $('#exInput'); if (i) { i.value = v; i.blur(); } S.ex.focus = false; updateExplore(); },
  'ex-drop': (k) => {
    if (k === 'act') { S.ex.act = null; S.ex.drop.act = true; }
    else if (k === 'day') S.ex.day = null;
    else if (k === 'words') { S.ex.q = ''; const i = $('#exInput'); if (i) i.value = ''; }
    else if (k.startsWith('f-')) { const key = k.slice(2); S.ex[key] = key === 'spots' || key === 'open' ? false : null; }
    else S.ex.drop[k] = true;
    updateExplore();
  },
  'ex-literal': () => { S.ex.drop.act = true; updateExplore(); },
  'ex-sort': (v) => { S.ex.sort = v; updateExplore(); },
  'ex-filters': () => filtersSheet(),
  'exf-when': (v) => setFilter('when', v || null),
  'exf-radius': (v) => { S.ex.radius = +v; updateExplore(); if ($('#overlay .sheet')) filtersSheet(); },
  'exf-level': (v) => setFilter('level', v || null),
  'exf-spots': (v, el) => setFilter('spots', el.checked),
  'exf-open': (v, el) => setFilter('open', el.checked),
  'exf-reset': () => { Object.assign(S.ex, { when: null, radius: null, level: null, spots: false, open: false }); updateExplore(); filtersSheet(); },
  'ex-save': () => {
    const key = savedKey();
    if (S.savedSearches.some((x) => x.key === key)) {
      S.savedSearches = S.savedSearches.filter((x) => x.key !== key);
      toast('Saved search removed.');
    } else {
      const { q, act, when, radius, level, spots, open } = S.ex;
      S.savedSearches.unshift({ key, q: q.trim(), act, when, radius, level, spots, open, day: null, drop: {} });
      toast("Saved. You'll get a notification when a new plan matches. Nobody else can see this.");
    }
    updateExplore();
  },
  'ex-run-saved': (i) => { const x = S.savedSearches[+i]; S.ex = { ...EX_BLANK(), q: x.q, act: x.act, when: x.when, radius: x.radius, level: x.level, spots: x.spots, open: x.open }; render(); },
  'rec-menu': (id) => {
    const g = findPlan(id), a = ACT[g.act];
    sheet(`<div class="h3">${esc(g.title)}</div>
      <button type="button" class="btn block ghost" data-act="rec-hide" data-v="${id}">Not for me: hide this plan</button>
      <button type="button" class="btn block ghost" data-act="rec-fewer" data-v="${g.act}">Show fewer ${esc(a.label.toLowerCase())} plans</button>
      <button type="button" class="btn block ghost" data-act="plan" data-v="${id}">Why am I seeing this?</button>
      <p class="small muted" style="margin:0">Only changes what Keen suggests to you. ${esc(PERSON[g.org].name)} isn't told.</p>`);
  },
  'rec-hide': (id) => { S.recFb.dismissed.add(id); refreshFeed(); toast("Hidden. We'll suggest fewer like it.", { undo: 'rec-unhide', v: id }); },
  'rec-unhide': (id) => { S.recFb.dismissed.delete(id); refreshFeed(); toast('Back in your suggestions.'); },
  'rec-fewer': (act) => { S.recFb.fewer[act] = (S.recFb.fewer[act] || 0) + 1; refreshFeed(); toast(`Showing fewer ${ACT[act].label.toLowerCase()} plans.`, { undo: 'rec-unfewer', v: act }); },
  'rec-unfewer': (act) => { S.recFb.fewer[act] = Math.max(0, (S.recFb.fewer[act] || 0) - 1); refreshFeed(); toast('Undone.'); },
  'rec-reset': () => { S.recFb = { dismissed: new Set(), fewer: {} }; refreshFeed(); toast('Suggestions reset.'); },
  'ex-view': (v) => { S.ex.view = v; S.ex.pin = null; updateExplore(); },
  'ex-mapr': (v) => { S.ex.mapR = +v; S.ex.pin = null; updateExplore(); },
  'ex-pin': (v) => { S.ex.pin = S.ex.pin === v || !v ? null : v; updateExplore(); },
  'ex-start-here': (id) => {
    const v = VENUE[id];
    S.draft = Object.assign(blankDraft(), { preferVenue: id, placeName: v.suburb });
    go('compose');
    if (v.acts.length === 1) ACTIONS['d-act'](v.acts[0]);
  },
  'ex-see': (id) => {
    const c = COLLECTIONS.find((x) => x.id === id);
    S.ex = { ...EX_BLANK(), view: S.ex.view, mapR: S.ex.mapR, ...c.see };
    render();
  },
  'ex-hidden': () => { S.showHidden = !S.showHidden; if (view().name === 'explore') updateExplore(); else updatePreview(); },
  'ex-post': () => {
    const it = parseIntent(S.ex.q || '', ME.suburb, NOW);
    const act = S.ex.act || searchEvents(S.ex.q, ME, [], { now: NOW }).filters.act;
    if (act) it.activity = { ...ACT[act] };
    if (it.activity) startCompose(it); else startComposeBlank();
  },
  'ex-ask': () => { S.text = S.ex.q || (S.ex.act ? ACT[S.ex.act].label : ''); S.over = {}; setTab('ask'); },
});
