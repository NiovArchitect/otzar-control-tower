/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Canonical Foundation API base URL (e.g. https://api.example.com/api/v1). */
  readonly VITE_FOUNDATION_API_URL?: string;
  /** [OTZAR-V1-LIVE-1B] Backward-compatible fallback for VITE_FOUNDATION_API_URL. */
  readonly VITE_API_BASE_URL?: string;
  /** [OTZAR-V1-LIVE-1B] "true" reveals placeholder (comingSoon) nav entries. */
  readonly VITE_SHOW_COMING_SOON?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
