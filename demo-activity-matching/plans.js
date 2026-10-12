// Creating events: from an ask ("Post as a plan") or from scratch, with venue, meeting point
// and directions; and the organiser's side of join requests.
// Loaded after app.js; adds its screens and actions to the shared VIEWS and ACTIONS.

const START_TIMES = [6, 7, 8, 9, 10, 11, 12, 14, 16, 17, 17.5, 18, 18.5, 19, 20];

function venuesFor(act, near) {
  const here = PLACE[near] || PLACE[ME.suburb];
  return VENUES.filter((v) => v.acts.includes(act)).map((v) => ({ v, d: km(v, here) })).sort((a, b) => a.d - b.d).slice(0, 6).map((x) => x.v.id);
}

function blankDraft() {
  // Today too, if there's still a start time at least an hour away
  const todayOk = START_TIMES.some((h) => +at(NOW, h) >= +NOW + 36e5);
  const days = Array.from({ length: 7 }, (_, i) => +startOfDay(new Date(+NOW + (todayOk ? i : i + 1) * 864e5)));
  return {
    act: null, raw: '', days, day: null, window: [7, 21], start: null, dur: 1.5, venues: [], venueId: null, placeName: ME.suburb,
    have: 1, seek: 3, skill: 'casual', note: '', bring: '', meet: '', meetEdited: false, directions: '', dirEdited: false,
    approve: true, visibility: 'public', repeat: false, dupOk: false, title: '', titleEdited: false, editingId: null,
  };
}

