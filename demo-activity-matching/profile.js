// Profiles: the field definitions every profile follows, the profile card (the same for you and for
// others), the Me tab, other people's profiles, and the Profile data screen, where every field,
// its value and its allowed values can be seen and edited.
// Loaded after app.js and event.js; adds its screens and actions to the shared VIEWS and ACTIONS.

const levelLabel = (id) => (SKILL_LEVELS.find((l) => l.id === id) || {}).label || '';
const labelIn = (list, id) => (list.find((x) => String(x.id) === String(id)) || {}).label || String(id);

// Every field on a profile. `group`: public (on your profile), private (you and Keen only),
// calculated (worked out by Keen). This list drives the Profile data screen and matches MODEL.md §1.
const PROFILE_FIELDS = [
  { key: 'name', field: 'first_name', label: 'First name', group: 'public', type: 'text', max: 30, required: true, source: 'Onboarding chat', rule: '1–30 letters. First name only, never a surname.' },
  { key: 'photo', field: 'photo', label: 'Photo', group: 'public', type: 'photo', source: 'You', rule: 'Optional but encouraged: a clear photo of your face, checked against a selfie. Without one, your initials show instead and organisers see "No photo yet".' },
  { key: 'suburb', field: 'home_suburb', label: 'Home suburb', group: 'public', type: 'one', required: true, source: 'Onboarding chat', options: () => PLACES.map((p) => ({ id: p.name, label: p.name })), rule: 'From the suburb list. Others see the suburb and a rounded distance, never an address.' },
  { key: 'bio', field: 'bio', label: 'About you', group: 'public', type: 'text', max: 160, source: 'You', rule: 'Up to 160 characters. Screened like chat: no contact details or payment talk.' },
  { key: 'interests', field: 'interests', label: 'Activities and levels', group: 'public', type: 'interests', required: true, source: 'Onboarding chat', rule: '1 to 10 activities from the tag list, each with a level.' },

  { key: 'goals', field: 'goals', label: 'What you want from Keen', group: 'private', type: 'many', max: 3, source: 'Onboarding chat', options: () => GOALS, rule: 'Up to 3. Used to tune recommendations. Never shown.' },
  { key: 'age', field: 'birth_year', label: 'Age', group: 'private', type: 'number', required: true, source: 'Onboarding chat', rule: '18 or over. Stored as a birth year. Used for the 18+ check and optional age-range matching. Never shown.' },
  { key: 'phone', field: 'phone', label: 'Mobile number', group: 'private', type: 'readonly', required: true, source: 'Sign-up', rule: 'Australian mobile, verified by SMS. One account per number. Never shown.' },
  { key: 'radius', field: 'travel_radius_km', label: "How far you'll travel", group: 'private', type: 'one', source: 'Onboarding chat', options: () => [2, 5, 10, 20, 50].map((n) => ({ id: n, label: `${n} km` })), rule: 'Plans and people further than this are left out. Default 10 km.' },
  { key: 'avoid', field: 'avoid', label: 'Things to avoid', group: 'private', type: 'many', source: 'Onboarding chat', options: () => AVOIDS, rule: 'Plans with any of these are held back from suggestions, with a count. Never shown.' },
  { key: 'free', field: 'availability', label: 'Usually free', group: 'private', type: 'many', source: 'Onboarding chat', options: () => AVAILABILITY, rule: 'Used to rank plans by time. Never shown.' },
  { key: 'askCap', field: 'asks_per_week', label: 'Asks from Keen per week', group: 'private', type: 'one', source: 'You', options: () => [0, 1, 3, 5, 7].map((n) => ({ id: n, label: String(n) })), rule: 'How many "might be keen" asks you can receive in a week. Default 3.' },
  { key: 'joined', field: 'member_since', label: 'Member since', group: 'calculated', source: 'Sign-up date', rule: 'Shown as month and year.' },
  { key: 'verification', field: 'verification', label: 'Verification', group: 'calculated', source: 'Checks', rule: 'Phone is required. Photo and ID checks are optional; an ID check adds 100 Goodwill.' },
  { key: 'points', field: 'goodwill', label: 'Goodwill', group: 'calculated', source: 'Confirmed activity', rule: '+50 attended, +20 feedback given, +10 per good review (max 3 a plan), +100 hosted with 3 or more people, +100 ID check, −150 no-show, −50 for 3 late cancels in 30 days. Never below 0.' },
  { key: 'level', field: 'goodwill_level', label: 'Goodwill level', group: 'calculated', source: 'Goodwill', rule: 'New 0–199 · Regular 200–999 · Trusted 1,000–2,999 · Local legend 3,000+.' },
  { key: 'events', field: 'events_attended', label: 'Plans attended', group: 'calculated', source: 'Confirmed attendance', rule: 'Counted once someone who was there confirms it.' },
  { key: 'hosted', field: 'events_hosted', label: 'Plans hosted', group: 'calculated', source: 'Confirmed attendance', rule: 'Plans you organised that went ahead.' },
  { key: 'hostRating', field: 'hosting_rating', label: 'Hosting rating', group: 'calculated', source: 'Plan ratings', rule: 'Average stars for plans you hosted, shown after 3. People themselves are never rated with stars.' },
  { key: 'noShows', field: 'no_shows', label: 'No-shows', group: 'calculated', source: 'Reports', rule: 'Only counted when 2 people who were there report it.' },
  { key: 'tags', field: 'positive_tags', label: 'What people say', group: 'calculated', source: 'Feedback', rule: 'Counts of positive tags. Negative tags go to review only.' },
  { key: 'activityCounts', field: 'activity_counts', label: 'Plans per activity', group: 'calculated', source: 'Confirmed attendance', rule: "What others see of your history: counts only, never where or when." },
];

