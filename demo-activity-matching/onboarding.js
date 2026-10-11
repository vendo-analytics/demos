// Onboarding: a getting-to-know-you conversation that builds the profile.
// Brain: Claude (through the published page's `sample` capability, with an update_profile tool)
// when available, otherwise the scripted agent in agent.js. Voice: the browser's speech
// recognition and speech synthesis where allowed, with typing and quick replies always available.

let SAMPLE = null;
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
let recog = null;

const MIC_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
const SEND_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';
const SPEAKER_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>';

function freshOnboarding() {
  const p = emptyProfile();
  const hello = question('name', p);
  return {
    profile: p, turns: [{ who: 'agent', text: hello }], history: [{ role: 'assistant', content: hello }],
    busy: false, mode: SAMPLE ? 'claude' : 'script', fellBack: false, ctl: null,
    listening: false, speaking: false, voice: false, note: null, prevCard: {},
  };
}

// Light up the Claude brain when this page runs inside a Claude viewer that allows it.
async function detectClaude() {
  try {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    const s = await window.claude.use('sample');
    if (!s) return;
    const lim = await s.limits().catch(() => null);
    if (!lim || !lim.tools) return;
    SAMPLE = s;
    if (S.ob && !S.ob.fellBack) { S.ob.mode = 'claude'; obPaint(); }
  } catch (e) { /* stay scripted */ }
}

// ---------- screen ----------

VIEWS.onboard = () => `
  <div class="bar"><span class="flag-mark sm" aria-hidden="true"></span><h2>Getting to know you</h2><button type="button" class="link-btn" data-act="ob-skip">Skip</button></div>
  <div class="ob">
    <div id="obCard" class="ob-card">${obCardHTML()}</div>
    <div id="obChat" class="ob-chat" aria-live="polite">${obChatHTML()}</div>
  </div>
  <div class="ob-dock">
    <div id="obQuick" class="ob-quick">${obQuickHTML()}</div>
    <form id="obForm" class="ob-form" autocomplete="off">
      <button type="button" id="obOrb" class="orb ${orbState()}" data-act="ob-mic" aria-label="Talk">${MIC_SVG}</button>
      <input id="obInput" placeholder="Talk or type…" aria-label="Your answer">
      <button type="submit" class="icon-btn send" aria-label="Send">${SEND_SVG}</button>
    </form>
    <div id="obMeta" class="ob-meta">${obMetaHTML()}</div>
  </div>`;

