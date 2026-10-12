// Events: the event page, joining and leaving, directions, check-in and roll call,
// the message thread every event has, the Plans tab, and the user's history.
// Loaded after app.js; adds its screens and actions to the shared VIEWS and ACTIONS.

const STATUS_LABEL = { interested: 'Interested', requested: 'Requested', waitlist: 'Waitlist', going: 'Going', checked_in: 'Checked in', attended: 'Went', left: 'Left', hosting: 'Hosting' };
const IN_THREAD = ['interested', 'requested', 'waitlist', 'going', 'checked_in', 'attended', 'hosting'];

function allEvents() { return [...S.myPlans, ...PLANS, ...PAST_PLANS, ...HISTORY]; }
function findPlan(id) { return allEvents().find((g) => g.id === id); }
function myStatus(g) { return g.org === 'me' ? 'hosting' : S.mem[g.id] || null; }
const inThread = (g) => IN_THREAD.includes(myStatus(g));

let CTX = null;
function ctxNow() { return CTX || (CTX = socialContext([...HISTORY, ...PAST_PLANS, ...allEvents().filter((g) => !g.past && g.members.includes('me') && g.confirmed)], { rated: S.ratings, blocked: S.hidden })); }

const msgsOf = (id) => S.chat[id] || (S.chat[id] = []);
const unread = (id) => Math.max(0, msgsOf(id).length - (S.read[id] || 0));
function markRead(id) { S.read[id] = msgsOf(id).length; }

function relTime(d) {
  const m = Math.round((NOW_LIVE() - d) / 60e3);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
}
const NOW_LIVE = () => new Date();

function postSys(id, text) { msgsOf(id).push({ sys: true, text, at: new Date() }); }

// ---------- event page ----------

VIEWS.plan = ({ v: id }) => {
  const g = findPlan(id);
  const org = PERSON[g.org];
  const slot = slotOf(g, NOW);
  const phase = g.status === 'cancelled' ? 'cancelled' : g.past ? 'done' : eventPhase(g, NOW);
  const st = myStatus(g);
  const left = g.size - g.members.length;
  const pill = phase === 'cancelled' ? 'Cancelled' : phase === 'done' ? 'Finished' : phase === 'live' ? 'Happening now' : left <= 0 ? 'Full' : `${left} spot${left === 1 ? '' : 's'} left`;
  return bar(esc(g.title), true, '', { over: true }) + `
  <div class="hero-media">${actArt(g.act)}<div class="hero-shade"></div>
    <div class="hero-text">
      <div class="row" style="flex-wrap:wrap"><span class="pill-glass">${esc(ACT[g.act].label)}</span><span class="pill-glass${phase === 'live' ? ' hot' : ''}">${pill}</span>${st && st !== 'hosting' ? `<span class="pill-glass">${STATUS_LABEL[st]}</span>` : ''}</div>
      <h1>${esc(g.title)}</h1>
      <p>${esc(fmtSlot(slot, NOW))} · ${esc(g.venue)}</p>
    </div>
  </div>
  <div class="pad sheet-up">
    <div class="row small">${avatar(org, 's')}<span class="grow">${g.org === 'me' ? 'Organised by you' : `Organised by <b>${esc(org.name)}</b>`}</span>${g.org !== 'me' ? gw(org.points) : ''}</div>
    ${actionHTML(g, st, phase)}
    <div class="meta">
      <div><span class="k">When</span><span>${esc(fmtSlot(slot, NOW))}</span></div>
      <div><span class="k">Level</span><span>${cap(g.skill)}</span></div>
      <div><span class="k">Spots</span><span class="row">${spots(g.members.length, g.size)}<span class="small muted num">${phase === 'done' ? `${g.members.length} came` : left > 0 ? `${left} left` : 'full'}</span></span></div>
      ${g.bring ? `<div><span class="k">Bring</span><span>${esc(g.bring)}</span></div>` : ''}
      <div><span class="k">Joining</span><span>${g.approve ? `${g.org === 'me' ? 'You confirm' : `${esc(org.name)} confirms`} new people` : 'Open, join straight away'}</span></div>
    </div>
    ${g.note ? `<p class="quote">${esc(g.note)}</p>` : ''}
    ${directionsHTML(g)}
    ${!['done', 'cancelled'].includes(phase) && g.org !== 'me' ? whyHTML(g) : ''}
    ${threadCardHTML(g)}
    ${peopleHTML(g, phase)}
    <div class="notice info"><b>Safe by default</b>Public venue only. The meeting point shows once you're in. Chat stays in Keen, and phone numbers, links and payment talk are hidden until you've met once.</div>
    <div class="row" style="justify-content:center;gap:18px"><button type="button" class="link-btn" data-act="plan-data" data-v="${g.id}">All plan fields</button>${g.org !== 'me' ? `<button type="button" class="link-btn" data-act="report" data-v="${g.org}" style="color:var(--flag)">Report this plan</button>` : ''}</div>
  </div>`;
};

