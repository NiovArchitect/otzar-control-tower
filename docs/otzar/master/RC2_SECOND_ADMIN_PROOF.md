# RC2 second-admin proof (2026-07-22)

## Goal
Prove Organization activation is not hard-coded to `sadeil@niovlabs.com`.

## What was proven

| Account | Login | `admin_org` TAR | Today “Otzar found” entry | `/setup` activation path |
|---------|-------|-----------------|---------------------------|---------------------------|
| `sadeil@niovlabs.com` | OK | Yes | Yes | Yes |
| `niov-operator-1@niovlabs.com` | OK | No (read/write/share only) | No | Bounced to `/app` |
| `niov-operator-2@niovlabs.com` | OK | No | No | Bounced to `/app` |
| Synthetic `rc2-admin-3+sadeil@…` (created via `POST /org/members` + activate) | OK | **No** — JWT ops `read/write/share` only | No | Bounced to `/app` |

## Attempted grant path
1. `POST /org/members` with `is_admin: true` → creates person; hierarchy shows `is_admin` membership.
2. Invite + `POST /auth/activate` → password set; login works.
3. Hierarchy assign with `is_admin: true` → 200 audited.
4. Login with `requested_operations: […, admin_org]` still returns only `read/write/share`.

## Conclusion
- Product surfaces are **role-gated on `can_admin_org`**, not email hard-coding (see `isOrgAdmin` / `AuthGuard`).
- **Multi-admin is not LIVE_ROUTE_VERIFIED** until Foundation grants `admin_org` TAR to a second account.
- Creating a second member with org membership `is_admin` is **not sufficient** for Control Tower access today.

## Status vocabulary
- Product gate: **IMPLEMENTED** (capability-based)
- Second admin live access: **NOT PROVEN** (Foundation TAR grant gap)
- Do **not** claim multi-admin FOUNDER_VISIBLE

## Follow-up (Foundation / ops)
- Document sanctioned API to grant `admin_org` to an additional org admin, or
- Provision a second bootstrap admin with TAR that includes `admin_org`.