function obCardHTML() {
  const ob = S.ob, p = ob.profile, n = progress(p);
  const label = (list, id) => (list.find((x) => x.id === id) || {}).label || id;
  const chip = (text, rm) => `<span class="pf-chip">${esc(text)}<button type="button" data-act="ob-remove" data-v="${rm}" aria-label="Remove ${esc(text)}">×</button></span>`;
  const rows = [
    ['Name', p.name ? esc(p.name) : ''],
    ['Into', p.activities.map((a) => chip(ACT[a.id].label + (a.level ? ` · ${LEVEL_LABEL[a.level]}` : ''), 'act:' + a.id)).join('')],
    ['Area', p.suburb ? esc(`${p.suburb} · ${p.radius || 10} km`) : ''],
    ['Age', p.age != null ? String(p.age) : p.ageSkipped ? 'Skipped' : '', true],
    ['Here to', p.goals.map((g) => chip(label(GOALS, g), 'goal:' + g)).join('')],
    ['Avoid', p.avoid.length ? p.avoid.map((a) => chip(label(AVOIDS, a), 'avoid:' + a)).join('') : p.avoidDone ? 'Nothing' : '', true],
    ['Free', p.free.map((f) => chip(label(AVAILABILITY, f), 'free:' + f)).join('')],
  ];
  const html = rows.map(([k, v, priv]) => {
    const fresh = v && ob.prevCard[k] !== v;
    ob.prevCard[k] = v;
    return `<div class="pf-row${fresh ? ' new' : ''}"><span class="pf-k">${k}${priv ? '<span class="lock">only you</span>' : ''}</span><span class="pf-v">${v || '<span class="pf-empty">…</span>'}</span></div>`;
  }).join('');
  const dots = Array.from({ length: TOPIC_COUNT }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
  return `<div class="pf-head"><span class="eyebrow">Your profile</span><span class="pf-progress" role="img" aria-label="${n} of ${TOPIC_COUNT} done">${dots}</span></div>${html}`;
}

function obChatHTML() {
  const ob = S.ob;
  let h = ob.turns.map((t) => t.who === 'agent'
    ? `<div class="say agent"><span class="flag-mark" aria-hidden="true"></span><div class="say-text">${t.pending ? '<span class="typing" aria-label="Thinking"><span></span><span></span><span></span></span>' : esc(t.text)}</div></div>`
    : `<div class="say me">${esc(t.text)}</div>`).join('');
  const topic = nextTopic(ob.profile);
  if (topic === 'done' && !ob.busy) {
    h += `<div class="ob-done"><button type="button" class="btn block" data-act="ob-finish">Looks good, let's go</button><p class="small muted" style="margin:0;text-align:center">Or tell me what to change, like "add tennis" or "I'm in Mosman".</p></div>`;
  }
  if (topic === 'blocked') {
    h += `<div class="ob-done"><button type="button" class="btn block ghost" data-act="ob-restart">Start again</button></div>`;
  }
  return h;
}

function obQuickHTML() {
  const ob = S.ob;
  if (ob.busy) return '';
  return quickReplies(nextTopic(ob.profile), ob.profile).map((q) => `<button type="button" class="chip" data-act="ob-say" data-v="${esc(q)}">${esc(q)}</button>`).join('');
}

function obMetaHTML() {
  const ob = S.ob;
  const pill = ob.mode === 'claude'
    ? '<span class="mode-pill live" title="Replies come from Claude, on your own Claude account">Live agent · Claude</span>'
    : '<span class="mode-pill" title="Replies come from a rule-based script in this page">Offline demo agent</span>';
  const voice = `<button type="button" class="voice-btn" data-act="ob-voice" aria-pressed="${ob.voice}">${SPEAKER_SVG}${ob.voice ? 'Voice on' : 'Voice off'}</button>`;
  const stop = ob.busy && ob.ctl ? '<button type="button" class="link-btn" data-act="ob-stop">Stop</button>' : '';
  return `<div class="row" style="justify-content:space-between;width:100%">${pill}${stop}${voice}</div>${ob.note ? `<p class="ob-note">${esc(ob.note)}</p>` : ''}`;
}

const orbState = () => (S.ob.listening ? 'listening' : S.ob.speaking ? 'speaking' : S.ob.busy ? 'thinking' : '');

function obPaint() {
  if (view().name !== 'onboard') return;
  $('#obCard').innerHTML = obCardHTML();
  $('#obChat').innerHTML = obChatHTML();
  $('#obQuick').innerHTML = obQuickHTML();
  $('#obMeta').innerHTML = obMetaHTML();
  obPaintOrb();
  scrollChat();
  renderNotes();
}

function obPaintOrb() {
  const o = $('#obOrb');
  if (o) { o.className = 'orb ' + orbState(); o.setAttribute('aria-label', S.ob.listening ? 'Stop listening' : 'Talk'); }
}

function scrollChat() {
  const scr = $('#screen');
  requestAnimationFrame(() => { scr.scrollTop = scr.scrollHeight; });
}

function obAfterRender() { scrollChat(); }

// ---------- conversation ----------

function obSubmit() {
  const input = $('#obInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  obSend(text);
}

async function obSend(text) {
  const ob = S.ob;
  if (ob.busy || nextTopic(ob.profile) === 'blocked') return;
  stopSpeaking();
  ob.note = null;
  ob.turns.push({ who: 'me', text });
  ob.history.push({ role: 'user', content: text });
  if (ob.mode === 'claude' && SAMPLE) await claudeTurn(text);
  else await scriptedTurnUI(text);
}

async function scriptedTurnUI(text) {
  const ob = S.ob;
  ob.busy = true;
  const turn = { who: 'agent', text: '', pending: true };
  ob.turns.push(turn);
  obPaint();
  await new Promise((r) => setTimeout(r, 450));
  const { reply } = scriptedTurn(ob.profile, text);
  turn.text = reply; turn.pending = false;
  ob.history.push({ role: 'assistant', content: reply });
  ob.busy = false;
  obPaint();
  speak(reply);
}

const FALLBACK_COPY = {
  not_granted: "Claude wasn't allowed for this page, so the offline demo agent is answering instead.",
  sampling_disabled: "Claude isn't available on this account, so the offline demo agent is answering instead.",
  rate_limited: 'Claude is busy right now. This answer came from the offline demo agent.',
  session_expired: 'Your Claude session expired. This answer came from the offline demo agent.',
};
const PERMANENT = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed', 'tools_unavailable', 'invalid_request'];

async function claudeTurn(text) {
  const ob = S.ob;
  ob.busy = true;
  const turn = { who: 'agent', text: '', pending: true };
  ob.turns.push(turn);
  ob.ctl = new AbortController();
  obPaint();

  // Instructions first, then the conversation; the newest turn carries the profile as it stands.
  const turns = ob.history.slice(-16);
  turns[turns.length - 1] = { role: 'user', content: `${text}\n\n[Profile so far: ${profileForPrompt(ob.profile)}]` };
  const input = [{ role: 'user', content: agentRules() }, ...turns];

  const tools = [{
    name: 'update_profile',
    description: 'Save facts the person just shared to their Keen profile. Pass only new facts, mapped to the allowed ids. Returns what was saved, the profile, and next_topic to ask about.',
    inputSchema: toolSchema(),
    execute: (args) => {
      const saved = applyFacts(ob.profile, factsFromTool(args || {}));
      obPaint();
      return { saved, profile: JSON.parse(profileForPrompt(ob.profile)) };
    },
  }];

  try {
    const { text: reply } = await SAMPLE(input, {
      modelTier: 'quick', tools, signal: ob.ctl.signal,
      onText: ({ text: t }) => { turn.text = t.trim(); turn.pending = false; paintLastTurn(turn); },
    });
    turn.text = reply.trim();
  } catch (e) {
    const code = e && e.code;
    if (code === 'cancelled') turn.text = (e.text || '').trim() || 'Okay, stopped. Carry on whenever you like.';
    else if (code === 'refused') turn.text = "Let's keep it to activities and your profile. " + question(nextTopic(ob.profile), ob.profile);
    else {
      if (PERMANENT.includes(code)) { ob.mode = 'script'; ob.fellBack = true; }
      ob.note = FALLBACK_COPY[code] || "Couldn't reach Claude. This answer came from the offline demo agent.";
      turn.text = scriptedTurn(ob.profile, text).reply;
    }
  }
  turn.pending = false;
  ob.history.push({ role: 'assistant', content: turn.text });
  ob.busy = false;
  ob.ctl = null;
  obPaint();
  speak(turn.text);
}

function paintLastTurn(turn) {
  const el = document.querySelector('#obChat .say.agent:last-of-type .say-text');
  if (el) el.textContent = turn.text;
  scrollChat();
}

// ---------- voice ----------

function speak(text) {
  const ob = S.ob;
  if (!ob.voice || !window.speechSynthesis) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    const v = voices.find((x) => /en-AU/i.test(x.lang)) || voices.find((x) => /^en/i.test(x.lang));
    if (v) u.voice = v;
    u.rate = 1.04;
    u.onstart = () => { ob.speaking = true; obPaintOrb(); };
    u.onend = () => {
      ob.speaking = false; obPaintOrb();
      // hands-free: listen again after the agent finishes talking
      if (ob.voice && SpeechRec && !ob.micBlocked && view().name === 'onboard' && !['done', 'blocked'].includes(nextTopic(ob.profile))) startListening();
    };
    speechSynthesis.speak(u);
  } catch (e) { /* speech is a bonus */ }
}

function stopSpeaking() {
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  if (S.ob) S.ob.speaking = false;
}

function startListening() {
  const ob = S.ob;
  if (!SpeechRec) {
    ob.note = "Voice input isn't available in this browser. Type, tap a reply, or use your keyboard's microphone.";
    obPaint();
    return;
  }
  try {
    stopSpeaking();
    recog = new SpeechRec();
    recog.lang = 'en-AU';
    recog.interimResults = true;
    recog.continuous = false;
    let finalText = '';
    recog.onresult = (e) => {
      let interim = '';
      finalText = '';
      for (const r of e.results) { if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript; }
      const input = $('#obInput');
      if (input) input.value = finalText || interim;
    };
    recog.onerror = (e) => {
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(e.error)) {
        ob.micBlocked = true;
        ob.note = "The microphone isn't available on this page. Type, tap a reply, or use your keyboard's mic. In the app this is a live voice conversation.";
        obPaint();
      }
    };
    recog.onend = () => {
      ob.listening = false; obPaintOrb();
      const input = $('#obInput');
      if (finalText.trim()) { if (input) input.value = ''; obSend(finalText.trim()); }
    };
    recog.start();
    ob.listening = true;
    obPaintOrb();
  } catch (e) {
    ob.listening = false;
    ob.note = "Couldn't start the microphone. Type or tap a reply instead.";
    obPaint();
  }
}

