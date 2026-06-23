// FILE: work-context.ts
// PURPOSE: Phase 2.6 — Work Context Resolution Seed. The orb must understand
//          WHAT work the words reference, not just route them. When a user says
//          "validate what I received", "review this client note", "summarize the
//          transcript", Otzar must recover the referenced OBJECT from available
//          context BEFORE acting — so it never creates a CONTEXTLESS artifact.
//          Search context first; ask one focused question only if nothing
//          resolves. The user sees only the calm outcome.
//
// SCOPE (seed): resolves deictic references against LIVE, read-scoped sources
//   the employee already has — the inbox (latest received message) and recent
//   conversation-derived artifacts (meeting/transcript capture). References to
//   objects with no available source yet (client note / document) honestly fall
//   to ONE focused clarification rather than a pretend attach. Expansion path:
//   current-thread / project / uploaded-document / screen context add as typed
//   sources land. Never fabricates a reference, never exposes unauthorized data.
// CONNECTS TO: AmbientOtzarBar (self + collaboration executors), api.notifications,
//          api.workOs.commsRecentArtifacts, tests/unit/work-context.test.ts.

import { api } from "@/lib/api";
import type { CurrentSurfaceContext } from "@/lib/stores/current-surface-context";

export type WorkContextType =
  | "message"
  | "notification"
  | "thread"
  | "meeting"
  | "transcript"
  | "document"
  | "client_note"
  | "project"
  | "task"
  | "approval"
  | "work_item"
  | "calendar_event"
  // Phase 2.9 — explicitly-provided current-surface context.
  | "selected_text"
  | "current_surface"
  | "unknown";

export interface WorkContextRef {
  referenceText: string;
  resolved: boolean;
  confidence: number;
  contextType: WorkContextType;
  contextId?: string;
  displayName?: string;
  summary?: string;
  owner?: string;
  participants?: string[];
  sourceSurface?: string;
  allowedByPolicy: boolean;
  needsClarification: boolean;
  clarificationQuestion?: string;
}

interface DetectedReference {
  referenceText: string;
  expectedType: WorkContextType;
  // The single focused question to ask if the object can't be resolved.
  clarificationQuestion: string;
}

