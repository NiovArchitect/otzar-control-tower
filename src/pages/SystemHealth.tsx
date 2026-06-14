// FILE: SystemHealth.tsx
// PURPOSE: Phase 1256A — real System Health: live platform status
//          (API + database), runtime/provider rows from the
//          readiness aggregate (humanized, honest), and the desktop
//          voice substrate row (shell mode + native microphone
//          capability — Phase 1256A bridge). Honest empty/error
//          states; no jargon; every blocked row says what fixes it.
// CONNECTS TO: api.platform.health, api.otzar.productionReadiness,
//          src/lib/voice/native-mic.ts, src/lib/voice/diagnostics
//          (shell mode), src/lib/desktop-capabilities.ts (Phase
//          1259C honest capability report), Command Center.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Laptop, Mic2, Server } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { humanizeStatus } from "@/lib/labels/humanize";
import { detectShellMode } from "@/lib/voice/diagnostics";
import {
  detectNativeMicCapability,
  nativeMicCopy,
  type NativeMicStatus,
} from "@/lib/voice/native-mic";
import {
  capabilityStatusCopy,
  getDesktopCapabilities,
} from "@/lib/desktop-capabilities";
import type {
  HandoffReadinessResponse,
  PlatformHealth,
  RuntimeCapabilitiesResponse,
} from "@/lib/types/foundation";

export function SystemHealthPage(): JSX.Element {
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [healthFailed, setHealthFailed] = useState(false);
  const [runtimes, setRuntimes] = useState<
    HandoffReadinessResponse["readiness"]["runtimes"]
  >([]);
  const [nativeMic, setNativeMic] = useState<NativeMicStatus | null>(null);
  const [fabric, setFabric] = useState<
    RuntimeCapabilitiesResponse["runtimes"] | null
  >(null);
  const shell = detectShellMode();
  const capabilities = getDesktopCapabilities();

  useEffect(() => {
    let cancelled = false;
    api.platform
      .health()
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setHealth(r.data);
        else setHealthFailed(true);
      })
      .catch(() => {
        if (!cancelled) setHealthFailed(true);
      });
    api.otzar
      .productionReadiness()
      .then((r) => {
        if (!cancelled && r.ok) setRuntimes(r.data.readiness.runtimes);
      })
      .catch(() => {
        /* admin-gated; stays honest-empty */
      });
    void detectNativeMicCapability().then((cap) => {
      if (!cancelled) setNativeMic(cap.status);
    });
    api.system
      .runtimeCapabilities()
      .then((r) => {
        if (!cancelled && r.ok) setFabric(r.data.runtimes);
      })
      .catch(() => {
        /* stays honest-empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5" data-testid="system-health-page">
      <PageHeader
        title="System Health"
        description="The live operational truth: platform, runtimes, providers, and the desktop voice substrate — with what fixes each blocked item."
      />

      <Card data-testid="system-health-platform">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Server className="h-4 w-4" aria-hidden /> Platform
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs">
          {healthFailed ? (
            <p className="text-muted-foreground">
              Couldn't reach the platform just now — refresh to try again.
            </p>
          ) : health === null ? (
            <p className="text-muted-foreground">Checking…</p>
          ) : (
            <>
              <p>
                Service:{" "}
                <Badge variant="outline" className="text-[9px]">
                  Online · v{health.version}
                </Badge>
              </p>
              <p>
                Database:{" "}
                <Badge variant="outline" className="text-[9px]">
                  {health.database === "connected"
                    ? "Connected"
                    : "Attention needed"}
                </Badge>
              </p>
              <p className="text-muted-foreground">
                Last check: {new Date(health.timestamp).toLocaleTimeString()}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card data-testid="system-health-runtime-fabric">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" aria-hidden /> Runtime Fabric
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {fabric === null ? (
            <p className="text-muted-foreground">Checking runtimes…</p>
          ) : (
            <>
              {(
                [
                  ["Foundation API (governance)", fabric.typescript_api],
                  ["Python Intelligence Worker", fabric.python_worker],
                  ["BEAM Coordination Fabric", fabric.beam_fabric],
                  ["Desktop Native", fabric.desktop_native],
                  ["Queue / Event Bus", fabric.queue_event_bus],
                ] as const
              ).map(([label, rt]) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{label}</div>
                    <div className="text-[10px] text-muted-foreground line-clamp-2">
                      {rt.note}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[9px]">
                    {rt.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
              <p
                className="pt-1 text-[10px] text-muted-foreground"
                data-testid="runtime-fabric-fallback"
              >
                {fabric.fallback_active
                  ? "Fallback active: Foundation's deterministic TypeScript path is serving intelligence/coordination where Python/BEAM are unavailable."
                  : "All configured runtimes healthy."}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card data-testid="system-health-runtimes">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" aria-hidden /> Runtimes &amp;
            providers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {runtimes.length === 0 ? (
            <p className="text-muted-foreground">
              Runtime detail loads from the readiness check (admin access
              required).
            </p>
          ) : (
            runtimes.map((rt) => (
              <div
                key={rt.runtime}
                className="flex items-center justify-between rounded-xl border border-border/70 p-2.5"
                data-testid="system-health-runtime-row"
              >
                <span>
                  <span className="text-foreground">{rt.runtime}</span>{" "}
                  <span className="text-muted-foreground">— {rt.note}</span>
                </span>
                <Badge variant="outline" className="text-[9px]">
                  {humanizeStatus(rt.status)}
                </Badge>
              </div>
            ))
          )}
          <Link
            to="/connector-rails"
            className="flex items-center justify-between rounded-xl border border-border/70 p-2.5 hover:border-primary/40"
          >
            <span className="text-foreground">
              Fix anything blocked — open Integrations
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </Link>
        </CardContent>
      </Card>

      <Card data-testid="system-health-desktop-voice">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Mic2 className="h-4 w-4" aria-hidden /> Desktop voice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs">
          <p>
            Shell:{" "}
            <Badge variant="outline" className="text-[9px]">
              {shell === "tauri_webview" ? "Otzar desktop app" : "Browser"}
            </Badge>
          </p>
          <p
            data-testid="system-health-native-mic"
            data-status={nativeMic ?? ""}
          >
            Microphone:{" "}
            <span className="text-muted-foreground">
              {nativeMic === null ? "Checking…" : nativeMicCopy(nativeMic)}
            </span>
          </p>
          <p className="text-muted-foreground">
            Typing always works and rides the same command layer as voice.
          </p>
        </CardContent>
      </Card>

      <Card data-testid="system-health-desktop-capabilities">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Laptop className="h-4 w-4" aria-hidden /> Desktop capabilities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {capabilities.map((cap) => (
            <div
              key={cap.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-border/70 p-2.5"
              data-testid="system-health-capability-row"
              data-capability={cap.id}
              data-status={cap.status}
            >
              <span>
                <span className="text-foreground">{cap.label}</span>{" "}
                <span className="text-muted-foreground">— {cap.note}</span>
              </span>
              <Badge variant="outline" className="shrink-0 text-[9px]">
                {capabilityStatusCopy[cap.status]}
              </Badge>
            </div>
          ))}
          <p className="text-muted-foreground">
            Each row is the live truth for this install — nothing shows as
            working unless the runtime path actually exists.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