function actionHTML(g, st, phase) {
  const id = g.id, org = PERSON[g.org];
  const left = g.size - g.members.length;
  if (phase === 'cancelled') {
    return `<div class="notice bad"><b>Cancelled${g.org === 'me' ? ' by you' : ` by ${esc(org.name)}`}</b>${esc(g.cancelReason || 'The organiser cancelled this plan.')} Everyone going or interested was told.</div>
      ${g.org === 'me' ? `<button type="button" class="btn block ghost" data-act="again" data-v="${id}">Set it up again for another day</button>` : ''}`;
  }
  if (st === 'hosting') {
    if (g.past || phase === 'done') {
      return g.needsRollcall
        ? `<div class="card"><div class="h3">Take attendance</div><p class="small muted" style="margin:0">Mark who came. It's what earns everyone Goodwill, and it closes the plan.</p><button type="button" class="btn block" data-act="rollcall" data-v="${id}">Take attendance</button></div>`
        : `<div class="notice info"><b>Attendance taken</b>${plural(g.members.length, 'person')} came. Thanks for organising.</div><button type="button" class="btn block ghost" data-act="again" data-v="${id}">Run it again next week</button>`;
    }
    return `${requestsHTML(g)}${phase === 'live' ? `<button type="button" class="btn block" data-act="rollcall" data-v="${id}">Take attendance</button>` : `<div class="btn-pair"><button type="button" class="btn ghost" data-act="edit-plan" data-v="${id}">Edit plan</button><button type="button" class="btn ghost" data-act="cancel-plan" data-v="${id}">Cancel plan</button></div>`}
      ${reachHTML(g)}
      ${g.sent != null ? `<div class="card"><p class="eyebrow">Your plan so far</p>${funnelHTML(g)}<p class="small muted" style="margin:0">Sent to ${plural(g.sent, 'person')} who fit, and showing in Explore within ${ME.radius || 10} km. Everyone gets a reminder 2 hours before.</p></div>` : ''}`;
  }
  if (phase === 'done') {
    if (!['attended', 'going', 'checked_in'].includes(st)) return '';
    const pending = id === 'past1' && !S.feedbackDone;
    return `${pending ? `<button type="button" class="btn block" data-act="feedback" data-v="${id}">Rate this plan · +20</button>` : g.rated ? `<div class="notice info"><b>You rated it ${'★'.repeat(g.rated)}</b>Thanks. Your feedback shapes who you're matched with next.</div>` : ''}
      <button type="button" class="btn block ghost" data-act="again" data-v="${id}">${g.org === 'me' ? 'Run it again next week' : `Ask ${esc(org.name)} to run it again`}</button>`;
  }
  if (phase === 'live') {
    if (st === 'going') return `<div class="card live"><div class="h3">It's on now</div><p class="small muted" style="margin:0">Check in when you get there. Someone who's there confirms it, and that's what counts as attending.</p><div class="btn-pair"><button type="button" class="btn" data-act="checkin" data-v="${id}">I'm here</button><button type="button" class="btn ghost" data-act="late" data-v="${id}">Running late</button></div></div>`;
    if (st === 'checked_in') return `<div class="notice warn"><b>Checked in</b>Waiting for someone there to confirm.</div>`;
    if (st === 'attended') return `<div class="notice info"><b>You're checked in</b>${esc(g.confirmedBy ? PERSON[g.confirmedBy].name : org.name)} confirmed you're here. Have fun.</div>`;
    return `<div class="notice warn"><b>Happening now</b>It's too late to join this one. Say you're interested in the next one from the organiser's profile.</div>`;
  }
  // upcoming
  const joinLabel = left <= 0 ? 'Join the waitlist' : g.approve ? 'Ask to join' : 'Join';
  if (!st || st === 'left') {
    return `<div class="btn-pair"><button type="button" class="btn ghost" data-act="interest" data-v="${id}">I'm interested</button><button type="button" class="btn" data-act="join" data-v="${id}">${joinLabel}</button></div>
      <p class="small muted" style="margin:-6px 0 0">"I'm interested" puts you in the chat to ask questions, without taking a spot.</p>`;
  }
  if (st === 'interested') return `<div class="notice info"><b>You're interested</b>You're in the chat and you'll hear if it changes. No spot taken yet.</div>
      <button type="button" class="btn block" data-act="join" data-v="${id}">${joinLabel}</button><button type="button" class="link-btn" data-act="uninterest" data-v="${id}" style="justify-self:center">Not interested any more</button>`;
  if (st === 'requested') return `<div class="notice warn"><b>Requested</b>${esc(org.name)} confirms new people. You're in the chat meanwhile.</div><button type="button" class="link-btn" data-act="unrequest" data-v="${id}" style="justify-self:center">Cancel request</button>`;
  if (st === 'waitlist') return `<div class="notice warn"><b>You're on the waitlist</b>If a spot opens you're in automatically, and we'll tell you.</div><button type="button" class="link-btn" data-act="unrequest" data-v="${id}" style="justify-self:center">Leave the waitlist</button>`;
  if (st === 'going') return `<div class="notice info"><b>You're going</b>Check-in opens 30 minutes before the start. You'll get a reminder 2 hours before.</div><button type="button" class="link-btn" data-act="leave" data-v="${id}" style="justify-self:center;color:var(--flag)">Can't make it? Leave the plan</button>`;
  return '';
}