// WHAT: Detect a deictic / placeholder reference that points at a concrete work
//        object the user did NOT name ("what I received", "this client note",
//        "the transcript", "this meeting"). A NAMED object ("the Q3 budget") is
//        not deictic — it carries its own context, so we return null and let the
//        send proceed. Returns null when there is no unresolved reference.
export function detectWorkReference(text: string): DetectedReference | null {
  const t = text.toLowerCase();

  // Received things → a message / notification in the caller's inbox.
  const received =
    t.match(/\bwhat (?:i|he|she|they|you) (?:received|got|was sent)\b/) ??
    t.match(/\bthe (?:latest|last|recent|new) (?:message|notification|email)\b/) ??
    t.match(/\bthe (?:thing|message|note) (?:\w+ )?(?:sent|shared)(?: me| with me)?\b/);
  if (received !== null) {
    return {
      referenceText: received[0],
      expectedType: "notification",
      clarificationQuestion:
        "I'm missing what you're referring to — do you mean the latest message in your inbox?",
    };
  }

  // Transcript.
  const transcript = t.match(/\b(?:this|that|the) transcript\b/);
  if (transcript !== null) {
    return {
      referenceText: transcript[0],
      expectedType: "transcript",
      clarificationQuestion: "Which transcript should I use?",
    };
  }

  // Meeting.
  const meeting = t.match(/\b(?:this|that|the|today'?s|the recent) meeting\b/);
  if (meeting !== null) {
    return {
      referenceText: meeting[0],
      expectedType: "meeting",
      clarificationQuestion: "Which meeting do you mean?",
    };
  }

  // Client note.
  const clientNote = t.match(/\b(?:this|that|the) (?:client )?note\b/);
  if (clientNote !== null) {
    return {
      referenceText: clientNote[0],
      expectedType: "client_note",
      clarificationQuestion: "Which client note should I attach?",
    };
  }

  // Document.
  const doc = t.match(/\b(?:this|that|the) (?:document|doc|file|deck)\b/);
  if (doc !== null) {
    return {
      referenceText: doc[0],
      expectedType: "document",
      clarificationQuestion: "Which document should I attach?",
    };
  }

  return null;
}

// WHAT: A bare/generic deictic ("use this", "review this", "summarize that",
//        "current context", "what I'm looking at", "what I selected") that
//        points at the CURRENT surface the user is working on, rather than a
//        typed object like the inbox or a transcript.
export function isGenericDeictic(text: string): boolean {
  const t = text.toLowerCase();
  if (/\b(current context|what i'?m looking at|what i selected)\b/.test(t)) {
    return true;
  }
  if (
    /\b(?:review|summari[sz]e|use|attach|send|share|check|validate|confirm|prepare|approve|look at|follow up on)\s+(?:this|that|it)\b/.test(
      t,
    )
  ) {
    return true;
  }
  // A bare deictic object trailing the clause ("…about this.", "…on it?").
  return /\b(?:this|that|it)\b[.?!]?\s*$/.test(t);
}

// WHAT: Project the explicitly-provided current-surface context into a resolved
//        WorkContextRef so it attaches/links exactly like an inbox/meeting ref.
function currentToWorkContext(
  ctx: CurrentSurfaceContext,
  referenceText: string,
): WorkContextRef {
  const display = ctx.title ?? ctx.summary ?? ctx.text ?? "the current context";
  return {
    referenceText,
    resolved: true,
    confidence: 0.8,
    contextType: ctx.type,
    contextId: ctx.id,
    displayName: display,
    ...(ctx.summary !== undefined
      ? { summary: ctx.summary }
      : ctx.text !== undefined
        ? { summary: ctx.text }
        : {}),
    sourceSurface: "current_surface",
    allowedByPolicy: true,
    needsClarification: false,
  };
}

// WHAT: Resolve a referenced work object from available context.
// INPUT: the work text + the EXPLICIT current-surface context, if the user
//        provided one.
// OUTPUT: a WorkContextRef when the text REFERENCES an object — resolved or
//         needing one focused clarification. Returns null when the text
//         references nothing deictic (caller proceeds as normal).
// ORDER: explicit current-surface context wins for a generic deictic (and for a
//        typed deictic whose type it matches) — PRD-04: resolve "this" from what
//        the user is looking at BEFORE inbox / recent artifacts / asking.
export async function resolveWorkContext(
  text: string,
  currentContext?: CurrentSurfaceContext | null,
): Promise<WorkContextRef | null> {
  const ref = detectWorkReference(text);
  const generic = ref === null && isGenericDeictic(text);
  const active =
    currentContext !== undefined &&
    currentContext !== null &&
    currentContext.active
      ? currentContext
      : null;

  // 1) Explicit current-surface context: wins for a generic deictic, and for a
  //    typed reference whose type it matches (e.g. a provided transcript). A
  //    generic provided selection/surface also satisfies a deictic typed ref
  //    ("this transcript", "this client note") — the user provided the thing
  //    they're pointing at — EXCEPT the inbox-specific "what I received" /
  //    "latest message", which always means the actual inbox.
  if (active !== null) {
    if (generic) return currentToWorkContext(active, "this");
    if (ref !== null) {
      const surfaceSatisfies =
        (active.type === "selected_text" || active.type === "current_surface") &&
        ref.expectedType !== "notification" &&
        ref.expectedType !== "message";
      if (ref.expectedType === active.type || surfaceSatisfies) {
        return currentToWorkContext(active, ref.referenceText);
      }
    }
  }

  // 2) A generic deictic with no active context → ask what to use. Never reuse
  //    stale context, never a contextless artifact.
  if (ref === null) {
    if (generic) {
      return {
        referenceText: "this",
        resolved: false,
        confidence: 0,
        contextType: "unknown",
        allowedByPolicy: true,
        needsClarification: true,
        clarificationQuestion: "What should I use as the current context?",
      };
    }
    return null;
  }

  // Received message / notification → the caller's own inbox (read-scoped).
  if (ref.expectedType === "notification" || ref.expectedType === "message") {
    const res = await api.notifications.list({ page_size: 5 });
    const latest = res.ok ? res.data.notifications[0] : undefined;
    if (latest !== undefined) {
      return {
        referenceText: ref.referenceText,
        resolved: true,
        confidence: 0.7,
        contextType: "notification",
        contextId: latest.notification_id,
        displayName: latest.body_summary,
        summary: latest.body_summary,
        ...(latest.sender?.display_name !== undefined
          ? { owner: latest.sender.display_name }
          : {}),
        sourceSurface: "inbox",
        allowedByPolicy: true,
        needsClarification: false,
      };
    }
  }

  // Transcript / meeting → recent conversation-derived meeting capture.
  if (ref.expectedType === "transcript" || ref.expectedType === "meeting") {
    const res = await api.workOs.commsRecentArtifacts();
    const artifacts = res.ok ? (res.data.artifacts ?? []) : [];
    const capture = artifacts.find((a) => a.artifact_type === "MEETING_CAPTURE");
    if (capture !== undefined) {
      return {
        referenceText: ref.referenceText,
        resolved: true,
        confidence: 0.65,
        contextType: ref.expectedType,
        contextId: capture.artifact_id,
        displayName: capture.title,
        ...(capture.summary !== null ? { summary: capture.summary } : {}),
        ...(capture.related_person?.display_name !== undefined
          ? { owner: capture.related_person.display_name }
          : {}),
        sourceSurface: "comms",
        allowedByPolicy: true,
        needsClarification: false,
      };
    }
  }

  // Referenced an object we can't resolve from available context yet
  // (client note / document, or an empty inbox / no capture) → ONE focused
  // clarification. Never a pretend attach, never a contextless artifact.
  return {
    referenceText: ref.referenceText,
    resolved: false,
    confidence: 0,
    contextType: ref.expectedType,
    allowedByPolicy: true,
    needsClarification: true,
    clarificationQuestion: ref.clarificationQuestion,
  };
}

// WHAT: A short human label for a resolved context, used in confirmations
//        ("…linked to the message you received from Sadeil"). Human words only.
export function contextLabel(ctx: WorkContextRef): string {
  const from = ctx.owner !== undefined ? ` from ${ctx.owner}` : "";
  switch (ctx.contextType) {
    case "notification":
    case "message":
      return `the message you received${from}`;
    case "transcript":
      return `the transcript${from}`;
    case "meeting":
      return `the meeting${from}`;
    case "client_note":
      return "the client note";
    case "document":
      return "the document";
    case "selected_text":
    case "current_surface":
      return "the current context";
    default:
      return "the related work";
  }
}
