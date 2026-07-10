// Live smoke for Corrections #1/#2 + P4 on the deployed smoke org.
// Uses unambiguous past/future clock times relative to the real server clock.
const SP = process.env.SP, API = "https://api.otzar.ai/api/v1";
const H = (t) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });
const post = (t, body) => fetch(`${API}/otzar/conversation/message`, { method: "POST", headers: H(t), body: JSON.stringify(body) }).then(r => r.json());

const health = await (await fetch(`${API}/health`)).json();
console.log("health:", health.ok, health.database);
const lj = await (await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "smoke-admin@niovlabs.com", password: SP, requested_operations: ["read", "write"] }) })).json();
const token = lj.token; if (!token) { console.log("login failed:", JSON.stringify(lj).slice(0, 160)); process.exit(1); }
console.log("login ok\n");

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`); cond ? pass++ : fail++; };

// ── 1. Future-time propose → thread-bound "yes" resolves (C1 exact thread) ──
const t1 = await post(token, { message: "Put on my calendar that at 11pm tonight I'll be at Olivia's event." });
console.log("[propose] resp:", (t1.response || "").slice(0, 200));
const conv = t1.conversation_id;
check("propose returns a bound conversation_id", typeof conv === "string" && conv.length > 0, conv);
check("propose is action_proposed (future time, not clarify)", t1.action_proposed === true);

const t2 = await post(token, { message: "yes", conversation_id: conv });
console.log("[yes @thread] resp:", (t2.response || "").slice(0, 220));
const bad = /don'?t see|no (previous|prior) (question|context)/i.test(t2.response || "");
const good = /Olivia|calendar|connect|added/i.test(t2.response || "");
check("bare 'yes' in-thread resolves (not 'I don't see a previous question')", !bad && good);
check("'yes' echoes the same bound thread", t2.conversation_id === conv, `${t2.conversation_id}`);

// ── 2. Cross-thread 'yes' must NOT resolve (C1 negative) ──
const p2 = await post(token, { message: "put a budget review on my calendar at 10pm tonight" });
const wrong = await post(token, { message: "yes", conversation_id: "00000000-0000-4000-8000-000000000000" });
console.log("[yes @wrong-thread] resp:", (wrong.response || "").slice(0, 160));
check("'yes' from a foreign thread does NOT falsely confirm", !/added|created|done|working on it/i.test(wrong.response || ""));

// ── 3. Past-time clarification (C2) — no silent tomorrow ──
const c = await post(token, { message: "schedule a dentist appointment at 6am" });
console.log("[past-time] resp:", (c.response || "").slice(0, 220));
check("past-time asks a truthful clarification", /already passed|another time today|did you mean tomorrow/i.test(c.response || ""));
check("past-time did NOT silently propose/act", c.action_proposed !== true);

// ── 4. Supersession (P4) — 'make it 11:30pm' revises in place, then 'yes' ──
const s1 = await post(token, { message: "put a strategy sync on my calendar at 9pm tonight" });
const sconv = s1.conversation_id;
const s2 = await post(token, { message: "make it 11:30pm", conversation_id: sconv });
console.log("[revise] resp:", (s2.response || "").slice(0, 200));
check("supersession revises the pending time (mentions 11:30)", /11:30/.test(s2.response || ""));
const s3 = await post(token, { message: "yes", conversation_id: sconv });
console.log("[revise→yes] resp:", (s3.response || "").slice(0, 200));
check("revised 'yes' resolves (honest state)", /calendar|connect|added|Strategy/i.test(s3.response || ""));

console.log(`\n>>> SMOKE ${fail === 0 ? "GREEN" : "RED"}  (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
