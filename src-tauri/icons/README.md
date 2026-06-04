# Otzar Desktop Icons

Tauri expects an `icon.png` (Linux + base) and platform-specific
icons (`icon.icns` for macOS, `icon.ico` for Windows). Placeholder
generation:

```sh
# Install once
cargo install tauri-cli --version "^2.0.0"

# Generate from a 1024x1024 source
cargo tauri icon path/to/source-1024.png
```

Production icons must be supplied by the Founder. Do NOT commit
draft / unbranded icons. The bundle target list in
`tauri.conf.json` will fail until `icon.png` (and platform-specific
variants for `dmg` + `msi` + `nsis` targets) are present.