function directionsHTML(g) {
  const v = VENUE[g.venueId];
  if (!v) return `<div class="card"><p class="eyebrow">Getting there</p><div class="h3">${esc(g.venue)}</div></div>`;
  const links = mapsLinks(v);
  const d = km(PLACE[ME.suburb], v);
  const canMeet = inThread(g) || g.org === 'me';
  return `<div class="card dir"><p class="eyebrow">Getting there</p>
    <div><div class="h3">${esc(v.name)}</div><div class="small muted">${esc(v.address)} · ${d < 0.8 ? 'in your suburb' : `${d.toFixed(1)} km from ${esc(ME.suburb)}`}${v.alcohol ? ' · licensed' : ''}</div></div>
    <div class="dir-row"><span class="k">Meet</span><span>${canMeet ? esc(g.meet) : '<span class="muted">Shown once you\'re interested or going</span>'}</span></div>
    <div class="dir-row"><span class="k">Travel</span><span>${esc(g.directions)}</span></div>
    <div class="row"><a class="btn sm ghost" href="${links.google}" target="_blank" rel="noopener">Google Maps</a><a class="btn sm ghost" href="${links.apple}" target="_blank" rel="noopener">Apple Maps</a></div>
  </div>`;
}

// "Why you're seeing this": the graph path from you to the event.
function whyHTML(g) {
  const r = scoreEvent(ME, g, ctxNow(), NOW);
  const E = r.edges;
  const W = 340, rowH = 42, H = E.length * rowH + 8;
  const yOf = (i) => 4 + rowH / 2 + i * rowH;
  const cy = H / 2;
  let lines = '', mids = '';
  E.forEach((e, i) => {
    const y = yOf(i);
    lines += `<path class="wg-edge ${e.ok ? '' : 'partial'}" d="M50 ${cy} C 80 ${cy}, 80 ${y}, 108 ${y}"/><path class="wg-edge" d="M232 ${y} C 262 ${y}, 262 ${cy}, 288 ${cy}"/>`;
    mids += `<rect class="wg-pill ${e.ok ? '' : 'partial'}" x="108" y="${y - 16}" width="124" height="32" rx="9"/><text class="wg-v" x="118" y="${y - 2}">${esc(trunc(e.node, 17))}</text><text class="wg-k" x="118" y="${y + 10}">${esc(trunc(e.you, 24))}</text>`;
  });
  return `<div class="card"><p class="eyebrow">Why you're seeing this</p>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="How you connect to this plan: ${esc(E.map((e) => `${e.node}, ${e.you}`).join('; '))}">
      ${lines}${mids}
      <circle class="wg-you" cx="30" cy="${cy}" r="20"/><text class="wg-you-t" x="30" y="${cy + 4}" text-anchor="middle">You</text>
      <rect class="wg-ev" x="288" y="${cy - 18}" width="46" height="36" rx="9"/><text class="wg-ev-t" x="311" y="${cy + 4}" text-anchor="middle">Plan</text>
    </svg>
    <p class="small muted" style="margin:0">Solid lines fit you; dashed ones are a stretch. Feedback you leave changes these next time.</p></div>`;
}

function threadCardHTML(g) {
  const msgs = msgsOf(g.id);
  const people = new Set([...g.members, ...(g.interested || [])]).size;
  if (!inThread(g)) {
    return `<div class="card"><div class="row"><div class="h3 grow">Chat</div><span class="small muted">${plural(people, 'person')}</span></div>
      <p class="small muted" style="margin:0">${msgs.length ? `${plural(msgs.length, 'message')} so far. ` : ''}Tap "I'm interested" to read the thread and ask questions before you commit.</p></div>`;
  }
  const n = unread(g.id);
  const last = msgs.slice(-2);
  return `<article class="card tap" data-act="thread" data-v="${g.id}">
    <div class="row"><div class="h3 grow">Chat</div>${n ? `<span class="count-badge">${n} new</span>` : ''}<span class="small muted">${plural(people, 'person')}</span></div>
    ${last.length ? `<div class="mini-msgs">${last.map((m) => m.sys ? `<div class="small muted">${esc(m.text)}</div>` : `<div class="small"><b>${m.who === 'me' ? 'You' : esc(PERSON[m.who].name)}</b> ${esc(trunc(m.text, 70))}</div>`).join('')}</div>` : '<p class="small muted" style="margin:0">No messages yet. Say hello.</p>'}
    <span class="link-btn">Open the thread</span>
  </article>`;
}

