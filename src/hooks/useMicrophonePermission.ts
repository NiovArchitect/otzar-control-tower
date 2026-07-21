// FILE: useMicrophonePermission.ts
// PURPOSE: Shared microphone permission across Talk bar + Voice page
//          (RC2 VOX-2). One state, one request path; grant once.
// PRIVACY: getUserMedia only to prompt; tracks stopped immediately unless
//          a long-lived stream is held by mic-permission.ts owner.
// CONNECTS TO: AmbientOtzarBar, Voice.tsx, lib/voice/mic-permission.ts.

import { useCallback, useEffect, useState } from "react";
import {
  ensureMicAccess,
  getMicPermissionState,
  refreshMicPermissionFromBrowser,
  releaseMicStream,
  subscribeMicPermission,
  type MicPermissionState,
} from "@/lib/voice/mic-permission";

export type MicrophonePermissionState =
  | "unknown"
  | "prompt"
  | "granted"
  | "denied"
  | "unsupported";

function mapState(s: MicPermissionState): MicrophonePermissionState {
  if (s === "blocked" || s === "denied") return "denied";
  if (s === "no_device" || s === "in_use" || s === "insecure") return "denied";
  if (s === "unsupported") return "unsupported";
  if (s === "granted") return "granted";
  if (s === "prompt") return "prompt";
  return "unknown";
}

export interface MicrophonePermissionHook {
  state: MicrophonePermissionState;
  requesting: boolean;
  request: () => Promise<MicrophonePermissionState>;
  refresh: () => Promise<void>;
}

export function useMicrophonePermission(): MicrophonePermissionHook {
  const [state, setState] = useState<MicrophonePermissionState>(() =>
    mapState(getMicPermissionState()),
  );
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    return subscribeMicPermission((s) => setState(mapState(s)));
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    const next = await refreshMicPermissionFromBrowser();
    setState(mapState(next));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const request = useCallback(async (): Promise<MicrophonePermissionState> => {
    setRequesting(true);
    try {
      const r = await ensureMicAccess();
      // Permission only — stop tracks so the mic indicator does not stay lit.
      // Shared grant state remains "granted" for Talk bar + Voice page.
      releaseMicStream();
      const mapped = mapState(r.state);
      setState(mapped);
      return mapped;
    } finally {
      setRequesting(false);
    }
  }, []);

  return { state, requesting, request, refresh };
}