// ---------- the signed-in user's derived numbers ----------

const isConfirmed = (g) => g.confirmed !== false;

function myStats() {
  const done = historyItems().filter(isConfirmed);
  const activityCounts = {};
  done.forEach((g) => { activityCounts[g.act] = (activityCounts[g.act] || 0) + 1; });
  const hostedPlans = done.filter((g) => g.org === 'me');
  const ratings = hostedPlans.map((g) => g.rated).filter(Boolean);
  return {
    events: done.length,
    hosted: hostedPlans.length,
    hostRating: hostedPlans.length >= 3 && ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    activityCounts,
    reviews: FEEDBACK_ABOUT_ME.reviews,
    tags: FEEDBACK_ABOUT_ME.tags,
  };
}

// One shape for everyone, so the same card renders you and other people.
function profileOf(id) {
  if (id !== 'me') return PERSON[id];
  return { ...ME, ...myStats(), points: S.points, idVerified: S.idVerified || ME.idVerified };
}

// Goodwill history for the sample user, built from their confirmed plans with the published rules.
function seedLedger() {
  const R = GOODWILL_RULES;
  const out = [];
  for (const g of [...HISTORY].filter(isConfirmed).reverse()) {
    out.push({ text: `Attended ${g.title}`, pts: R.attended });
    if (g.org === 'me' && g.members.length >= 3) out.push({ text: `Hosted ${g.title}, ${g.members.length} came`, pts: R.hosted });
    out.push({ text: `Left feedback: ${g.title}`, pts: R.feedbackGiven });
    out.push({ text: `2 good reviews: ${g.title}`, pts: 2 * R.goodReview });
  }
  return out.reverse();
}

// ---------- the profile card ----------