function peopleHTML(g, phase) {
  const going = g.members.map((m) => PERSON[m]);
  const interested = (g.interested || []).filter((m) => !g.members.includes(m)).map((m) => PERSON[m]);
  const played = ctxNow().played;
  const row = (m) => `<div class="member" ${m.id !== 'me' ? `data-act="person" data-v="${m.id}" style="cursor:pointer"` : ''}>${avatar(m, 's')}<div style="flex:1;min-width:0"><b>${esc(m.id === 'me' ? 'You' : m.name)}</b>${m.id === g.org ? ' <span class="small muted">organiser</span>' : ''}<div class="small muted">${levelLabel(profileOf(m.id).levels[g.act]) || 'New to it'} · ${plural(profileOf(m.id).events, 'plan')}${m.id !== 'me' && played[m.id] ? ` · played with you ${played[m.id]}×` : ''}</div></div>${gw(personPts(m))}</div>`;
  return `<div><h3 class="h3">${phase === 'done' ? 'Who came' : "Who's going"}</h3><div style="margin-top:4px">${going.map(row).join('')}</div>
    ${interested.length && phase !== 'done' ? `<div class="row small" style="margin-top:8px"><span class="stack">${interested.map((m) => avatar(m, 's')).join('')}</span><span class="muted">${plural(interested.length, 'person')} interested</span></div>` : ''}</div>`;
}

// ---------- thread ----------

VIEWS.thread = ({ v: id }) => {
  const g = findPlan(id);
  markRead(id);
  const org = PERSON[g.org];
  const msgs = msgsOf(id);
  const reply = S.replyTo && S.replyTo.id === id ? msgs[S.replyTo.i] : null;
  return bar(esc(g.title), true, `<button type="button" class="link-btn" data-act="thread-details" data-v="${id}">Details</button>`) + `
    <div class="pad thread-pad">
      <div class="pin"><p class="eyebrow">Pinned by ${g.org === 'me' ? 'you' : esc(org.name)}</p><div><b>${esc(fmtSlot(slotOf(g, NOW), NOW))}</b> · ${esc(g.venue)}</div><div class="small">Meet: ${esc(g.meet)}</div></div>
      <div class="thread" id="thread">${msgs.map((m, i) => threadMsgHTML(g, m, i)).join('') || '<p class="small muted">No messages yet. Say hello.</p>'}</div>
    </div>
    <div class="composer">
      ${reply ? `<div class="replying"><span>Replying to <b>${reply.who === 'me' ? 'yourself' : esc(PERSON[reply.who].name)}</b>: ${esc(trunc(reply.text, 40))}</span><button type="button" class="link-btn" data-act="reply-cancel">Cancel</button></div>` : ''}
      <form id="threadForm" class="chat-form" data-plan="${id}"><input id="threadInput" autocomplete="off" placeholder="Message everyone in this plan" aria-label="Message"><button class="btn sm sea" type="submit">Send</button></form>
      <p class="small muted" style="margin:0">Everyone in the plan sees this, including people who are only interested.</p>
    </div>`;
};

function roleOf(g, who) {
  if (who === g.org) return 'Organiser';
  if (g.members.includes(who)) return g.past ? 'Went' : 'Going';
  if ((g.interested || []).includes(who)) return 'Interested';
  return '';
}

function threadMsgHTML(g, m, i) {
  if (m.sys) return `<div class="tmsg sys">${esc(m.text)}</div>`;
  const msgs = msgsOf(g.id);
  const q = m.reply != null ? msgs[m.reply] : null;
  const mine = m.who === 'me';
  const p = PERSON[m.who];
  return `<div class="tmsg ${mine ? 'mine' : ''}">
    ${mine ? '' : avatar(p, 's')}
    <div class="tbody">
      <div class="thead"><b>${mine ? 'You' : esc(p.name)}</b>${roleOf(g, m.who) ? `<span class="role">${roleOf(g, m.who)}</span>` : ''}<span class="muted">${m.at ? relTime(m.at) : ''}</span></div>
      ${q ? `<div class="quote-box">${esc(q.who === 'me' ? 'You' : PERSON[q.who].name)}: ${esc(trunc(q.text, 60))}</div>` : ''}
      <div class="ttext">${esc(m.text)}</div>
      ${mine ? '' : `<button type="button" class="link-btn small" data-act="reply" data-v="${g.id}:${i}">Reply</button>`}
    </div>
  </div>`;
}

function threadSend(id, raw) {
  const g = findPlan(id);
  const { text, hits } = screenMessage(raw);
  msgsOf(id).push({ who: 'me', text, at: new Date(), reply: S.replyTo && S.replyTo.id === id ? S.replyTo.i : null });
  if (hits.length) postSys(id, `Keen hid the ${hits.join(', ')}. Contact details unlock after you've met in a plan together. Never pay anyone you met here.`);
  S.replyTo = null;
  markRead(id);
  render();
  scrollThread();
  const answer = cannedReply(g, raw);
  if (answer) {
    const who = g.org !== 'me' ? g.org : g.members.find((m) => m !== 'me');
    if (who) setTimeout(() => {
      const i = msgsOf(id).length - 1 - [...msgsOf(id)].reverse().findIndex((m) => m.who === 'me');
      msgsOf(id).push({ who, text: answer, at: new Date(), reply: i });
      arrived(g, who);
    }, 2200);
  }
}