// Edit a plan you host. Everything is editable except the activity once someone else has joined.
function startEdit(id) {
  const g = findPlan(id);
  const slot = slotOf(g, NOW);
  const d = blankDraft();
  const day = +startOfDay(slot.start);
  const mine = g.members.filter((m) => m === 'me' || FRIENDS.some((f) => f.id === m)).length;
  Object.assign(d, {
    editingId: id, act: g.act, title: g.title, titleEdited: true, raw: '',
    days: [...new Set([day, ...d.days])].sort((a, b) => a - b), day, start: hourOf(slot.start), dur: (slot.end - slot.start) / 36e5,
    venues: [...new Set([g.venueId, ...venuesFor(g.act, g.place)])], venueId: g.venueId,
    meet: g.meet, meetEdited: true, directions: g.directions, dirEdited: true, bring: g.bring || '', note: g.note || '',
    have: mine, seek: g.size - mine, skill: g.skill, approve: g.approve, visibility: g.visibility || 'public',
  });
  S.draft = d;
  go('compose');
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

// The draft as a plan, so the graph can work out who it would reach.
function draftPlan(d) {
  const day = new Date(d.day != null ? d.day : d.days[0]);
  const start = d.start != null ? d.start : d.window[0];
  const end = d.start != null ? d.start + d.dur : d.window[1];
  const v = VENUE[d.venueId];
  return {
    id: d.editingId || 'draft', org: 'me', act: d.act, venueId: v ? v.id : null, place: v ? v.suburb : PLACE[d.placeName] ? d.placeName : ME.suburb,
    alcohol: !!(v && v.alcohol), slots: [{ start: at(day, start), end: at(day, end) }], members: ['me'], size: d.have + d.seek, skill: d.skill,
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
  else if (!d.editingId && +at(new Date(d.day), d.start) < +NOW + 36e5) why = 'Start at least an hour from now';
  else if (!d.venueId) why = 'Pick a venue';
  else if (!d.meet.trim()) why = 'Add a meeting point';
  else if (!d.title.trim()) why = 'Give it a title';
  else if (scan.hits.length) why = 'Fix the text to post';
  else if (sizeBlocked) why = 'Verify ID to post a plan this big';
  else if (!d.editingId && !d.dupOk && draftDuplicates(d).length) why = 'Check the plan already on';
  else if (d.editingId && size < findPlan(d.editingId).members.length) why = `${findPlan(d.editingId).members.length} are already going`;
  return { ok: !why, why, scan, size, sizeBlocked };
}

const draftDuplicates = (d) => (d.act && d.day != null && d.start != null && d.venueId ? duplicatePlans(draftPlan(d), allEvents(), NOW) : []);

function duplicatesHTML(d) {
  const dups = draftDuplicates(d);
  if (!dups.length) return '';
  const items = dups.map((g) => scoreEvent(ME, g, ctxNow(), NOW));
  return `<div class="notice ${d.dupOk ? 'info' : 'warn'}"><b>${dups.length === 1 ? 'Something like this is already on' : `${dups.length} like this are already on`}</b>
    <span>Same activity, close by, around the same time. Joining fills it up, and a full game beats two half games.</span></div>
    <div class="carousel minis">${items.map((x) => miniCard(x)).join('')}</div>
    ${d.dupOk ? '<p class="small muted" style="margin:0">Posting yours as well.</p>' : '<button type="button" class="btn block ghost" data-act="d-dup-ok">Post mine anyway</button>'}`;
}

// What the plan will look like in Explore, from the draft.
function draftPreviewHTML(d) {
  if (!d.act || d.day == null || d.start == null || !d.venueId) return '';
  const g = { ...draftPlan(d), title: d.title || 'Untitled', venue: VENUE[d.venueId].name, interested: [], approve: d.approve, note: d.note };
  const x = { plan: g, slot: g.slots[0], reasons: [{ ok: true, text: `${cap(d.skill)} level` }, ...(d.repeat ? [{ ok: true, text: `Every ${cap(DOW[new Date(d.day).getDay()])}` }] : [])], clash: [] };
  return `<section class="field"><h3 class="h3">Preview</h3><div class="preview-card" inert>${eventCard(x, { short: true })}</div></section>`;
}

function venueCardHTML(v) {
  const l = mapsLinks(v), dist = km(v, PLACE[ME.suburb]);
  return `<div class="venue-card"><span class="venue-pin">${ICON_PIN}</span><span class="grow"><b>${esc(v.name)}</b><small class="muted">${esc(v.address)} · ${dist < 0.8 ? `in ${esc(v.suburb)}` : `${dist.toFixed(1)} km away`}${v.alcohol ? ' · licensed' : ''}</small></span>
    <span class="venue-links"><a class="link-btn" href="${l.apple}" target="_blank" rel="noopener">Apple Maps</a><a class="link-btn" href="${l.google}" target="_blank" rel="noopener">Google Maps</a></span></div>`;
}

function noteWarnHTML(scan) {
  if (!scan.hits.length) return '';
  const money = scan.hits.includes('payment');
  return `<div class="notice bad"><b>${money ? 'No payments on Keen' : 'No contact details in plans'}</b>${money ? 'Plans are free to join. Take out anything about paying, deposits or transfers.' : 'Phone numbers, emails, links and other apps unlock after people have met once. Take them out to post.'}</div>`;
}

function publishBtnHTML() {
  const c = draftCheck(S.draft);
  return `<button type="button" class="btn block" id="publishBtn" data-act="publish" ${c.ok ? '' : 'disabled'}>${c.ok ? (S.draft.editingId ? 'Save changes' : 'Post plan') : c.why}</button>`;
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
    const at = VENUE[d.preferVenue];
    // From a venue on the map: what that venue suits comes first
    if (at) groups[`At ${at.name}`] = at.acts.map((id) => ACT[id]);
    ACTIVITIES.filter((a) => a.cat !== 'service' && !(at && at.acts.includes(a.id))).forEach((a) => (groups[at ? `Somewhere else: ${a.group.toLowerCase()}` : a.group] ||= []).push(a));
    return bar('Create a plan') + `<div class="pad">
      <div><p class="eyebrow">New plan</p><h1 class="h1">What are you organising?</h1></div>
      ${Object.entries(groups).map(([gname, acts]) => `<p class="small muted" style="margin:0">${gname}</p><div class="tile-grid">${acts.map((a) => `<button type="button" class="tile" data-act="d-act" data-v="${a.id}">${actArt(a.id)}<span class="tile-label">${esc(a.label)}</span></button>`).join('')}</div>`).join('')}
      <p class="small muted" style="margin:0">Home help and paid services aren't in the MVP.</p>
    </div>`;
  }
  const act = ACT[d.act];
  const c = draftCheck(d);
  const reach = reachForEvent(draftPlan(d), { now: NOW, blocked: S.hidden });
  const v = VENUE[d.venueId];
  const wide = d.window[0] === 7 && d.window[1] === 21;
  let times = START_TIMES.filter((h) => wide || (h >= d.window[0] && h <= d.window[1] - 0.5));
  if (d.start != null && !times.includes(d.start)) times = [...times, d.start].sort((a, b) => a - b);
  if (!times.length) times = START_TIMES;
  const stepper = (k, label) => `<div class="stepper"><span>${label}</span><span class="ctl"><button type="button" class="icon-btn" data-act="d-party" data-v="${k}:-1" aria-label="Fewer">−</button><b>${d[k]}</b><button type="button" class="icon-btn" data-act="d-party" data-v="${k}:1" aria-label="More">+</button></span></div>`;
  const editing = d.editingId ? findPlan(d.editingId) : null;
  const othersIn = editing ? editing.members.filter((m) => m !== 'me' && !FRIENDS.some((f) => f.id === m)).length : 0;
  return bar(editing ? 'Edit plan' : 'Create a plan') + `<div class="pad">
    <div><div class="row"><p class="eyebrow grow">${esc(act.label)} · ${editing ? 'editing' : 'new plan'}</p>${othersIn ? '' : '<button type="button" class="link-btn" data-act="d-act" data-v="">Change</button>'}</div>
      <input id="draftTitle" class="title-input" value="${esc(d.title)}" maxlength="60" aria-label="Plan title"></div>
    <section class="field"><h3 class="h3">Day</h3><div class="chips">${d.days.map((x) => `<button type="button" class="chip" data-act="d-day" data-v="${x}" aria-pressed="${d.day === x}">${esc(fmtDay(new Date(x), NOW))}</button>`).join('')}</div></section>
    <section class="field"><h3 class="h3">Starts</h3><div class="chips">${times.map((h) => `<button type="button" class="chip num" data-act="d-start" data-v="${h}" aria-pressed="${d.start === h}" ${d.day != null && !editing && +at(new Date(d.day), h) < +NOW + 36e5 ? 'disabled' : ''}>${fmtHourLabel(h)}</button>`).join('')}</div>
      <p class="eyebrow">For</p><div class="chips">${[1, 1.5, 2, 3].map((h) => `<button type="button" class="chip" data-act="d-dur" data-v="${h}" aria-pressed="${d.dur === h}">${h === 1 ? '1 hour' : `${h} hours`}</button>`).join('')}</div></section>
    <section class="field"><h3 class="h3">Where</h3><p class="small muted" style="margin:0">Public places only: courts, ovals, beaches, cafés, libraries.</p>
      <div class="chips">${d.venues.map((id) => `<button type="button" class="chip" data-act="d-venue" data-v="${id}" aria-pressed="${d.venueId === id}">${esc(VENUE[id].name.replace(/\s*\(.*\)$/, ''))} <span class="muted num">${km(VENUE[id], PLACE[ME.suburb]).toFixed(1)} km</span>${VENUE[id].alcohol ? ' · licensed' : ''}</button>`).join('') || '<span class="small muted">No listed venues for this yet.</span>'}</div>
      ${v ? venueCardHTML(v) : ''}</section>
    ${editing ? '' : duplicatesHTML(d)}
    ${v ? `<section class="field"><h3 class="h3">Directions</h3>
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
    ${d.day != null ? `<label class="toggle"><input type="checkbox" data-act="d-repeat" ${d.repeat ? 'checked' : ''}>Repeat every ${cap(DOW[new Date(d.day).getDay()])}</label>` : ''}
    <section class="field"><h3 class="h3">Who can find it</h3><span class="seg"><button type="button" data-act="d-vis" data-v="public" aria-pressed="${d.visibility === 'public'}">Anyone nearby</button><button type="button" data-act="d-vis" data-v="invite" aria-pressed="${d.visibility === 'invite'}">Only people I invite</button></span></section>
    ${editing ? `<p class="small muted" style="margin:0">Everyone going or interested gets a message in the thread listing what changed.</p>` : `<div class="card"><p class="eyebrow">When you post</p><div class="ledger">
      <div><span>People who asked for this, told now</span><b class="num">${reach.asked.length}</b></div>
      <div><span>Into ${esc(act.label.toLowerCase())} nearby and free then, within their weekly cap</span><b class="num">${reach.likely.length}</b></div>
      ${reach.heldTotal - reach.held.trust ? `<div><span class="muted">Held back by their own settings (distance, avoid list, level, busy, weekly cap)</span><b class="num muted">${reach.heldTotal - reach.held.trust}</b></div>` : ''}
      ${reach.held.trust ? `<div><span class="muted">Not told because of recent feedback about you (<button type="button" class="link-btn" data-act="tab" data-v="me">why</button>)</span><b class="num muted">${reach.held.trust}</b></div>` : ''}
      <div><span>Shown in Explore and search within</span><b class="num">${d.visibility === 'invite' ? '–' : `${ME.radius || 10} km`}</b></div>
    </div></div>`}
    ${c.sizeBlocked ? '<div class="notice warn"><b>Big plans need trust</b>Plans over 6 people need ID or the Regular level (200+ Goodwill). Verify your ID on the Me tab.</div>' : c.size > 6 ? `<p class="small muted" style="margin:0">Plans over 6 people need ID or the Regular level (200+ Goodwill). You have ${fmtPts(S.points)}.</p>` : ''}
    ${draftPreviewHTML(d)}
    <div id="publishWrap">${publishBtnHTML()}</div>
  </div>`;
};

// "Run it again": a copy of one of your plans for the same weekday next week. Posted as a new plan.
function startClone(id) {
  const g = findPlan(id);
  startEdit(id);
  const d = S.draft;
  const slot = slotOf(g, NOW);
  let next = +startOfDay(new Date(+slot.start + 7 * 864e5));
  while (next <= +startOfDay(NOW)) next += 7 * 864e5;
  Object.assign(d, { editingId: null, clonedFrom: id, day: next, days: [...new Set([next, ...blankDraft().days])].sort((a, b) => a - b), have: 1, seek: g.size - 1 });
  render();
  toast('A copy for next week. Check the details, then post.');
}

function saveEdit(d) {
  const g = findPlan(d.editingId);
  const v = VENUE[d.venueId];
  const day = new Date(d.day);
  const before = { when: fmtSlot(slotOf(g, NOW), NOW), venue: g.venue, meet: g.meet, size: g.size, skill: g.skill, title: g.title };
  Object.assign(g, {
    title: d.title.trim(), note: d.note.trim(), bring: d.bring.trim(), meet: d.meet.trim(), directions: d.directions.trim(),
    venueId: v.id, venue: v.name, place: v.suburb, alcohol: !!v.alcohol, slots: [{ start: at(day, d.start), end: at(day, d.start + d.dur) }],
    size: d.have + d.seek, skill: d.skill, approve: d.approve, visibility: d.visibility, act: d.act,
  });
  delete g.when;
  const changes = [];
  if (before.title !== g.title) changes.push(`the title to "${g.title}"`);
  if (before.when !== fmtSlot(slotOf(g, NOW), NOW)) changes.push(`the time to ${fmtSlot(slotOf(g, NOW), NOW)}`);
  if (before.venue !== g.venue) changes.push(`the venue to ${g.venue}`);
  if (before.meet !== g.meet) changes.push(`the meeting point to "${g.meet}"`);
  if (before.size !== g.size) changes.push(`the spots to ${g.size}`);
  if (before.skill !== g.skill) changes.push(`the level to ${cap(g.skill)}`);
  if (changes.length) postSys(g.id, `${ME.name} changed ${changes.join(', ')}`);
  S.draft = null;
  S.stack.pop();
  render();
  toast(changes.length ? 'Saved. Everyone in the plan has been told what changed.' : 'Saved.');
}

// ---------- every field on a plan ----------

// The fields every plan has. `by`: organiser (set when creating or editing) or keen (worked out).
const EVENT_FIELDS = [
  { key: 'title', field: 'title', label: 'Title', by: 'organiser', required: true, rule: 'Up to 60 characters.', value: (g) => esc(g.title) },
  { key: 'act', field: 'activity_id', label: 'Activity', by: 'organiser', required: true, rule: 'From the tag list. Locked once someone else has joined.', value: (g) => esc(ACT[g.act].label) },
  { key: 'note', field: 'description', label: 'Details', by: 'organiser', rule: "Up to 200 characters. Screened: no contact details or payment talk. Don't repeat live numbers like spots left; the app shows those.", value: (g) => esc(g.note || '–') },
  { key: 'skill', field: 'level', label: 'Level', by: 'organiser', required: true, rule: 'Beginner, Casual, Intermediate or Competitive.', value: (g) => levelLabel(g.skill) },
  { key: 'venueId', field: 'venue_id', label: 'Venue', by: 'organiser', required: true, rule: 'A public venue from the list. Never a home.', value: (g) => `${esc(g.venue)}<br><span class="small muted">${esc((VENUE[g.venueId] || {}).address || '')}</span>` },
  { key: 'meet', field: 'meeting_point', label: 'Meeting point', by: 'organiser', required: true, rule: 'Up to 80 characters. Prefilled from the venue. Only people in the thread see it.', value: (g) => esc(g.meet) },
  { key: 'directions', field: 'directions', label: 'Getting there', by: 'organiser', rule: 'Up to 300 characters. Prefilled with transport and parking from the venue.', value: (g) => esc(g.directions || '–') },
  { key: 'bring', field: 'bring', label: 'What to bring', by: 'organiser', rule: 'Up to 80 characters.', value: (g) => esc(g.bring || '–') },
  { key: 'starts', field: 'starts_at / ends_at', label: 'When', by: 'organiser', required: true, rule: 'Starts at least 1 hour from now and within 60 days. Lasts 1, 1.5, 2 or 3 hours.', value: (g) => esc(fmtSlot(slotOf(g, NOW), NOW)) },
  { key: 'repeat', field: 'repeat', label: 'Repeats', by: 'organiser', rule: "Weekly or not. Each week is its own plan, posted 7 days ahead with its own thread; the people from last week get first refusal.", value: (g) => (g.repeat ? `Every ${cap(DOW[slotOf(g, NOW).start.getDay()])}` : 'No') },
  { key: 'size', field: 'capacity', label: 'Spots', by: 'organiser', required: true, rule: '2 to 30, including the organiser and anyone they bring. Can\'t go below the number already going. Over 6 needs ID or the Regular level.', value: (g) => String(g.size) },
  { key: 'approve', field: 'join_mode', label: 'Joining', by: 'organiser', required: true, rule: 'approve (organiser confirms, the default) or open (anyone joins straight away).', value: (g) => (g.approve ? 'Organiser confirms' : 'Open') },
  { key: 'visibility', field: 'visibility', label: 'Who can find it', by: 'organiser', required: true, rule: 'public (Explore, search and suggestions nearby) or invite (only people invited).', value: (g) => (g.visibility === 'invite' ? 'Only people invited' : 'Anyone nearby') },
  { key: 'status', field: 'status', label: 'Status', by: 'keen', rule: 'Open, Full (no spots), Happening now (from 30 minutes before), Finished, or Cancelled by the organiser.', value: (g) => planStatusLabel(g) },
  { key: 'going', field: 'going / interested / waitlist', label: 'People', by: 'keen', rule: 'Counted from memberships.', value: (g) => `${g.members.length} going · ${(g.interested || []).filter((m) => !g.members.includes(m)).length} interested · ${Math.max(0, g.size - g.members.length)} spots left` },
  { key: 'traits', field: 'traits', label: 'Traits', by: 'keen', rule: 'From the activity, venue and time. Matched against people\'s private avoid lists.', value: (g) => planTraits(g, NOW).map((t) => (AVOIDS.find((a) => a.id === t) || {}).label).join(', ') || 'None' },
  { key: 'bucket', field: 'time_bucket', label: 'Time bucket', by: 'keen', rule: 'Weekday or weekend, morning or afternoon/evening. Matched against people\'s free times.', value: (g) => (AVAILABILITY.find((a) => a.id === bucketOf(slotOf(g, NOW).start)) || {}).label },
  { key: 'organiser', field: 'organiser_id', label: 'Organiser', by: 'keen', rule: 'Whoever created it.', value: (g) => (g.org === 'me' ? 'You' : esc(PERSON[g.org].name)) },
];

function planStatusLabel(g) {
  if (g.status === 'cancelled') return 'Cancelled';
  const phase = g.past ? 'done' : eventPhase(g, NOW);
  if (phase === 'done') return 'Finished';
  if (phase === 'live') return 'Happening now';
  return g.members.length >= g.size ? 'Full' : 'Open';
}

VIEWS.planData = ({ v: id }) => {
  const g = findPlan(id);
  const host = g.org === 'me' && !g.past && g.status !== 'cancelled';
  const group = (by, title, sub) => `<section class="pf-group"><div><h3 class="h3">${title}</h3><p class="small muted" style="margin:2px 0 0">${sub}</p></div>
    ${EVENT_FIELDS.filter((f) => f.by === by).map((f) => `<div class="pf-field"><div class="row"><b class="grow">${esc(f.label)}</b>${f.required ? '<span class="req">required</span>' : ''}<code class="fkey">${f.field}</code></div>
      <div class="calc">${f.value(g)}</div><p class="small muted" style="margin:0">${esc(f.rule)}</p></div>`).join('')}</section>`;
  return bar('Plan data') + `<div class="pad">
    <p class="small muted" style="margin:0">Every field on "${esc(g.title)}", with its value and what's allowed.</p>
    ${host ? `<button type="button" class="btn block" data-act="edit-plan" data-v="${id}">Edit plan</button>` : ''}
    ${group('organiser', 'Set by the organiser', 'Chosen when the plan is created, and editable by them until it starts.')}
    ${group('keen', 'Worked out by Keen', "Calculated from people, time and place. Nobody types these in.")}
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
  'edit-plan': (v) => startEdit(v),
  'plan-data': (v) => go('planData', v),
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
    // Started from a venue on the map: keep that venue if it suits the activity
    if (d.preferVenue && VENUE[d.preferVenue].acts.includes(v)) { d.venues = [d.preferVenue, ...d.venues.filter((x) => x !== d.preferVenue)]; pickVenue(d.preferVenue); }
    else if (d.venues.length === 1) pickVenue(d.venues[0]);
    autoTitle();
    render();
  },
  'd-day': (v) => { S.draft.day = +v; S.draft.dupOk = false; if (S.draft.start != null && +at(new Date(+v), S.draft.start) < +NOW + 36e5) S.draft.start = null; autoTitle(); render(true); },
  'd-start': (v) => { S.draft.start = +v; S.draft.dupOk = false; render(true); },
  'd-dur': (v) => { S.draft.dur = +v; render(true); },
  'd-venue': (v) => { S.draft.dupOk = false; pickVenue(v); render(true); },
  'd-skill': (v) => { S.draft.skill = v; render(true); },
  'd-party': (v) => {
    const [k, n] = v.split(':');
    S.draft[k] = Math.min(k === 'have' ? 4 : 20, Math.max(1, S.draft[k] + +n));
    render(true);
  },
  'd-approve': (v, el) => { S.draft.approve = el.checked; render(true); },
  'd-repeat': (v, el) => { S.draft.repeat = el.checked; render(true); },
  'd-dup-ok': () => { S.draft.dupOk = true; render(true); },
  'd-vis': (v) => { S.draft.visibility = v; render(true); },
  publish: () => {
    const d = S.draft;
    if (!draftCheck(d).ok) return;
    if (d.editingId) { saveEdit(d); return; }
    const day = new Date(d.day);
    const v = VENUE[d.venueId];
    const reach = reachForEvent(draftPlan(d), { now: NOW, blocked: S.hidden });
    const id = 'mine' + (S.myPlans.length + 1);
    const plan = {
      id, mine: true, posted: true, org: 'me', act: d.act, title: d.title.trim(), venueId: v.id, venue: v.name, place: v.suburb, alcohol: !!v.alcohol,
      meet: d.meet.trim(), directions: d.directions.trim(), bring: d.bring.trim(), note: d.note.trim(),
      slots: [{ start: at(day, d.start), end: at(day, d.start + d.dur) }], members: ['me', ...FRIENDS.slice(0, d.have - 1).map((f) => f.id)], interested: [],
      size: d.have + d.seek, skill: d.skill, approve: d.approve, status: 'open', visibility: d.visibility, repeat: d.repeat ? 'weekly' : null,
      sent: reach.asked.length + reach.likely.length, seen: 0, keen: 0, passed: 0, requests: [], clonedFrom: d.clonedFrom || null,
    };
    S.myPlans.unshift(plan);
    S.chat[id] = [{ sys: true, text: `Plan posted. People who are interested or going can chat here.${plan.members.length > 1 ? ` ${plan.members.slice(1).map((m) => PERSON[m].name).join(' and ')} ${plan.members.length > 2 ? 'are' : 'is'} in with you.` : ''}`, at: new Date() }];
    markRead(id);
    S.text = ''; S.over = {}; S.draft = null;
    S.tab = 'activity';
    S.stack = [{ name: 'plan', v: id }];
    render();
    toast(`Posted. ${plural(reach.asked.length + reach.likely.length, 'person')} told; it's in Explore within ${ME.radius || 10} km.`);
    simulateRequests(plan, [...reach.asked, ...reach.likely].map((p) => p.id));
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
