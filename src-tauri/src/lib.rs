// Otzar desktop library entry — the function `main.rs` invokes.
//
// Kept as a thin runtime so the desktop shell stays close to the
// shipping web Control Tower. Adding native commands here is gated
// on Founder authorization per RULE 20 (RULES + ADRs only the
// Founder may modify) — a "this command bypasses the Foundation
// API" surface needs explicit prior authorization.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running otzar tauri application");
}