function stopListening() {
  try { if (recog) recog.stop(); } catch (e) { /* ignore */ }
  if (S.ob) S.ob.listening = false;
}

function obLeave() {
  stopListening();
  stopSpeaking();
  if (S.ob && S.ob.ctl) S.ob.ctl.abort();
  S.onboarding = false;
}

function obRestart() {
  obLeave();
  S.ob = freshOnboarding();
  S.onboarding = true;
  S.stack = [];
  render();
}

// Copy the conversation's profile onto the signed-in user.
function applyOnboarding(p) {
  if (p.name) ME.name = p.name;
  if (p.suburb) ME.suburb = p.suburb;
  ME.radius = p.radius || 10;
  if (p.activities.length) {
    ME.interests = p.activities.map((a) => a.id);
    ME.levels = Object.fromEntries(p.activities.map((a) => [a.id, a.level || 'casual']));
  }
  ME.age = p.age;
  ME.goals = [...p.goals];
  ME.avoid = [...p.avoid];
  ME.free = [...p.free];
}

Object.assign(ACTIONS, {
  'ob-say': (v) => obSend(v),
  'ob-mic': () => {
    const ob = S.ob;
    if (ob.listening) { stopListening(); obPaintOrb(); return; }
    if (ob.busy) return;
    startListening();
  },
  'ob-voice': () => {
    const ob = S.ob;
    ob.voice = !ob.voice;
    if (!ob.voice) { stopSpeaking(); stopListening(); }
    else if (!window.speechSynthesis) ob.note = "Spoken replies aren't available in this browser.";
    else { const last = [...ob.turns].reverse().find((t) => t.who === 'agent' && !t.pending); if (last) speak(last.text); }
    obPaint();
  },
  'ob-stop': () => { if (S.ob.ctl) S.ob.ctl.abort(); },
  'ob-remove': (v) => {
    const p = S.ob.profile;
    const [k, id] = v.split(':');
    if (k === 'act') p.activities = p.activities.filter((a) => a.id !== id);
    if (k === 'goal') p.goals = p.goals.filter((g) => g !== id);
    if (k === 'avoid') p.avoid = p.avoid.filter((a) => a !== id);
    if (k === 'free') p.free = p.free.filter((f) => f !== id);
    obPaint();
  },
  'ob-skip': () => { obLeave(); setTab('ask'); toast(`Using the sample profile for ${ME.name}.`); },
  'ob-finish': () => {
    const p = S.ob.profile;
    applyOnboarding(p);
    obLeave();
    S.text = ''; S.over = {}; S.feedTab = 'foryou';
    setTab('ask');
    toast(`You're set, ${ME.name}. Here's what's happening near you.`);
  },
  'ob-restart': () => obRestart(),
});