function tagBarsHTML(tags, reviews) {
  const entries = Object.entries(tags).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return '<p class="small muted" style="margin:0">No reviews yet.</p>';
  const max = Math.max(...entries.map(([, n]) => n));
  return `<div class="funnel tags">${entries.map(([t, n]) => `<div><span>${esc(t)}</span><span class="track"><span class="fill" style="display:block;width:${(n / max) * 100}%"></span></span><span class="num">${n}</span></div>`).join('')}</div>
    <p class="small muted" style="margin:0">From ${plural(reviews, 'positive review')}. Negative feedback is never shown.</p>`;
}

// The top of a profile: a big photo (or initials on a gradient) with the name over it.
function posterHTML(p, opts = {}) {
  const self = p.id === 'me';
  const lvl = levelFor(p.points);
  const d = self ? 0 : km(PLACE[p.suburb], PLACE[ME.suburb]);
  const together = self ? 0 : ctxNow().played[p.id] || 0;
  return `<div class="poster${opts.card ? ' card-like' : ''}" style="--h:${p.hue}">
    <span class="poster-i" aria-hidden="true">${esc(p.name[0])}</span>
    ${p.photo ? `<img src="img/people/${p.id}.jpg" alt="${esc(p.name)}" data-fallback>` : ''}
    <div class="poster-shade"></div>
    <div class="poster-text">
      <h1>${esc(p.name)}</h1>
      <p>${esc(p.suburb)}${d >= 1 ? ` · about ${Math.round(d)} km away` : ''} · member since ${esc(p.joined)}</p>
      <div class="row" style="flex-wrap:wrap">${gw(p.points)}<span class="small"><b>${lvl.name}</b></span>${together ? `<span class="status ok">Played with you ${together}×</span>` : ''}</div>
    </div>
  </div>`;
}

// Everything under the poster. The same for your own profile and anyone else's.
function profileBodyHTML(p) {
  return `<div class="badges" style="justify-content:flex-start"><span class="badge">Phone verified</span>${p.photo ? '<span class="badge">Photo verified</span>' : '<span class="badge off">No photo yet</span>'}${p.idVerified ? '<span class="badge">ID verified</span>' : '<span class="badge off">ID not verified</span>'}</div>
    ${p.bio ? `<p class="quote" style="margin:0;font-size:16px">${esc(p.bio)}</p>` : ''}
    <div class="kpis"><div><b>${p.events}</b><span>plans attended</span></div><div><b>${p.hosted}</b><span>hosted</span></div><div><b>${p.noShows}</b><span>no-shows</span></div></div>
    ${p.hostRating ? `<p class="small" style="margin:0;text-align:center">Hosting rating <b>★ ${p.hostRating}</b> across ${plural(p.hosted, 'hosted plan')}</p>` : ''}
    <div class="card"><div class="h3">Activities</div>
      <div class="act-list">${p.interests.map((a) => `<div class="act-row"><div class="thumb" style="width:40px;height:40px;border-radius:11px">${actArt(a)}</div><span class="grow"><b>${esc(ACT[a].label)}</b><br><span class="small muted num">${plural((p.activityCounts || {})[a] || 0, 'plan')}</span></span><span class="lvl lvl-${p.levels[a]}">${levelLabel(p.levels[a])}</span></div>`).join('')}</div>
      ${Object.keys(p.activityCounts || {}).filter((a) => !p.interests.includes(a) && p.activityCounts[a] > 0).map((a) => `<p class="small muted" style="margin:0">Also went to: ${esc(ACT[a].label)} · ${plural(p.activityCounts[a], 'plan')}</p>`).join('')}
    </div>
    <div class="card"><div class="h3">What people say</div>${tagBarsHTML(p.tags || {}, p.reviews || 0)}</div>`;
}

// ---------- Me ----------