// A demo stand-in for the organiser answering common questions.
function cannedReply(g, text) {
  const t = text.toLowerCase();
  const v = VENUE[g.venueId] || {};
  if (/\b(where|meet|find you|which)\b/.test(t)) return `${g.meet}. I'll wave.`;
  if (/\b(park|parking|drive|car)\b/.test(t)) return v.parking || "There's street parking nearby.";
  if (/\b(bring|need|racquet|boots|gear|equipment|wear)\b/.test(t)) return g.bring ? `Just ${g.bring.toLowerCase()}.` : 'Just yourself and some water.';
  if (/\b(beginner|level|new|good enough|never)\b/.test(t)) return 'All good, we keep it friendly. Everyone was new once.';
  if (/\b(late)\b/.test(t)) return "No worries, we'll save you a spot.";
  if (/\b(rain|weather|cancel)\b/.test(t)) return "If the weather's bad I'll post here at least 2 hours before.";
  if (t.includes('?')) return "Good question. I'll check and post here.";
  return null;
}

function arrived(g, who) {
  const v = view();
  if (v.name === 'thread' && v.v === g.id) { markRead(g.id); render(true); scrollThread(); }
  else { updateBadge(); if (v.name === 'plan' && v.v === g.id) render(true); toast(`${PERSON[who].name} replied in "${trunc(g.title, 24)}"`); }
}

function scrollThread() {
  const scr = $('#screen');
  requestAnimationFrame(() => { scr.scrollTop = scr.scrollHeight; });
}

// ---------- roll call (organiser marks attendance) ----------

VIEWS.rollcall = ({ v: id }) => {
  const g = findPlan(id);
  if (!S.rc || S.rc.id !== id) S.rc = { id, came: Object.fromEntries(g.members.filter((m) => m !== 'me').map((m) => [m, true])) };
  const checkedIn = { p23: '7:58am', p24: '8:03am' };
  return bar('Take attendance') + `<div class="pad">
    <div><p class="eyebrow">${esc(fmtSlot(slotOf(g, NOW), NOW))}</p><h1 class="h1" style="font-size:24px">${esc(g.title)}</h1><div class="small muted">${esc(g.venue)}</div></div>
    <p class="small muted" style="margin:0">Mark who came. Confirmed attendance is what earns people Goodwill. A no-show only costs someone Goodwill when a second person reports it too.</p>
    <div class="card" style="gap:0">
      <div class="member">${avatar(ME, 's')}<b style="flex:1">You</b><span class="small muted">organiser</span></div>
      ${Object.entries(S.rc.came).map(([pid, came]) => `<div class="member">${avatar(PERSON[pid], 's')}<div style="flex:1;min-width:0"><b>${esc(PERSON[pid].name)}</b><div class="small muted">${checkedIn[pid] ? `Checked in ${checkedIn[pid]}` : 'Didn\'t check in'}</div></div>
        <span class="seg"><button type="button" data-act="rc" data-v="${pid}:1" aria-pressed="${came}">Came</button><button type="button" data-act="rc" data-v="${pid}:0" aria-pressed="${!came}">No-show</button></span></div>`).join('')}
    </div>
    <button type="button" class="btn block" data-act="rc-confirm" data-v="${id}">Confirm attendance</button>
  </div>`;
};

// ---------- Plans tab ----------

function needsYou() {
  const items = [];
  for (const g of allEvents()) {
    if (myStatus(g) === 'going' && !g.past && eventPhase(g, NOW) === 'live') items.push({ g, act: 'plan', label: 'Check in', sub: 'Happening now', cta: "I'm here" });
    if (g.org === 'me' && g.needsRollcall) items.push({ g, act: 'rollcall', label: 'Take attendance', sub: fmtSlot(slotOf(g, NOW), NOW), cta: 'Mark who came' });
    if (g.org === 'me' && g.requests && g.requests.length) items.push({ g, act: 'plan', label: `${plural(g.requests.length, 'person')} asking to join`, sub: fmtSlot(slotOf(g, NOW), NOW), cta: 'Review' });
  }
  if (!S.feedbackDone) items.push({ g: PAST_PLANS[0], act: 'feedback', label: 'Rate the plan', sub: fmtSlot(slotOf(PAST_PLANS[0], NOW), NOW), cta: 'Rate · +20' });
  return items;
}

function threadsList() {
  return allEvents()
    .filter((g) => inThread(g) && msgsOf(g.id).length && (!g.past || unread(g.id) || g.id === 'past1'))
    .map((g) => ({ g, last: msgsOf(g.id)[msgsOf(g.id).length - 1] }))
    .sort((a, b) => (b.last.at || 0) - (a.last.at || 0));
}