// ---------- notes column ----------

function obNotesExtra() {
  const p = S.ob.profile;
  const lines = [
    `name      ${p.name || '?'}`,
    `into      ${p.activities.map((a) => `${a.id}:${a.level || '?'}`).join(', ') || '?'}`,
    `area      ${p.suburb ? `${p.suburb}, ${p.radius || 10} km` : '?'}`,
    `age       ${p.age != null ? p.age + '   (private)' : p.ageSkipped ? 'skipped' : '?'}`,
    `goals     ${p.goals.join(', ') || '?'}`,
    `avoid     ${p.avoid.join(', ') || (p.avoidDone ? 'none' : '?')}   (private)`,
    `free      ${p.free.join(', ') || '?'}`,
    `next      ${nextTopic(p)}`,
  ];
  return `<div class="note-block"><h3>What the agent has saved</h3><pre class="shape">${esc(lines.join('\n'))}</pre></div>
    <div class="note-block"><h3>How the agent works</h3><ul>
      <li><b>Published page:</b> replies come from Claude through the page's <code>sample</code> capability, on the viewer's own Claude account, which asks permission on the first message. Claude calls an <code>update_profile</code> tool whose fields are the fixed tag lists, so it can't invent activities or suburbs.</li>
      <li><b>Opened from the repo, or when Claude isn't allowed:</b> a scripted agent with the same questions and rule-based extraction answers instead. The pill under the chat says which one you're talking to.</li>
      <li><b>Voice here:</b> tap the red button to talk where the browser allows the microphone, and turn on Voice to hear replies and go hands-free. Inside the claude.ai viewer the microphone is blocked, so type, tap, or use your keyboard's mic.</li>
      <li><b>In the app:</b> streaming speech-to-text, then the same agent and tool, then text-to-speech, with barge-in so you can interrupt. Audio isn't stored, only the facts on the card.</li>
    </ul></div>`;
}
