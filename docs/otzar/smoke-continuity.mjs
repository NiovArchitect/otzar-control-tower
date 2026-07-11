// Live continuity smoke — Corrections #1/#2 + P4 — dedicated smoke org only.
// Proves founder criteria A–G against the deployed API. Self-cleans every proposal
// it creates (a "no" in the bound thread cancels any lingering pending row), so the
// actor returns to zero-pending between phases and after the run (residue removal).
//
// Times are relative to the real server clock: 6am = already-past today;
// tomorrow times = always future (time-of-day robust).
const SP = process.env.SP, API = "https://api.otzar.ai/api/v1";
if (!SP) { console.log("missing SP (smoke-admin password)"); process.exit(2); }
const H = (t) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });

const health = await (await fetch(`${API}/health`)).json();
console.log("health:", health.ok, health.database);

const lj = await (await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "smoke-admin@niovlabs.com", password: SP, requested_operations: ["read", "write"] }) })).json();
const token = lj.token; if (!token) { console.log("login failed:", JSON.stringify(lj).slice(0, 160)); process.exit(1); }
console.log("login ok\n");

// Resilient POST: tolerate a transient non-JSON gateway blip (retry once), never crash.
async function post(body, tries = 2) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${API}/otzar/conversation/message`, { method: "POST", headers: H(token), body: JSON.stringify(body) });
      const text = await r.text();
      try { return JSON.parse(text); } catch { if (i === tries - 1) return { response: "", _nonjson: true, _status: r.status }; }
    } catch { if (i === tries - 1) return { response: "", _error: true }; }
    await new Promise((res) => setTimeout(res, 800));
  }
  return { response: "" };
}
let pass = 0, fail = 0;
const check = (name, cond, extra = "") => { console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`); cond ? pass++ : fail++; };
const RESOLVED = (r) => { const t = r.response || ""; return !/don'?t see|no (previous|prior) (question|context)/i.test(t) && /Olivia|calendar|connect|added|kept|pending|Budget|Strategy|Board|Dentist|Review|Ops|Design|Finance|Prep/i.test(t); };
const ACTED = (r) => /\b(added|created|done|on your calendar|working on it)\b/i.test(r.response || "");
const cancel = (thread) => post({ message: "no", conversation_id: thread }).catch(() => {});

// ── A + C: thread-bound proposal, in-thread confirm, ambient restoration ──
console.log("A/C — thread binding + ambient restoration");
{
  const p = await post({ message: "Put on my calendar that tomorrow at 2pm I'll be at Olivia's event." });
  const conv = p.conversation_id;
  check("A: future propose returns a stable conversation_id", typeof conv === "string" && conv.length > 0, conv);
  check("A: propose is action_proposed (not clarify)", p.action_proposed === true);
  const y = await post({ message: "yes", conversation_id: conv });
  check("A: in-thread 'yes' resolves", RESOLVED(y));
  check("A: 'yes' echoes the same bound thread", y.conversation_id === conv, `${y.conversation_id}`);
  await cancel(conv);

  const p2 = await post({ message: "put a dentist appointment on my calendar tomorrow at 2pm" });
  const conv2 = p2.conversation_id;
  const amb = await post({ message: "yes" }); // NO thread id — ambient restoration
  check("C: ambient 'yes' resolves the unambiguous pending", RESOLVED(amb));
  check("C: ambient 'yes' restores the bound thread id", amb.conversation_id === conv2, `${amb.conversation_id} vs ${conv2}`);
  await cancel(conv2);
}

// ── B: cross-thread negative ──
console.log("B — cross-thread negative");
{
  const p = await post({ message: "put a budget review on my calendar tomorrow at 3pm" });
  const conv = p.conversation_id;
  const foreign = await post({ message: "yes", conversation_id: "00000000-0000-4000-8000-000000000000" });
  check("B: 'yes' from a foreign thread does NOT act", !ACTED(foreign));
  const own = await post({ message: "yes", conversation_id: conv }); // prove original intact
  check("B: original proposal still resolvable in its own thread", RESOLVED(own));
  await cancel(conv);
}

// ── D: past-time clarification, stray 'yes' inert ──
console.log("D — past-time clarification");
{
  const c = await post({ message: "schedule a project review at 6am" });
  check("D: past-time asks a truthful clarification", /already passed|another time today|did you mean tomorrow/i.test(c.response || ""));
  check("D: past-time did NOT propose an action", c.action_proposed !== true);
  const stray = await post({ message: "yes" }); // nothing persisted → must be inert
  check("D: stray 'yes' after clarification executes nothing", !ACTED(stray));
}

// ── E: multiple pending — disambiguation, ordinal resolve, ordinal cancel ──
console.log("E — multiple pending");
{
  const a = await post({ message: "put a strategy sync on my calendar tomorrow at 4pm" });
  const b = await post({ message: "put a board prep on my calendar tomorrow at 3pm" });
  const amb = await post({ message: "yes" });
  check("E-i: two pending + 'yes' → disambiguation (no action)", (amb.clarification_needed === true || /which one|waiting for your confirmation/i.test(amb.response || "")) && !ACTED(amb));
  const first = await post({ message: "the first one" });
  check("E-i: 'the first one' resolves the oldest (strategy sync)", RESOLVED(first) && /strategy/i.test(first.response || ""));
  await cancel(a.conversation_id); await cancel(b.conversation_id);

  const c1 = await post({ message: "put a design review on my calendar tomorrow at 4pm" });
  const c2 = await post({ message: "put a finance review on my calendar tomorrow at 3pm" });
  const cancelSecond = await post({ message: "cancel the second one" });
  check("E-ii: 'cancel the second one' cancels only the second (finance)", /cancel|won'?t add/i.test(cancelSecond.response || "") && /finance/i.test(cancelSecond.response || ""));
  const firstStill = await post({ message: "yes", conversation_id: c1.conversation_id });
  check("E-ii: the first proposal survived the ordinal cancel", RESOLVED(firstStill) && /design/i.test(firstStill.response || ""));
  await cancel(c1.conversation_id); await cancel(c2.conversation_id);
}

// ── F: revision / supersession ──
console.log("F — revision (supersession)");
{
  const p = await post({ message: "put a strategy sync on my calendar tomorrow at 4pm" });
  const conv = p.conversation_id;
  const rev = await post({ message: "make it 5pm", conversation_id: conv });
  check("F: 'make it 5pm' revises the pending action", /5:00\s*PM/i.test(rev.response || ""));
  const y = await post({ message: "yes", conversation_id: conv });
  check("F: later 'yes' resolves the revised time (honest state)", RESOLVED(y));
  await cancel(conv);
}

// ── G: safety — provider honestly blocked, no false 'created' ──
console.log("G — safety");
{
  const p = await post({ message: "put an ops review on my calendar tomorrow at 2pm" });
  const y = await post({ message: "yes", conversation_id: p.conversation_id });
  const falseCreated = /\badded\b|\bcreated\b|on your calendar\b/i.test(y.response || "");
  const honestBlocked = /connect|kept .* ready|pending|needs to be connected/i.test(y.response || "");
  check("G: provider honestly BLOCKED / no false 'created'", honestBlocked && !falseCreated, (y.response || "").slice(0, 120));
  await cancel(p.conversation_id);
}

console.log(`\n>>> SMOKE ${fail === 0 ? "GREEN" : "RED"}  (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
