// FILE: useOtzarVoiceIntent.ts
// PURPOSE: TanStack-Query-style wrapper around the Foundation
//          voice-intent endpoint (POST /api/v1/otzar/my-twin/
//          voice-intents). Holds the latest response + processing
//          state so the AmbientOtzarBar can render listening /
//          processing / speaking / approval / collaboration UI
//          without re-implementing the API call every place.
//
// PRIVACY INVARIANT:
//   - Only `transcript_text` (string) crosses the HTTP boundary.
//     The hook NEVER touches raw audio.
//   - Foundation's response shape already excludes chain-of-thought
//     and raw memory; we surface it as-is.

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import type { VoiceIntentResponse } from "@/lib/types/foundation";

export interface OtzarVoiceIntentHook {
  /** Latest Foundation response, or null until first send. */
  response: VoiceIntentResponse | null;
  /** True while the in-flight request is open. */
  processing: boolean;
  /** Closed-vocab error code from the last failure, or null. */
  error: string | null;
  /** Send a transcript / typed message to Foundation. */
  send: (
    text: string,
    options?: { conversation_id?: string },
  ) => Promise<VoiceIntentResponse | null>;
  /** Wipe the held response + error. */
  reset: () => void;
}

export function useOtzarVoiceIntent(): OtzarVoiceIntentHook {
  const [response, setResponse] = useState<VoiceIntentResponse | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (
      text: string,
      options: { conversation_id?: string } = {},
    ): Promise<VoiceIntentResponse | null> => {
      const trimmed = text.trim();
      if (trimmed.length === 0) return null;
      setProcessing(true);
      setError(null);
      const body = {
        transcript_text: trimmed,
        ...(options.conversation_id !== undefined
          ? { conversation_id: options.conversation_id }
          : {}),
      };
      try {
        const result = await api.otzar.voiceIntents.create(body);
        if (result.ok) {
          setResponse(result.data);
          return result.data;
        }
        setError(result.code);
        return null;
      } catch (err) {
        setError(err instanceof Error ? err.message : "UNKNOWN_ERROR");
        return null;
      } finally {
        setProcessing(false);
      }
    },
    [],
  );

  const reset = useCallback((): void => {
    setResponse(null);
    setError(null);
  }, []);

  return { response, processing, error, send, reset };
}
