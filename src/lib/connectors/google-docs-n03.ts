// FILE: google-docs-n03.ts
// PURPOSE: N-03 — Google Docs non-empty create + append + edit detection
//          helpers (pure). Ensures create never ships empty bodies; append
//          is material; session can report "edit detected" after append.
// CONNECTS TO: api.connectorData.googleDocCreate/Append, AmbientWorkSurface.

/** Minimum body length for a non-empty create (Foundation rejects empty append). */
export const MIN_NONEMPTY_BODY_CHARS = 24;

export interface WorkingDocSession {
  documentId: string;
  title: string;
  webViewLink: string | null;
  /** Body used at create (non-empty). */
  createdBodyChars: number;
  /** Cumulative appended chars this session. */
  appendedChars: number;
  /** True after at least one successful append (material edit). */
  editDetected: boolean;
  lastAppendAt: string | null;
}

export function isNonEmptyDocBody(text: string): boolean {
  return text.trim().length >= MIN_NONEMPTY_BODY_CHARS;
}

/** Default create body — always non-empty for N-03. */
export function defaultWorkingDocBody(dayIso: string): string {
  return (
    `Working notes · ${dayIso}\n\n` +
    "Started from Otzar Today.\n" +
    "Capture owners, decisions, and next steps here.\n" +
    "This document is non-empty by design so create never yields a blank page."
  );
}

export function buildCreateBody(input: {
  title: string;
  bodyText?: string;
  dayIso: string;
}): { title: string; body_text: string; nonEmpty: true } | { error: "EMPTY_BODY" } {
  const title = input.title.trim();
  const body =
    input.bodyText !== undefined && input.bodyText.trim().length > 0
      ? input.bodyText.trim()
      : defaultWorkingDocBody(input.dayIso);
  if (!isNonEmptyDocBody(body)) return { error: "EMPTY_BODY" };
  return { title: title.length > 0 ? title : `Working notes · ${input.dayIso}`, body_text: body, nonEmpty: true };
}

export function defaultAppendMaterial(atIso: string): string {
  return `Otzar material update at ${atIso} — owners/decisions checkpoint.`;
}

export function sessionAfterCreate(args: {
  documentId: string;
  title: string;
  webViewLink: string | null;
  bodyChars: number;
}): WorkingDocSession {
  return {
    documentId: args.documentId,
    title: args.title,
    webViewLink: args.webViewLink,
    createdBodyChars: args.bodyChars,
    appendedChars: 0,
    editDetected: false,
    lastAppendAt: null,
  };
}

export function sessionAfterAppend(
  prev: WorkingDocSession,
  bodyCharCount: number,
  atIso: string,
): WorkingDocSession {
  return {
    ...prev,
    appendedChars: prev.appendedChars + Math.max(0, bodyCharCount),
    editDetected: true,
    lastAppendAt: atIso,
  };
}

/** Honest label for edit-detection UI. */
export function editDetectionLabel(session: WorkingDocSession): string {
  if (session.editDetected) {
    return `Edit detected — ${session.appendedChars} chars appended this session.`;
  }
  if (session.createdBodyChars > 0) {
    return "Created non-empty. Append a material change to prove edit detection.";
  }
  return "No document session yet.";
}