VIEWS.me = () => {
  const me = profileOf('me');
  const lvl = levelFor(S.points), nx = nextLevel(S.points);
  const pct = nx ? ((S.points - lvl.min) / (nx.min - lvl.min)) * 100 : 100;
  const R = GOODWILL_RULES;
  return bar('Me', false, `<button type="button" class="btn sm ghost" data-act="profile-data">Edit profile</button>`) + `<div class="pad">
    <p class="small muted" style="margin:0">Your profile, as others see it</p>
    ${posterHTML(me, { card: true })}
    ${profileBodyHTML(me)}
    <div class="card"><div class="row"><div class="h3 grow">Only you see this</div><span class="lock">private</span></div>
      <div class="meta small">
        <div><span class="k">Goals</span><span>${ME.goals.length ? ME.goals.map((g) => labelIn(GOALS, g)).join(', ') : 'Not given'}</span></div>
        <div><span class="k">Age</span><span>${ME.age != null ? ME.age : 'Not given'}</span></div>
        <div><span class="k">Avoid</span><span>${ME.avoid.length ? ME.avoid.map((a) => labelIn(AVOIDS, a)).join(', ') : 'Nothing'}</span></div>
        <div><span class="k">Free</span><span>${ME.free.length ? ME.free.map((f) => labelIn(AVAILABILITY, f)).join(', ') : 'Not given'}</span></div>
        <div><span class="k">Travel</span><span>Up to ${ME.radius} km from ${esc(ME.suburb)}</span></div>
      </div>
      <button type="button" class="link-btn" data-act="profile-data" style="justify-self:start">See and edit every field</button></div>
    <div class="gw-hero">
      <p class="eyebrow muted">Goodwill</p>
      <div class="row" style="align-items:baseline;justify-content:space-between"><span class="big">${fmtPts(S.points)}</span><b>${lvl.name}</b></div>
      <div class="gw-bar"><div style="width:${pct}%"></div></div>
      <span class="small muted">${nx ? `${fmtPts(nx.min - S.points)} to ${nx.name}` : 'Top level'}</span>
    </div>
    <div class="card"><div class="row"><div class="h3 grow">History</div><button type="button" class="link-btn" data-act="history">See all ${historyItems().length}</button></div>
      <div>${historyItems().slice(0, 3).map(historyRowHTML).join('')}</div></div>
    <div class="card"><div class="h3">Recent Goodwill</div><div class="ledger">${S.ledger.slice(0, 6).map((l) => `<div><span>${esc(l.text)}</span><span class="${l.pts > 0 ? 'plus' : 'minus'}">${l.pts > 0 ? '+' : ''}${l.pts}</span></div>`).join('')}
      <div><b>Total</b><b class="num">${fmtPts(S.points)}</b></div></div></div>
    <div class="card"><div class="h3">How Goodwill works</div><div class="ledger">
      <div><span>Turn up, confirmed by someone who was there</span><span class="plus">+${R.attended}</span></div>
      <div><span>Host a plan that goes ahead (3 or more people)</span><span class="plus">+${R.hosted}</span></div>
      <div><span>Leave feedback after a plan</span><span class="plus">+${R.feedbackGiven}</span></div>
      <div><span>Good review received (max 3 per plan)</span><span class="plus">+${R.goodReview}</span></div>
      <div><span>Verify your ID (once)</span><span class="plus">+${R.idVerified}</span></div>
      <div><span>No-show, reported by 2 or more people</span><span class="minus">−${-R.noShow}</span></div>
      <div><span>3 late cancels in 30 days</span><span class="minus">−${-R.lateCancels}</span></div>
    </div><p class="small muted" style="margin:0">Goodwill can't be bought, sent or spent. Points between the same small group of people are capped, so fake accounts can't farm each other.</p></div>
    <div class="card"><div class="h3">Trust</div>
      ${S.idVerified ? '<p class="small" style="margin:0">Your ID is verified.</p>' : `<button type="button" class="btn sm sea" data-act="verify" style="justify-self:start">Verify ID · +${R.idVerified}</button>`}
      <p class="small muted" style="margin:0">At the New level (under 200) you can join plans but send only 3 invites a day. Hosting plans for more than 6 people needs ID or the Regular level.</p></div>
    <button type="button" class="btn block ghost" data-act="ob-restart">Redo the getting-to-know-you chat</button>
  </div>`;
};

