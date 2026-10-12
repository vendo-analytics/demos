// The graph that brings people and plans together: "Your graph" (every edge from you, weighted),
// "Graph data" (every node and edge type with live counts), and the organiser's reach breakdown.
// Loaded after app.js, event.js and profile.js; adds its screens and actions to the shared VIEWS and ACTIONS.

// Node and edge types. The same list drives the Graph data screen and MODEL.md §3.
const NODE_TYPES = [
  { key: 'person', label: 'Person', count: () => PEOPLE.length + FRIENDS.length + 1, note: 'Members, including you.' },
  { key: 'activity', label: 'Activity', count: () => ACTIVITIES.length, note: 'The fixed tag list.' },
  { key: 'category', label: 'Category', count: () => Object.keys(CATEGORIES).length, note: 'Groups activities for "similar" matches.' },
  { key: 'suburb', label: 'Suburb', count: () => PLACES.length, note: 'Where people live and venues are.' },
  { key: 'venue', label: 'Venue', count: () => VENUES.length, note: 'Public places only.' },
  { key: 'bucket', label: 'Time bucket', count: () => AVAILABILITY.length, note: 'Weekday or weekend, morning or afternoon/evening.' },
  { key: 'trait', label: 'Trait', count: () => AVOIDS.length, note: 'Water, heights, alcohol, contact, late, early, big.' },
  { key: 'goal', label: 'Goal', count: () => GOALS.length, note: 'Private reasons people use Keen.' },
  { key: 'plan', label: 'Plan', count: () => allEvents().length, note: 'Upcoming, past and cancelled.' },
  { key: 'ask', label: 'Ask', count: () => OPEN_ASKS.length + S.myAsks.length, note: 'Open requests in plain English.' },
];

const everyone = () => [ME, ...PEOPLE, ...FRIENDS];
const EDGE_TYPES = [
  { key: 'INTERESTED_IN', from: 'Person', to: 'Activity', by: 'Onboarding, profile edits', weight: 'Level; 0.75 base', vis: 'Public (with level)', use: 'Feed, search, reach', count: () => everyone().reduce((k, p) => k + p.interests.length, 0) },
  { key: 'ATTENDED', from: 'Person', to: 'Activity', by: 'Confirmed attendance', weight: '+0.05 per plan, max 1', vis: 'Counts only', use: 'Feed ranking: what you turn up to beats what you list', count: () => Object.keys(ctxNow().actCount).length + PEOPLE.reduce((k, p) => k + Object.values(p.activityCounts).filter((n) => n > 0).length, 0) },
  { key: 'LIVES_IN', from: 'Person', to: 'Suburb', by: 'Onboarding', weight: 'Distance ÷ travel radius', vis: 'Suburb public, radius private', use: 'Distance filter both ways', count: () => everyone().length },
  { key: 'FREE_AT', from: 'Person', to: 'Time bucket', by: 'Onboarding', weight: '1 if free, 0.3 if not', vis: 'Private', use: 'Feed ranking; reach holds back people busy then', count: () => everyone().reduce((k, p) => k + (p.free || []).length, 0) },
  { key: 'AVOIDS', from: 'Person', to: 'Trait', by: 'Onboarding', weight: 'Hard filter', vis: 'Private', use: 'Plans held back with a count; reach skips them', count: () => everyone().reduce((k, p) => k + (p.avoid || []).length, 0) },
  { key: 'WANTS', from: 'Person', to: 'Goal', by: 'Onboarding', weight: '+0.08 when a plan suits a goal', vis: 'Private', use: 'Feed ranking', count: () => everyone().reduce((k, p) => k + (p.goals || []).length, 0) },
  { key: 'MEMBER_OF', from: 'Person', to: 'Plan', by: 'Interested, join, leave', weight: 'Status', vis: 'Who\'s going is public; interested is a count', use: 'Threads, "who\'s going", momentum', count: () => allEvents().reduce((k, g) => k + new Set([...g.members, ...(g.interested || [])]).size, 0) },
  { key: 'PLAYED_WITH', from: 'Person', to: 'Person', by: 'Both attended the same plan (confirmed)', weight: 'Plans together ÷ 3, +1 for a good rating', vis: 'Only the two people', use: 'Feed ranking ("Mia is going"), event page', count: () => Object.keys(ctxNow().played).length },
  { key: 'RATED', from: 'Person', to: 'Person', by: 'Feedback after a plan', weight: 'Good strengthens PLAYED_WITH; bad quietly lowers plans with them', vis: 'Private', use: 'Feed ranking', count: () => Object.keys(S.ratings).length },
  { key: 'BLOCKED', from: 'Person', to: 'Person', by: 'Report or block', weight: 'Hard filter, both ways', vis: 'Private', use: 'Feed, search, browse, reach, matches', count: () => S.hidden.size },
  { key: 'IS / AT / IN / HAS', from: 'Plan', to: 'Activity, Venue, Time bucket, Trait', by: 'Creating or editing a plan', weight: '–', vis: 'Public', use: 'Every match', count: () => allEvents().length * 4 },
  { key: 'ASKS_FOR', from: 'Ask', to: 'Activity, Suburb, Time slots', by: 'Asking in plain English', weight: '–', vis: 'Private until matched', use: 'Matching asks to asks and plans; reach "told now"', count: () => (OPEN_ASKS.length + S.myAsks.length) * 3 },
];