function eventRow(g, statusText, statusClass = 'wait') {
  if (g.status === 'cancelled') { statusText = 'Cancelled'; statusClass = 'due'; }
  return `<article class="card tap" data-act="plan" data-v="${g.id}">
    <div class="event-row"><div class="thumb">${actArt(g.act)}</div><div class="grow" style="min-width:0"><div class="name ellipsis">${esc(g.title)}</div><div class="muted small ellipsis">${esc(fmtSlot(slotOf(g, NOW), NOW))} · ${esc(g.venue)}</div>
      <div class="row" style="margin-top:6px"><span class="status ${statusClass}">${statusText}</span>${unread(g.id) && inThread(g) ? `<span class="count-badge">${unread(g.id)} new</span>` : ''}</div></div></div>
  </article>`;
}

VIEWS.activity = () => {
  const evs = allEvents().filter((g) => !g.past && eventPhase(g, NOW) !== 'done');
  const going = evs.filter((g) => ['going', 'checked_in', 'attended', 'requested', 'waitlist', 'hosting'].includes(myStatus(g)));
  const interested = evs.filter((g) => myStatus(g) === 'interested');
  const needs = needsYou();
  const threads = threadsList();
  let h = bar('Plans', false, `<button type="button" class="btn sm" data-act="create">Create</button>`) + '<div class="pad">';
  if (needs.length) {
    h += `<div class="section-h"><h3 class="h3">Needs you</h3><span class="small muted num">${needs.length}</span></div>`;
    h += needs.map((n) => `<article class="card tap needs" data-act="${n.act}" data-v="${n.g.id}"><div class="event-row"><div class="thumb">${actArt(n.g.act)}</div><div class="grow" style="min-width:0"><p class="eyebrow" style="color:var(--flag)">${esc(n.label)}</p><div class="h3 ellipsis">${esc(n.g.title)}</div><div class="small muted">${esc(n.sub)}</div></div><span class="btn sm">${esc(n.cta)}</span></div></article>`).join('');
  }
  h += `<div class="section-h"><h3 class="h3">Going</h3><span class="small muted num">${going.length}</span></div>`;
  h += going.length ? going.map((g) => eventRow(g, STATUS_LABEL[myStatus(g)], ['going', 'attended', 'hosting'].includes(myStatus(g)) ? 'ok' : 'wait')).join('') : '<p class="small muted">Nothing booked. Find something in Explore.</p>';
  if (interested.length) h += `<div class="section-h"><h3 class="h3">Interested</h3><span class="small muted num">${interested.length}</span></div>${interested.map((g) => eventRow(g, 'Interested')).join('')}`;
  h += `<div class="section-h"><h3 class="h3">Messages</h3><span class="small muted num">${threads.length}</span></div>`;
  h += threads.length ? `<div class="card" style="gap:0">${threads.slice(0, 5).map(({ g, last }) => `<div class="thread-row" data-act="thread" data-v="${g.id}">${avatar(PERSON[g.org], 's')}<div style="flex:1;min-width:0"><div class="row"><b class="grow" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(g.title)}</b><span class="small muted">${last.at ? relTime(last.at) : ''}</span></div><div class="small muted ellipsis">${last.sys ? esc(last.text) : `${last.who === 'me' ? 'You' : esc(PERSON[last.who].name)}: ${esc(last.text)}`}</div></div>${unread(g.id) ? `<span class="count-badge">${unread(g.id)}</span>` : ''}</div>`).join('')}</div>` : '<p class="small muted">Threads appear when you join or say you\'re interested in a plan.</p>';
  h += `<div class="section-h"><h3 class="h3">Your asks</h3><span class="small muted num">${S.myAsks.length}</span></div>`;
  h += S.myAsks.length ? S.myAsks.map((a) => `
    <article class="card tap" data-act="myask" data-v="${a.id}">
      <div class="row"><div class="grow"><div class="name">${esc(a.text)}</div><div class="muted small">${esc(a.summary)}</div></div><span class="status ${a.keen ? 'ok' : 'wait'}">${a.keen ? `${a.keen} keen` : 'Waiting'}</span></div>
      <div class="small muted num">Sent ${a.sent} · Seen ${a.seen} · Keen ${a.keen} · Passed ${a.passed}</div>
    </article>`).join('') : '<p class="small muted">No open asks.</p>';
  h += `<button type="button" class="btn block ghost" data-act="history">Your history · ${plural(historyItems().length, 'plan')}</button>`;
  return h + '</div>';
};

// ---------- history ----------

function historyItems() {
  return [...PAST_PLANS, ...HISTORY, ...allEvents().filter((g) => !g.past && myStatus(g) === 'attended' && eventPhase(g, NOW) === 'done')]
    .filter((g, i, a) => g.members.includes('me') && a.indexOf(g) === i)
    .sort((a, b) => slotOf(b, NOW).start - slotOf(a, NOW).start);
}