// ---------- other people ----------

VIEWS.person = ({ v: id }) => {
  const p = profileOf(id);
  const ask = OPEN_ASKS.find((a) => a.who === id);
  const fit = S.result && S.result.people.find((x) => x.person.id === id);
  const fromResults = S.stack.some((x) => x.name === 'results');
  const myUpcoming = S.myPlans.filter((g) => eventPhase(g, NOW) === 'upcoming' && !g.members.includes(id));
  const invited = S.invited.has(id);
  let cta = '';
  if (fromResults && S.intent) cta = `<button type="button" class="btn block ${invited ? 'done' : 'sea'}" data-act="invite" data-v="${id}" ${invited ? 'disabled' : ''}>${invited ? 'Invited to your ask' : 'Invite to your ask'}</button>`;
  else if (myUpcoming.length) cta = `<button type="button" class="btn block ${invited ? 'done' : 'sea'}" data-act="invite-plan" data-v="${id}" ${invited ? 'disabled' : ''}>${invited ? 'Invited' : 'Invite to your plan'}</button>`;
  return bar(esc(p.name), true, '', { over: true }) + posterHTML(p) + `<div class="pad sheet-up">
    ${profileBodyHTML(p)}
    ${ask ? `<div class="card"><p class="eyebrow">Their open ask</p><p class="quote">${esc(ask.text)}</p>${fit ? reasonsHTML(fit.fit.reasons) : ''}</div>` : ''}
    ${cta}
    <p class="small muted" style="margin:0;text-align:center">Their age, goals, avoid list, free times and phone number are never shown.</p>
    <button type="button" class="link-btn" data-act="report" data-v="${id}" style="justify-self:center;color:var(--flag)">Report or block ${esc(p.name)}</button>
  </div>`;
};

// ---------- Profile data: every field, its value and its allowed values ----------

const GROUP_TITLE = { public: ['Shown on your profile', 'Everyone signed in can see these.'], private: ['Only you and Keen', 'Used for matching and safety. Never shown to anyone.'], calculated: ['Worked out by Keen', "Calculated from what you do. You can't edit these."] };