// ---------- Your graph ----------

const BUCKET_SHORT = { 'wd-am': 'Weekday am', 'wd-pm': 'Weekday pm', 'we-am': 'Weekend am', 'we-pm': 'Weekend pm' };

function myGraphNodes() {
  const ctx = ctxNow();
  const nodes = [];
  const acts = [...new Set([...ME.interests, ...Object.keys(ctx.actCount)])];
  for (const a of acts) {
    const times = ctx.actCount[a] || 0, listed = ME.interests.includes(a);
    const w = Math.min(1, (listed ? 0.75 : 0.45) + 0.05 * times);
    nodes.push({ type: 'activity', id: a, label: ACT[a].label, w, color: (ART[ACT[a].cat] || ART.service)[0],
      detail: `${listed ? `You list ${ACT[a].label.toLowerCase()} at ${levelLabel(ME.levels[a])}` : `Not in your interests, but you went`}${times ? ` and have been to ${plural(times, 'confirmed plan')}` : ''}. Weight ${w.toFixed(2)}. Plans with this activity rank higher in your feed and search, and your ${ACT[a].label.toLowerCase()} plans can reach people who list it.` });
  }
  const people = Object.entries(ctx.played).filter(([pid]) => !S.hidden.has(pid)).sort((a, b) => b[1] - a[1]).slice(0, 6);
  for (const [pid, n] of people) {
    const r = ctx.rated[pid];
    const w = Math.min(1, (n + (r === 'good' ? 1 : 0)) / 3);
    nodes.push({ type: 'person', id: pid, label: PERSON[pid].name, w: r === 'bad' ? 0.2 : w, p: PERSON[pid], bad: r === 'bad',
      detail: r === 'bad' ? `You gave ${PERSON[pid].name} negative feedback, so plans with them rank lower for you. They're never told.` : `You've played together ${plural(n, 'time')}${r === 'good' ? ' and you rated them well' : ''}. Weight ${w.toFixed(2)}. When ${PERSON[pid].name} is going to a plan, it ranks higher for you and the card says so.` });
  }
  nodes.push({ type: 'place', id: ME.suburb, label: `${ME.suburb} · ${ME.radius} km`, w: 0.7, detail: `Your home suburb and travel distance. Plans further than ${ME.radius} km don't appear, and closer ones rank higher. Others see your suburb, never the distance.` });
  for (const b of ME.free) nodes.push({ type: 'time', id: b, label: BUCKET_SHORT[b], w: 0.6, detail: `You're usually free ${labelIn(AVAILABILITY, b).toLowerCase()}. Plans at those times get a boost. Private.` });
  for (const g of ME.goals) nodes.push({ type: 'goal', id: g, label: labelIn(GOALS, g), w: 0.5, detail: `Private goal. Plans that suit it get a small boost and a reason only you see.` });
  for (const a of ME.avoid) nodes.push({ type: 'avoid', id: a, label: labelIn(AVOIDS, a), w: 0.5, detail: `You'd rather avoid this. Plans with it are held back from your feed and search, with a count so you can still look. Private.` });
  for (const b of S.hidden) nodes.push({ type: 'blocked', id: b, label: PERSON[b].name, w: 0.4, p: PERSON[b], detail: `Blocked. You won't see each other's plans or asks. They aren't told.` });
  return nodes;
}

const GRAPH_COLORS = { activity: null, person: 'var(--sea)', place: '#30B0C7', time: '#AF52DE', goal: '#FF9F0A', avoid: 'var(--flag)', blocked: 'var(--muted)' };
const GRAPH_LABELS = { activity: 'Activities', person: 'People you\'ve played with', place: 'Where', time: 'Free times', goal: 'Goals (private)', avoid: 'Avoid (private)', blocked: 'Blocked' };

