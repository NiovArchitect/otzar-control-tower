// FILE: auth.ts
// PURPOSE: Zustand store holding the logged-in user's JWT, identity,
//          and derived TAR capabilities. Consumed by api.ts (token
//          attachment + 401 logout), AuthGuard (route protection),
//          and Layout's user pill.
//
// POSTURE — JWT IN MEMORY ONLY (XSS-protected MVP):
// - The token lives in this store's in-memory state only.
// - NO localStorage. NO sessionStorage. NO cookies.
// - Page refresh wipes the store -> the user re-logs in.
// - The known UX cost (refresh = re-login) is accepted for MVP.
// - Refresh-token-via-httpOnly-cookie work lands in Section 16.
// - Adding localStorage as a "small helpful improvement" is a
//   security regression -- do NOT.
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
      email: string,
      password: string,
    ): Promise<{ ok: boolean; message?: string }> => {
      set({ isLoading: true, loginError: null });
      const result = await api.auth.login(email, password);
      if (!result.ok) {
        const message = `Login request failed (${result.code})`;
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
      return { ok: true };
    },

    logout: (): void => {
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