function fieldValueHTML(f, me) {
  const val = ME[f.key];
  switch (f.type) {
    case 'text':
      return f.key === 'bio'
        ? `<textarea id="pf-bio" rows="2" maxlength="${f.max}">${esc(val || '')}</textarea><div class="small muted num" id="pf-bio-count">${(val || '').length}/${f.max}</div><div id="pf-bio-warn"></div>`
        : `<input id="pf-name" class="text-input" value="${esc(val || '')}" maxlength="${f.max}"><div id="pf-name-warn"></div>`;
    case 'number':
      return `<input id="pf-age" class="text-input" type="number" min="18" max="99" value="${val ?? ''}" style="max-width:120px"><div id="pf-age-warn"></div>`;
    case 'photo':
      return `<div class="row">${avatar(ME)}<span class="badge">Photo verified</span></div><p class="small muted" style="margin:0">The prototype shows initials in place of photos.</p>`;
    case 'readonly':
      return `<div class="row"><span class="num">${esc(val.replace(/^\+61(\d)\d{5}(\d{3})$/, '+61 $1•• ••• $2'))}</span><span class="badge">Verified</span></div>`;
    case 'one':
      return `<div class="chips">${f.options().map((o) => `<button type="button" class="chip" data-act="pf-one" data-v="${f.key}|${o.id}" aria-pressed="${String(val) === String(o.id)}">${esc(o.label)}</button>`).join('')}</div>`;
    case 'many':
      return `<div class="chips">${f.options().map((o) => `<button type="button" class="chip" data-act="pf-many" data-v="${f.key}|${o.id}" aria-pressed="${val.includes(o.id)}" ${o.desc ? `title="${esc(o.desc)}"` : ''}>${esc(o.label)}</button>`).join('')}</div>
        ${f.options()[0].desc ? `<p class="small muted" style="margin:0">${f.options().filter((o) => val.includes(o.id)).map((o) => `${esc(o.label)}: ${esc(o.desc)}`).join(' · ') || 'None selected.'}</p>` : ''}`;
    case 'interests': {
      const rest = ACTIVITIES.filter((a) => a.cat !== 'service' && !ME.interests.includes(a.id));
      return `<div class="act-list">${ME.interests.map((a) => `<div class="act-edit"><div class="row"><b class="grow">${esc(ACT[a].label)}</b><button type="button" class="link-btn" data-act="pf-remove-act" data-v="${a}" aria-label="Remove ${esc(ACT[a].label)}">Remove</button></div>
          <span class="seg">${SKILL_LEVELS.map((l) => `<button type="button" data-act="pf-level" data-v="${a}|${l.id}" aria-pressed="${ME.levels[a] === l.id}" title="${esc(l.desc)}">${l.label}</button>`).join('')}</span></div>`).join('')}</div>
        <p class="small muted" style="margin:0">${SKILL_LEVELS.map((l) => `<b>${l.label}</b>: ${esc(l.desc.toLowerCase())}`).join(' · ')}</p>
        ${ME.interests.length < 10 ? `<details class="add-act"><summary class="link-btn">Add an activity</summary><div class="chips" style="margin-top:8px">${rest.map((a) => `<button type="button" class="chip" data-act="pf-add-act" data-v="${a.id}">${esc(a.label)}</button>`).join('')}</div></details>` : ''}`;
    }
    default: {
      const v = calcValue(f.key, me);
      return `<div class="calc">${v}</div>`;
    }
  }
}

function calcValue(key, me) {
  switch (key) {
    case 'joined': return esc(me.joined);
    case 'verification': return `<span class="badge">Phone</span> <span class="badge">Photo</span> ${me.idVerified ? '<span class="badge">ID</span>' : '<span class="badge off">ID not checked</span>'}`;
    case 'points': return `<b class="num">${fmtPts(me.points)}</b>`;
    case 'level': return `<b>${levelFor(me.points).name}</b>`;
    case 'events': return `<b class="num">${me.events}</b>`;
    case 'hosted': return `<b class="num">${me.hosted}</b>`;
    case 'hostRating': return me.hostRating ? `<b>★ ${me.hostRating}</b>` : `<span class="muted">Not shown yet (${me.hosted} of 3 hosted plans)</span>`;
    case 'noShows': return `<b class="num">${me.noShows}</b>`;
    case 'tags': return Object.entries(me.tags).map(([t, n]) => `${esc(t)} <b class="num">${n}</b>`).join(' · ');
    case 'activityCounts': return Object.entries(me.activityCounts).sort((a, b) => b[1] - a[1]).map(([a, n]) => `${esc(ACT[a].label)} <b class="num">${n}</b>`).join(' · ') || '<span class="muted">None yet</span>';
    default: return '';
  }
}

VIEWS.profileData = () => {
  const me = profileOf('me');
  const groups = ['public', 'private', 'calculated'];
  return bar('Profile data') + `<div class="pad">
    <p class="small muted" style="margin:0">Every field on a Keen profile, with your current value and what's allowed. Changes save as you make them.</p>
    ${groups.map((gname) => `<section class="pf-group"><div><h3 class="h3">${GROUP_TITLE[gname][0]}</h3><p class="small muted" style="margin:2px 0 0">${GROUP_TITLE[gname][1]}</p></div>
      ${PROFILE_FIELDS.filter((f) => f.group === gname).map((f) => `<div class="pf-field">
        <div class="row"><b class="grow">${esc(f.label)}</b>${f.required ? '<span class="req">required</span>' : ''}<code class="fkey">${f.field}</code></div>
        ${fieldValueHTML(f, me)}
        <p class="small muted" style="margin:0">${esc(f.rule)} <span class="src">Set by: ${esc(f.source)}</span></p>
      </div>`).join('')}
    </section>`).join('')}
  </div>`;
};

