// FILE: auth.ts
// PURPOSE: Zustand store holding the logged-in user's JWT, identity,
//          and derived TAR capabilities. Consumed by api.ts (token
//          attachment + 401 logout), AuthGuard (route protection),
//          and Layout's user pill.
//
// POSTURE — ACCESS TOKEN IN MEMORY ONLY (XSS-protected):
// - The access token lives in this store's in-memory state only.
// - NO localStorage. NO sessionStorage. NO JS-readable cookie for the token.
// - Adding localStorage/sessionStorage auth as a "small helpful improvement"
//   is a security regression -- do NOT.
// - [SECTION-16 · DONE] A page refresh is restored by restoreSession() below,
//   which calls GET /auth/me. The restore credential is a server-set HttpOnly
//   Secure SameSite=Lax cookie that JS CANNOT read (so it is NOT client-side
//   token custody); on boot the store is rehydrated in memory exactly as after
//   a login. If restore fails, the guards route to /login as before. The cookie
//   authenticates /auth/me ONLY; all API calls still use the in-memory Bearer.
//
// CAPABILITIES — derived from Foundation's allowed_operations:
// Foundation's POST /auth/login response includes
// `allowed_operations: string[]` (e.g., ["read", "write", "admin_org"]).
// Foundation's apps/api/src/services/auth.service.ts maps these via
// OPERATION_TO_CAPABILITY: "admin_org" → can_admin_org,
// "admin_niov" → can_admin_niov. We mirror that mapping here so the
// frontend never has to call a second endpoint just to read TAR
// flags. Same pattern extends to future capabilities -- adding
// "create_hives" to OPERATION_TO_CAPABILITY in Foundation means
// adding it here too.
//
// CONNECTS TO: src/lib/api.ts, src/components/AuthGuard.tsx, every
//              navigation surface that shows the logged-in user.

import { create, type StoreApi, type UseBoundStore } from "zustand";
import { api } from "../api";
import {
  bindConversationScope,
  clearConversationScope,
} from "../work-os/conversation-store";

// WHAT: TAR-derived capability flags surfaced to the UI.
// INPUT: Used as part of state shape.
// OUTPUT: None.
// WHY: Mirrors Foundation's TAR boolean shape; updates here when
//      Foundation's OPERATION_TO_CAPABILITY map adds entries.
export interface AuthCapabilities {
  // Product (employee) capabilities -- mirror Foundation's
  // OPERATION_TO_CAPABILITY: read->can_read_capsules,
  // write->can_write_capsules, share->can_share_capsules.
  can_read_capsules: boolean;
  can_write_capsules: boolean;
  can_share_capsules: boolean;
  // Org-admin capability gating the Control Tower.
  can_admin_org: boolean;
  // Present for completeness only. NEVER used to gate Otzar PRODUCT
  // access -- can_admin_niov is Console/NIOV-admin scope (see
  // src/lib/auth/capabilities.ts).
  can_admin_niov: boolean;
}

// WHAT: Identity row carried in the store after a successful login.
// INPUT: Used as part of state shape.
// OUTPUT: None.
// WHY: Used by Layout's user pill + audit-aware UI strings ("Logged
//      in as ...").
export interface AuthEntity {
  email: string;
  // Foundation's LoginResponse doesn't return entity_id today; if /auth/login is
  // extended in a future Foundation section, surface it here.
}

interface AuthState {
  token: string | null;
  entity: AuthEntity | null;
  capabilities: AuthCapabilities | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginError: string | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
}

// WHAT: Derive AuthCapabilities from Foundation's
//        allowed_operations array.
// INPUT: The string[] returned by /auth/login.
// OUTPUT: AuthCapabilities.
// WHY: See OPERATION_TO_CAPABILITY in Foundation's
//      apps/api/src/services/auth.service.ts. Centralized here so
//      the mapping stays in one place; if Foundation extends the
//      map, this function and the AuthCapabilities type both update.
export function deriveCapabilities(
  allowed_operations: string[],
): AuthCapabilities {
  return {
    can_read_capsules: allowed_operations.includes("read"),
    can_write_capsules: allowed_operations.includes("write"),
    can_share_capsules: allowed_operations.includes("share"),
    can_admin_org: allowed_operations.includes("admin_org"),
    can_admin_niov: allowed_operations.includes("admin_niov"),
  };
}