function myGraphSVG(nodes) {
  const W = 360, C = W / 2, R = 118;
  const n = nodes.length;
  let edges = '', dots = '', labels = '', defs = '';
  nodes.forEach((node, i) => {
    const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const x = C + R * Math.cos(ang), y = C + R * Math.sin(ang);
    const r = 9 + node.w * 13;
    const color = node.color || GRAPH_COLORS[node.type];
    const dashed = ['avoid', 'goal', 'blocked'].includes(node.type) || node.bad;
    const sel = S.gsel === `${node.type}:${node.id}`;
    edges += `<line class="yg-edge${dashed ? ' dashed' : ''}${sel ? ' sel' : ''}" x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" style="stroke:${color};stroke-width:${(1 + node.w * 3.5).toFixed(1)}"/>`;
    let inner = `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" style="fill:${color}" class="yg-dot${sel ? ' sel' : ''}"/>`;
    if (node.p && node.p.photo) {
      defs += `<clipPath id="yc${i}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r - 2).toFixed(1)}"/></clipPath>`;
      inner += `<image href="img/people/${node.p.id}.jpg" x="${(x - r).toFixed(1)}" y="${(y - r).toFixed(1)}" width="${(2 * r).toFixed(1)}" height="${(2 * r).toFixed(1)}" clip-path="url(#yc${i})" preserveAspectRatio="xMidYMid slice"${node.bad || node.type === 'blocked' ? ' opacity="0.45"' : ''}/>`;
    } else if (node.type === 'avoid' || node.type === 'blocked') {
      inner += `<path d="M${(x - 5).toFixed(1)} ${(y - 5).toFixed(1)} l10 10 m0 -10 l-10 10" class="yg-x"/>`;
    }
    dots += `<g class="yg-node" data-act="gsel" data-v="${node.type}:${node.id}" tabindex="0" role="button" aria-label="${esc(node.label)}">${inner}</g>`;
    const lx = C + (R + r + 8) * Math.cos(ang), ly = C + (R + r + 8) * Math.sin(ang);
    const anchor = Math.abs(Math.cos(ang)) < 0.25 ? 'middle' : Math.cos(ang) > 0 ? 'start' : 'end';
    labels += `<text class="yg-label" x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${anchor}">${esc(trunc(node.label, 16))}</text>`;
  });
  const me = ME.photo ? `<clipPath id="ycme"><circle cx="${C}" cy="${C}" r="30"/></clipPath><image href="img/people/me.jpg" x="${C - 30}" y="${C - 30}" width="60" height="60" clip-path="url(#ycme)" preserveAspectRatio="xMidYMid slice"/>` : `<text x="${C}" y="${C + 8}" text-anchor="middle" class="yg-me-t">${esc(ME.name[0])}</text>`;
  return `<svg class="yg" viewBox="-60 -24 ${W + 120} ${W + 48}" role="img" aria-label="Your graph: ${nodes.length} connections">
    <defs>${defs}</defs>${edges}${labels}${dots}
    <circle cx="${C}" cy="${C}" r="33" class="yg-me"/>${me}
  </svg>`;
}

VIEWS.graph = () => {
  const nodes = myGraphNodes();
  const sel = nodes.find((x) => `${x.type}:${x.id}` === S.gsel) || nodes[0];
  const counts = {};
  nodes.forEach((x) => { counts[x.type] = (counts[x.type] || 0) + 1; });
  return bar('Your graph') + `<div class="pad">
    <p class="small muted" style="margin:0">Everything Keen connects you to, and how strongly. Thicker lines count for more when ranking plans. Dashed ones are private filters.</p>
    <div class="card yg-card">${myGraphSVG(nodes)}</div>
    <div class="chips">${Object.entries(counts).map(([t, c]) => `<span class="chip yg-key"><i style="background:${t === 'activity' ? 'var(--good)' : GRAPH_COLORS[t]}"></i>${GRAPH_LABELS[t]} <span class="num muted">${c}</span></span>`).join('')}</div>
    <div class="card"><p class="eyebrow">${esc(GRAPH_LABELS[sel.type])}</p><div class="h3">${esc(sel.label)}</div><p class="small" style="margin:0">${esc(sel.detail)}</p><p class="small muted" style="margin:0">Tap any node to see why it's there.</p></div>
    <div class="card"><div class="h3">What changes your graph</div><div class="ledger">
      <div><span>Go to a plan (confirmed)</span><span class="plus">activity stronger, new people</span></div>
      <div><span>Rate someone well</span><span class="plus">person stronger</span></div>
      <div><span>Rate someone badly</span><span class="minus">their plans rank lower</span></div>
      <div><span>Block someone</span><span class="minus">hidden both ways</span></div>
      <div><span>Edit your profile</span><span class="muted">activities, times, distance</span></div>
    </div></div>
    <button type="button" class="btn block ghost" data-act="graph-data">Every node and edge type</button>
  </div>`;
};