// Typing in the name, bio and age fields saves straight away, with validation shown inline.
function profileInput(el) {
  if (el.id === 'pf-name') {
    const v = el.value.trim();
    const ok = /^[A-Za-zÀ-ÿ'-]+( [A-Za-zÀ-ÿ'-]+)?$/.test(v) && v.length <= 30; // allows a double first name like "Mary Jane"
    $('#pf-name-warn').innerHTML = ok ? '' : '<p class="small" style="margin:4px 0 0;color:var(--flag)">Use your first name only: letters, spaces, hyphens or apostrophes.</p>';
    if (ok) ME.name = v;
  }
  if (el.id === 'pf-bio') {
    const scan = screenMessage(el.value);
    $('#pf-bio-count').textContent = `${el.value.length}/160`;
    $('#pf-bio-warn').innerHTML = scan.hits.length ? `<p class="small" style="margin:4px 0 0;color:var(--flag)">Take out the ${esc(scan.hits.join(', '))} to save. Contact details unlock after people meet.</p>` : '';
    if (!scan.hits.length) ME.bio = el.value.trim();
  }
  if (el.id === 'pf-age') {
    const n = Number(el.value);
    const ok = Number.isInteger(n) && n >= 18 && n <= 99;
    $('#pf-age-warn').innerHTML = ok ? '' : '<p class="small" style="margin:4px 0 0;color:var(--flag)">Keen is for people 18 and over.</p>';
    if (ok) ME.age = n;
  }
}

Object.assign(ACTIONS, {
  'profile-data': () => go('profileData'),
  'pf-one': (v) => { const [k, id] = v.split('|'); ME[k] = typeof ME[k] === 'number' ? Number(id) : id; CTX = null; render(true); },
  'pf-many': (v) => {
    const [k, id] = v.split('|');
    const f = PROFILE_FIELDS.find((x) => x.key === k);
    const list = ME[k];
    if (list.includes(id)) ME[k] = list.filter((x) => x !== id);
    else if (f.max && list.length >= f.max) { toast(`Pick up to ${f.max}. Remove one first.`); return; }
    else ME[k] = [...list, id];
    render(true);
  },
  'pf-level': (v) => { const [a, l] = v.split('|'); ME.levels[a] = l; render(true); },
  'pf-remove-act': (v) => {
    if (ME.interests.length <= 1) { toast('Keep at least one activity.'); return; }
    ME.interests = ME.interests.filter((a) => a !== v);
    delete ME.levels[v];
    render(true);
  },
  'pf-add-act': (v) => { ME.interests = [...ME.interests, v]; ME.levels[v] = 'casual'; render(true); toast(`Added ${ACT[v].label} as Casual. Change the level if that's not right.`); },
  'invite-plan': (v) => {
    const plans = S.myPlans.filter((g) => eventPhase(g, NOW) === 'upcoming');
    sheet(`<div class="h3">Invite ${esc(PERSON[v].name)} to</div><div style="display:grid;gap:6px">${plans.map((g) => `<button type="button" class="btn ghost block" data-act="invite-send" data-v="${v}|${g.id}">${esc(g.title)} · ${esc(fmtSlot(slotOf(g, NOW), NOW))}</button>`).join('')}</div><button type="button" class="btn block ghost" data-act="close-sheet">Cancel</button>`);
  },
  'invite-send': (v) => {
    const [pid, gid] = v.split('|');
    S.invited.add(pid);
    postSys(gid, `${ME.name} invited ${PERSON[pid].name}`);
    closeSheet();
    render(true);
    toast(`Invite sent. ${PERSON[pid].name} can say they're interested or join.`);
  },
});
