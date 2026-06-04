# Otzar Desktop Shell (Tauri)

The Otzar desktop shell wraps the existing Control Tower web SPA in a
native window. Tauri chosen over Electron per the Founder directive
section "DESKTOP DECISION — TAURI FIRST" because:

- Otzar's desktop product should feel lightweight, ambient, secure,
  and edge-native
- Tauri builds smaller, faster native shells around an existing
  frontend stack
- Rust/native command boundary is a better security posture for
  scoped local capabilities
- The web Control Tower already enforces the policy stack; the
  desktop shell adds no policy-bypassing surface

## Prerequisites

### Install Rust toolchain (once per machine)

```sh
# Recommended path — installs cargo + rustc + rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustc --version   # confirm
cargo --version   # confirm
```

### Platform tooling

**macOS:**
- Xcode Command Line Tools (`xcode-select --install`)
- The Tauri runtime uses WebKit (system-provided); no extra install

**Windows:**
- Microsoft C++ Build Tools (via Visual Studio Installer)
- WebView2 runtime (preinstalled on Windows 11; installer for Windows 10)

## Dev loop

```sh
cd otzar-control-tower
npm install                  # installs @tauri-apps/cli alongside the web deps
npm run tauri:dev            # starts Vite dev server + opens a native window
```

`npm run tauri:dev` runs Vite (`npm run dev`) and a Tauri webview that
points at `http://localhost:5173`. Hot-reload works for the web SPA.

The native window points at the Foundation API via the same
`VITE_API_BASE_URL` the web app uses. By default that is
`http://localhost:3000/api/v1` — set `VITE_API_BASE_URL` in
`.env.local` to point at a deployed Foundation instance.

## Production builds

### macOS (DMG + .app)

```sh
npm run tauri:build
# Output: src-tauri/target/release/bundle/dmg/Otzar_0.1.0_aarch64.dmg
#         src-tauri/target/release/bundle/macos/Otzar.app
```

For Apple-notarized distribution, add the signing identity + Apple
ID + app-specific password to a CI environment (forward-substrate;
the Founder authorizes the signing-cert acquisition).

### Windows (MSI + NSIS)

```sh
npm run tauri:build
# Output: src-tauri/target/release/bundle/msi/Otzar_0.1.0_x64_en-US.msi
#         src-tauri/target/release/bundle/nsis/Otzar_0.1.0_x64-setup.exe
```

Windows code-signing also forward-substrate.

## What the desktop shell does NOT do (yet)

Deliberate restraint at this slice:

- **No native commands that bypass the Foundation API.** Every call
  the desktop shell makes to NIOV substrate goes through the same
  HTTPS endpoints the web Control Tower uses.
- **No local secret storage.** Future OS-keychain integration
  (macOS Keychain / Windows Credential Manager) requires Founder
  authorization per RULE 20 + ADR-0019.
- **No system tray icon or background daemon.** Tray + deep-link
  + local notifications are forward-substrate.
- **No connector writes from the shell.** Every connector call goes
  through Foundation where the policy stack lives.
- **No mic/audio capture from the shell.** Voice paths stay in the
  Foundation `voice-ready` substrate (text-transcript only at the
  current slice).
- **No local file-system reads or writes.** The capability allowlist
  in `src-tauri/capabilities/default.json` exposes only
  `shell:allow-open` + `opener:default`.
- **No code-signing certificates in the repo.** Production signing
  certs are Founder-acquired and live in cloud-key-vaults, not in
  the repo or CI by default.

## Tauri configuration

`src-tauri/tauri.conf.json` is the canonical config:

- `identifier`: `com.niovlabs.otzar` (locked; do not edit without
  Founder authorization — bundle identifier renames break signing
  chains)
- `productName`: `Otzar`
- `app.security.csp`: tight CSP allowing `connect-src` to localhost
  and the production Foundation API hostname
- `bundle.targets`: `app`, `dmg`, `msi`, `nsis`

## Capability model

`src-tauri/capabilities/default.json` enumerates the Tauri permissions
the shell uses:

| Permission | What it allows |
|---|---|
| `core:default` | Tauri core (window control, app metadata) |
| `shell:allow-open` | Open external URLs in the user's default browser |
| `opener:default` | Open files/URLs via OS handlers |

Adding new permissions REQUIRES Founder authorization per RULE 20 —
each new capability is a potential security surface expansion.

## CI builds

GitHub Actions desktop-build workflow is forward-substrate. When it
lands, it MUST:

- Skip code-signing steps if signing certs are not configured (per
  the deploy-staging.yml graceful-skip pattern from Foundation #295)
- Build macOS x86_64 + arm64 + universal binary
- Build Windows x64
- Skip the publish step until the Founder authorizes a release
  channel

## When to use the desktop shell

Use the Tauri shell when an enterprise customer wants:

- Native-feeling Otzar instead of a browser tab
- OS-level shortcuts (Cmd+Tab targeting, dock icon)
- Better isolation from browser extensions
- (Forward-substrate) System tray ambient presence

Use the web Control Tower when:

- Multiple users need access on the same machine via different
  browser sessions
- IT requires browser-managed cookies / SSO redirects
- Mobile or Linux deployment is needed (the Tauri shell is currently
  macOS + Windows only)