function historyRowHTML(g) {
  const hosted = g.org === 'me';
  const due = (g.id === 'past1' && !S.feedbackDone) || g.needsRollcall;
  const right = due ? `<span class="status due">${g.needsRollcall ? 'Take attendance' : 'Rate'}</span>` : g.rated ? `<span class="stars-sm" aria-label="You rated it ${g.rated} stars">${'★'.repeat(g.rated)}</span>` : '';
  return `<div class="hist-row" data-act="plan" data-v="${g.id}">
    <div class="thumb">${actArt(g.act)}</div>
    <div class="hist-date num"><b>${slotOf(g, NOW).start.getDate()}</b><span>${MONTHS_SHORT[slotOf(g, NOW).start.getMonth()]}</span></div>
    <div style="flex:1;min-width:0"><div class="name ellipsis">${esc(g.title)}</div><div class="small muted ellipsis">${esc(ACT[g.act].label)} · ${hosted ? 'Hosted' : 'Went'} · ${plural(g.members.length - 1, 'other')}</div></div>
    ${right}
  </div>`;
}
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function historyStats() {
  const items = historyItems();
  const byAct = {};
  items.forEach((g) => { byAct[g.act] = (byAct[g.act] || 0) + 1; });
  const top = Object.entries(byAct).sort((a, b) => b[1] - a[1]);
  return { items, byAct: top, hosted: items.filter((g) => g.org === 'me').length };
}

VIEWS.history = () => {
  const { items, byAct, hosted } = historyStats();
  const played = Object.entries(ctxNow().played).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return bar('History') + `<div class="pad">
    <div class="kpis"><div><b>${myStats().events}</b><span>confirmed</span></div><div><b>${myStats().hosted}</b><span>hosted</span></div><div><b>${ME.noShows}</b><span>no-shows</span></div></div>
    <div><h3 class="h3">By activity</h3><div class="chips" style="margin-top:6px">${byAct.map(([a, n]) => `<span class="chip">${esc(ACT[a].label)} <span class="num muted">${n}</span></span>`).join('')}</div></div>
    <div><h3 class="h3">People you've played with</h3><div class="chips" style="margin-top:6px">${played.map(([pid, n]) => `<button type="button" class="chip" data-act="person" data-v="${pid}">${esc(PERSON[pid].name)} <span class="num muted">${n}×</span></button>`).join('')}</div></div>
    <div class="card" style="gap:0">${items.map(historyRowHTML).join('')}</div>
    <p class="small muted" style="margin:0">Plans count once someone who was there confirms you came, so ${items.length - myStats().events} of these ${items.length} aren't counted yet. Others see only how many times you've done each activity, never where or when.</p>
  </div>`;
};

// ---------- actions ----------

function after(ms, fn) { setTimeout(fn, ms); }