VIEWS.graphData = () => bar('Graph data') + `<div class="pad">
  <p class="small muted" style="margin:0">The whole graph is ordinary database tables read as nodes and edges. Counts are live from this demo.</p>
  <section class="pf-group"><h3 class="h3">Nodes</h3>
    <div class="card" style="gap:0">${NODE_TYPES.map((t) => `<div class="act-row"><span class="grow"><b>${t.label}</b><br><span class="small muted">${esc(t.note)}</span></span><b class="num">${t.count()}</b></div>`).join('')}</div></section>
  <section class="pf-group"><h3 class="h3">Edges</h3>
    ${EDGE_TYPES.map((e) => `<div class="pf-field"><div class="row"><code class="fkey">${e.key}</code><span class="grow small muted">${esc(e.from)} → ${esc(e.to)}</span><b class="num">${e.count()}</b></div>
      <div class="meta small"><div><span class="k">Made by</span><span>${esc(e.by)}</span></div><div><span class="k">Weight</span><span>${esc(e.weight)}</span></div><div><span class="k">Who sees</span><span>${esc(e.vis)}</span></div><div><span class="k">Used for</span><span>${esc(e.use)}</span></div></div></div>`).join('')}</section>
  <section class="pf-group"><h3 class="h3">Two directions, one set of edges</h3>
    <div class="card"><p class="small" style="margin:0"><b>You → plans</b> (feed, search, "why you're seeing this"): your interests, history, distance, free times, level, goals and the people you've played with rank each plan. Avoided traits and blocked people filter.</p>
    <p class="small" style="margin:0"><b>Plan → people</b> (who a posted plan reaches): the same edges from the other side. Each person is checked against their own travel distance, avoid list, level, free times and weekly cap. Organisers see counts, never names.</p></div></section>
</div>`;

// ---------- organiser: who a plan reaches ----------

function reachHTML(g) {
  const r = reachForEvent(g, { now: NOW, blocked: S.hidden });
  const H = r.held;
  const rows = [
    ['Asked for this', r.asked.length, `Have an open ask for ${r.activity.toLowerCase()} at this time. Told straight away.`, 'ok'],
    [`Into ${r.activity.toLowerCase()} nearby`, r.likely.length, 'List the activity, live within their travel distance, and are usually free then. Told within their weekly cap.', 'ok'],
  ];
  const heldRows = [['Too far for them', H.far], ['Avoid something about it', H.avoid], ['Level too far apart', H.level], ['Usually busy then', H.busy], ['Already had 3 asks this week', H.cap], ['Blocked', H.blocked], ['Not told because of recent feedback about you', H.trust]].filter(([, n]) => n);
  return `<div class="card"><div class="row"><p class="eyebrow grow">Who this plan reaches</p><button type="button" class="link-btn" data-act="graph-data">How</button></div>
    <div class="ledger">${rows.map(([k, n, why]) => `<div><span><b>${k}</b><br><span class="small muted">${why}</span></span><b class="num">${n}</b></div>`).join('')}</div>
    ${heldRows.length ? `<p class="small muted" style="margin:0"><b>${plural(r.heldTotal, 'person')} held back:</b> ${heldRows.map(([k, n]) => `${k.toLowerCase()} ${n}`).join(' · ')}</p>` : ''}
    ${r.trust !== 'ok' ? `<p class="small" style="margin:0;color:var(--warn)">${r.trust === 'review' ? 'Nobody is being told about your plans while Keen reviews recent feedback.' : 'Fewer people are told about your plans for now, because of recent feedback.'} <button type="button" class="link-btn" data-act="tab" data-v="me">Why</button></p>` : ''}
    <p class="small muted" style="margin:0">You see numbers, never names, until people say they're interested.</p></div>`;
}

Object.assign(ACTIONS, {
  graph: () => { S.gsel = null; go('graph'); },
  'graph-data': () => go('graphData'),
  gsel: (v) => { S.gsel = v; render(true); },
});
