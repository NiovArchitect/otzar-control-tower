// Otzar desktop entry point.
//
// This is the thinnest possible Tauri shell. The actual UI is the
// existing Control Tower SPA (built by `npm run build` into ../dist).
// The desktop runtime is a webview wrapping that bundle.
//
// We deliberately do NOT add native commands that bypass the
// Foundation API. Per the Otzar Domain General Intelligence Doctrine
// (ADR-0052) + the [FOUNDER-AUTH — FULL DEPLOYED RUNTIMES] directive:
//
// - The desktop shell talks to Foundation over HTTP exactly like the
//   web Control Tower does.
// - No local secret storage; OS keychain integration is forward-substrate.
// - No connector writes from the shell; every connector call goes
//   through the Foundation API where the policy stack lives.
// - No raw memory / chain-of-thought / surveillance UI.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    otzar_desktop_lib::run()
}
