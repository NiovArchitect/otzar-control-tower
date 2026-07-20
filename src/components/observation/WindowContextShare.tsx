// FILE: WindowContextShare.tsx
// PURPOSE: D-04 — explicit selected-window share (getDisplayMedia).
//          Visible active indicator; stop discards tracks; no silent capture.
// CONNECTS TO: MyMemory, window-context-session, desktop-capabilities.

import { useEffect, useRef, useState } from "react";
import { MonitorSmartphone, Square } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  WINDOW_CONTEXT_NEVER,
  WINDOW_CONTEXT_PROMISE,
  activateWindowShare,
  endWindowShare,
  failWindowShare,
  hasDisplayMedia,
  initialWindowContextSession,
  type WindowContextSession,
} from "@/lib/observation/window-context-session";

function scopeFromTrack(track: MediaStreamTrack): string {
  const settings = track.getSettings() as MediaTrackSettings & {
    displaySurface?: string;
  };
  const surface = settings.displaySurface;
  if (surface === "window") return "Selected window";
  if (surface === "browser") return "Selected browser tab";
  if (surface === "monitor") return "Selected screen (you chose this surface)";
  return "Selected surface";
}

export function WindowContextShare(): JSX.Element {
  const [session, setSession] = useState<WindowContextSession>(() =>
    initialWindowContextSession(hasDisplayMedia()),
  );
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    return () => {
      // Unmount safety — never leave a live track after leave.
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  async function startShare(): Promise<void> {
    if (!hasDisplayMedia()) {
      setSession((s) => failWindowShare(s, "This browser cannot share a window."));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.addEventListener("ended", () => {
          // User stopped from browser UI
          streamRef.current = null;
          if (videoRef.current) videoRef.current.srcObject = null;
          setSession((s) => endWindowShare(s));
        });
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => undefined);
      }
      setSession((s) =>
        activateWindowShare(s, {
          scopeLabel: track ? scopeFromTrack(track) : "Selected surface",
        }),
      );
    } catch (e) {
      const msg =
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Permission denied — nothing was shared."
          : e instanceof Error
            ? e.message
            : "Could not start window share.";
      setSession((s) => failWindowShare(s, msg));
    }
  }

  function stopShare(): void {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setSession((s) => endWindowShare(s));
  }

  return (
    <Card data-testid="window-context-share">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
          <MonitorSmartphone className="h-4 w-4" aria-hidden />
          Show Otzar a window
          {session.indicatorVisible ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-400/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900"
              data-testid="window-context-active-indicator"
              role="status"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-600" />
              Sharing live · {session.scopeLabel ?? "selected"}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <p className="text-muted-foreground" data-testid="window-context-promise">
          {WINDOW_CONTEXT_PROMISE}
        </p>
        <ul
          className="list-inside list-disc text-muted-foreground"
          data-testid="window-context-never"
        >
          {WINDOW_CONTEXT_NEVER.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        {session.state === "unsupported" ? (
          <p className="text-amber-800" data-testid="window-context-unsupported">
            This browser cannot open a window-share picker. Paste text into
            Observe instead — Otzar never captures without a visible share.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {session.state !== "active" ? (
              <Button
                type="button"
                size="sm"
                onClick={() => void startShare()}
                data-testid="window-context-start"
              >
                Choose a window…
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => stopShare()}
                data-testid="window-context-stop"
              >
                <Square className="mr-1 h-3 w-3" aria-hidden />
                Stop sharing
              </Button>
            )}
          </div>
        )}

        {session.lastError ? (
          <p className="text-rose-700" data-testid="window-context-error">
            {session.lastError}
          </p>
        ) : null}

        {session.state === "ended" ? (
          <p className="text-muted-foreground" data-testid="window-context-ended">
            Share ended. Preview frames were discarded — nothing is stored from
            this session.
          </p>
        ) : null}

        {/* Local preview only while active — not uploaded. */}
        <video
          ref={videoRef}
          muted
          playsInline
          className={
            session.state === "active"
              ? "mt-1 max-h-40 w-full rounded-lg border border-border bg-black/80 object-contain"
              : "hidden"
          }
          data-testid="window-context-preview"
        />
      </CardContent>
    </Card>
  );
}