export const useAuthStore: UseBoundStore<StoreApi<AuthState>> = create<AuthState>(
  (set) => ({
    token: null,
    entity: null,
    capabilities: null,
    isAuthenticated: false,
    isLoading: false,
    loginError: null,

    login: async (
      rawEmail: string,
      password: string,
    ): Promise<{ ok: boolean; message?: string }> => {
      // Phase 1285-F — normalize email before submit (trim + lowercase) so
      // casing never gates access; the backend lookup is also case-insensitive.
      const email = rawEmail.trim().toLowerCase();
      set({ isLoading: true, loginError: null });
      const result = await api.auth.login(email, password);
      if (!result.ok) {
        // Phase 1304-B — honest, recoverable copy. A 401 on the login route is a
        // CREDENTIAL failure (INVALID_CREDENTIALS), not a dead session; SUSPENDED
        // is the 5-attempt lockout. Only genuine transport/network problems read
        // as such. Never show the alarming "SESSION_INVALID" on the login screen.
        const message =
          result.code === "INVALID_CREDENTIALS"
            ? "Incorrect email or password."
            : result.code === "SUSPENDED"
              ? "This account is locked after too many attempts. Contact your administrator."
              : result.code === "NETWORK_ERROR"
                ? "Couldn't reach the server. Check your connection and try again."
                : `Login failed (${result.code}). Try again.`;
        set({ isLoading: false, loginError: message });
        return { ok: false, message };
      }
      // Foundation's login route returns LoginResponse on success and
      // LoginFailure on credential errors -- both are in the union
      // type. Branch by `data.ok`.
      const body = result.data;
      if (!body.ok) {
        set({ isLoading: false, loginError: body.message });
        return { ok: false, message: body.message };
      }
      set({
        token: body.token,
        entity: { email },
        capabilities: deriveCapabilities(body.allowed_operations),
        isAuthenticated: true,
        isLoading: false,
        loginError: null,
      });
      // Phase 1284 P0 — bind the personal chat transcript to THIS user so a
      // different account on the same device never sees this user's chat.
      // session_id (unique per login) is the safest scope; falls back to the
      // email when present. This loads only this user's transcript.
      bindConversationScope(body.session_id ?? email);
      return { ok: true };
    },

    logout: (): void => {
      // Hide the current user's transcript before clearing identity so the
      // next account starts from an empty chat (no stale leak).
      clearConversationScope();
      set({
        token: null,
        entity: null,
        capabilities: null,
        isAuthenticated: false,
        isLoading: false,
        loginError: null,
      });
    },
  }),
);

// [SECTION-16] Boot-time session restore. Calls GET /auth/me, which sends the
// HttpOnly session cookie; on a still-valid server-side session it rehydrates
// this in-memory store — token + identity + capabilities freshly gated by the
// live Foundation TAR (a TAR change would have invalidated the session, so the
// capabilities are never stale). On ANY failure (no cookie, revoked, suspended,
// network error, timeout) it leaves the store logged out so the guards route to
// /login. It writes NOTHING to localStorage/sessionStorage/cookies — the token
// lives in memory exactly as it does after a login. Returns whether a session
// was restored. Called once, before the router renders (see SessionBootstrap).
export async function restoreSession(): Promise<boolean> {
  const result = await api.auth.me();
  if (!result.ok) return false;
  const body = result.data;
  useAuthStore.setState({
    token: body.token,
    entity: { email: body.entity.email },
    capabilities: deriveCapabilities(body.allowed_operations),
    isAuthenticated: true,
    isLoading: false,
    loginError: null,
  });
  // Rebind the SAME per-session scope (personal chat transcript) the login bound,
  // so a reload continues the session instead of appearing to start fresh.
  bindConversationScope(body.session_id ?? body.entity.email);
  return true;
}
