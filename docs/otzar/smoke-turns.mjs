// Live proof of P5 Stage 1 durable-turn wiring on the deployed smoke org.
// API side proves retry-replay; the DB side proves durable turns + identity.
// Run from the FND repo with: node --require dotenv/config --import tsx <this> (needs prod DB + SP).
import { PrismaClient } from "@prisma/client";
const SP = process.env.SP, API = "https://api.otzar.ai/api/v1";
if (!SP) { console.log("missing SP"); process.exit(2); }
const H = (t) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });

const lj = await (await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "smoke-admin@niovlabs.com", password: SP, requested_operations: ["read", "write"] }) })).json();
const token = lj.token; if (!token) { console.log("login failed"); process.exit(1); }
const post = (b) => fetch(`${API}/otzar/conversation/message`, { method: "POST", headers: H(token), body: JSON.stringify(b) }).then(r => r.json());
let pass = 0, fail = 0;
const check = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? "  — " + x : ""}`); c ? pass++ : fail++; };

const R1 = `smoke-turn-${Date.now()}-a`;
const R2 = `smoke-turn-${Date.now()}-b`;

// Turn 1: propose (no conversation_id) with request_id R1.
const t1 = await post({ message: "Put on my calendar that tomorrow at 2pm I'll be at the turn-proof review.", request_id: R1 });
const conv = t1.conversation_id;
check("propose returns a conversation_id", typeof conv === "string" && conv.length > 0, conv);
check("propose is action_proposed", t1.action_proposed === true);

// Retry Turn 1: same request_id + same conversation_id → replay (no re-processing).
const t1b = await post({ message: "Put on my calendar that tomorrow at 2pm I'll be at the turn-proof review.", request_id: R1, conversation_id: conv });
check("retry (same request_id) replays the identical response", t1b.response === t1.response);

// Turn 2: 'yes' with request_id R2.
const t2 = await post({ message: "yes", request_id: R2, conversation_id: conv });
check("'yes' resolves (honest state)", /connect|calendar|added|kept|review/i.test(t2.response || ""));

// Clean up the pending proposal.
await post({ message: "no", conversation_id: conv });

// ── DB proof ──
const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL, log: ["error"] });
try {
  const turns = await prisma.otzarConversationTurn.findMany({ where: { conversation_id: conv }, orderBy: { sequence: "asc" } });
  const users = turns.filter((t) => t.role === "USER");
  const asst = turns.filter((t) => t.role === "ASSISTANT");
  console.log(`  turns: ${turns.map((t) => `${t.sequence}:${t.role}`).join(" ")}`);
  // R1 submitted twice (retry) but must yield exactly ONE user turn; each logical
  // submission (R1 propose, R2 yes, plus the cleanup 'no') has one user + one assistant.
  const r1Users = turns.filter((t) => t.request_id === R1);
  check("R1 (submitted twice) produced exactly ONE user turn (idempotent)", r1Users.length === 1, `${r1Users.length}`);
  check("every USER turn has subject=author (human authored)", users.every((t) => t.subject_entity_id === t.author_entity_id));
  check("every ASSISTANT turn author != subject (Twin authored)", asst.length > 0 && asst.every((t) => t.author_entity_id !== t.subject_entity_id));
  check("sequences are contiguous 1..N", turns.every((t, i) => t.sequence === i + 1));
  check("org_entity_id set (non-null) on every turn", turns.every((t) => t.org_entity_id));
  // Residue: redact this smoke conversation's turns.
  await prisma.otzarConversationTurn.deleteMany({ where: { conversation_id: conv } });
  await prisma.otzarConversation.deleteMany({ where: { conversation_id: conv } });
  console.log("  (smoke turn residue removed)");
} finally { await prisma.$disconnect(); }

console.log(`\n>>> TURN SMOKE ${fail === 0 ? "GREEN" : "RED"}  (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