Object.assign(ACTIONS, {
  thread: (v) => { if (!inThread(findPlan(v))) return; go('thread', v); scrollThread(); },
  'thread-details': (v) => { const prev = S.stack[S.stack.length - 2]; if (prev && prev.name === 'plan' && prev.v === v) back(); else go('plan', v); },
  reply: (v) => { const [id, i] = v.split(':'); S.replyTo = { id, i: +i }; render(true); $('#threadInput')?.focus(); },
  'reply-cancel': () => { S.replyTo = null; render(true); },
  history: () => go('history'),
  interest: (v) => {
    const g = findPlan(v);
    S.mem[v] = 'interested';
    if (!g.interested.includes('me')) g.interested.push('me');
    postSys(v, `${ME.name} is interested`);
    markRead(v);
    render(true);
    toast(`You're in the chat for "${trunc(g.title, 26)}". No spot taken.`);
    if (g.org !== 'me') after(3000, () => { msgsOf(v).push({ who: g.org, text: `Welcome ${ME.name}! Ask anything here.`, at: new Date() }); arrived(g, g.org); });
  },
  uninterest: (v) => {
    const g = findPlan(v);
    S.mem[v] = null;
    g.interested = g.interested.filter((m) => m !== 'me');
    render(true);
    toast("Done. You won't hear about this plan any more.");
  },
  join: (v) => {
    const g = findPlan(v);
    const org = PERSON[g.org];
    if (!g.interested.includes('me')) g.interested.push('me');
    if (g.members.length >= g.size) {
      S.mem[v] = 'waitlist';
      postSys(v, `${ME.name} joined the waitlist`);
      toast("You're first on the waitlist. You're in the chat meanwhile.");
    } else if (g.approve) {
      S.mem[v] = 'requested';
      postSys(v, `${ME.name} asked to join`);
      toast(`Request sent. ${org.name} confirms new people.`);
      after(3500, () => {
        if (S.mem[v] !== 'requested') return;
        S.mem[v] = 'going';
        g.members.push('me');
        postSys(v, `${org.name} confirmed ${ME.name}`);
        updateBadge();
        if (['plan', 'activity', 'thread'].includes(view().name)) render(true);
        toast(`${org.name} confirmed you. You're going to "${trunc(g.title, 22)}".`);
      });
    } else {
      S.mem[v] = 'going';
      g.members.push('me');
      postSys(v, `${ME.name} joined`);
      toast("You're going. The meeting point and chat are open.");
    }
    markRead(v);
    updateBadge();
    render(true);
  },
  unrequest: (v) => {
    const g = findPlan(v);
    S.mem[v] = 'interested';
    postSys(v, `${ME.name} cancelled their request`);
    markRead(v);
    render(true);
    toast("Request cancelled. You're still in the chat as interested.");
  },
  leave: (v) => {
    const g = findPlan(v);
    const hours = (slotOf(g, NOW).start - NOW) / 36e5;
    sheet(`<div class="h3">Leave "${esc(g.title)}"?</div>
      <p class="small" style="margin:0">Your spot goes to the next person on the waitlist, and the group sees that you can't make it.</p>
      ${hours < 24 ? '<div class="notice warn"><b>This is a late cancel</b>It starts in less than 24 hours. Three late cancels in a month cost 50 Goodwill.</div>' : ''}
      <button type="button" class="btn block" data-act="leave-confirm" data-v="${v}">Leave the plan</button>
      <button type="button" class="btn block ghost" data-act="close-sheet">Stay in</button>`);
  },
  'leave-confirm': (v) => {
    const g = findPlan(v);
    g.members = g.members.filter((m) => m !== 'me');
    g.interested = g.interested.filter((m) => m !== 'me');
    S.mem[v] = 'left';
    postSys(v, `${ME.name} can't make it any more`);
    closeSheet();
    render(true);
    toast('You left the plan. The organiser has been told.');
  },
  checkin: (v) => {
    const g = findPlan(v);
    S.mem[v] = 'checked_in';
    postSys(v, `${ME.name} checked in`);
    markRead(v);
    render(true);
    after(2500, () => {
      S.mem[v] = 'attended';
      g.confirmedBy = g.org;
      g.confirmed = true;
      CTX = null;
      addPoints(50, `Attended ${g.title}, confirmed by ${PERSON[g.org].name}`);
      postSys(v, `${PERSON[g.org].name} confirmed ${ME.name} is here`);
      updateBadge();
      if (['plan', 'activity'].includes(view().name)) render(true);
      toast(`${PERSON[g.org].name} confirmed you're here. +50 Goodwill.`);
    });
  },
  late: (v) => {
    msgsOf(v).push({ who: 'me', text: 'Running about 10 minutes late, sorry!', at: new Date() });
    markRead(v);
    toast('Told the group you\'re running late.');
    const g = findPlan(v);
    after(2000, () => { msgsOf(v).push({ who: g.org, text: "No worries, we'll save you a spot.", at: new Date() }); arrived(g, g.org); });
    render(true);
  },
  rollcall: (v) => { S.rc = null; go('rollcall', v); },
  'cancel-plan': (v) => {
    const g = findPlan(v);
    const people = new Set([...g.members, ...(g.interested || [])].filter((m) => m !== 'me')).size;
    sheet(`<div class="h3">Cancel "${esc(g.title)}"?</div>
      <p class="small" style="margin:0">${plural(people, 'person')} going or interested will get a message straight away. Cancelling less than 24 hours before the start counts as a late cancel.</p>
      <p class="eyebrow">Why?</p>
      <div class="chips">${['Bad weather', 'Not enough people', 'Venue not available', 'Something came up'].map((r) => `<button type="button" class="chip" data-act="cancel-pick" data-v="${r}">${r}</button>`).join('')}</div>
      <button type="button" class="btn block" data-act="cancel-confirm" data-v="${v}">Cancel the plan</button>
      <button type="button" class="btn block ghost" data-act="close-sheet">Keep it</button>`);
  },
  'cancel-pick': (v, el) => { document.querySelectorAll('[data-act="cancel-pick"]').forEach((b) => b.setAttribute('aria-pressed', String(b === el))); S.cancelReason = v; },
  'cancel-confirm': (v) => {
    const g = findPlan(v);
    g.status = 'cancelled';
    g.cancelReason = S.cancelReason ? `${S.cancelReason}.` : '';
    S.cancelReason = null;
    postSys(v, `${ME.name} cancelled the plan${g.cancelReason ? `: ${g.cancelReason.toLowerCase().replace(/\.$/, '')}` : ''}`);
    closeSheet();
    updateBadge();
    render(true);
    toast('Plan cancelled. Everyone in it has been told.');
  },
  rc: (v) => { const [pid, c] = v.split(':'); S.rc.came[pid] = c === '1'; render(true); },
  'rc-confirm': (v) => {
    const g = findPlan(v);
    const came = Object.entries(S.rc.came).filter(([, c]) => c).map(([pid]) => pid);
    const missed = Object.keys(S.rc.came).filter((pid) => !S.rc.came[pid]);
    g.needsRollcall = false;
    g.confirmed = true;
    g.members = ['me', ...came];
    CTX = null;
    addPoints(GOODWILL_RULES.attended, `Attended ${g.title}`);
    if (came.length + 1 >= 3) addPoints(GOODWILL_RULES.hosted, `Hosted ${g.title}, ${came.length + 1} came`);
    S.rc = null;
    back();
    updateBadge();
    toast(`${came.length + 1 >= 3 ? '+100 Goodwill. ' : ''}Everyone who came gets +50.${missed.length ? ` ${missed.map((m) => PERSON[m].name).join(' and ')} marked as no-show, pending a second report.` : ''}`);
  },
});
