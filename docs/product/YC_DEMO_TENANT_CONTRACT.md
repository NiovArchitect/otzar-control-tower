# YC / Investor Demo Tenant Contract

**Status:** Product contract (credentials never in git)  
**Principle:** Believable fictional enterprise · secure private password · no real YC names  

## Organization

| Field | Value |
|-------|--------|
| Organization display name | **Meridian Labs** |
| Purpose | Isolated demo tenant for YC / investor review |
| Production authority | **None** — demo org only |
| Resettable | Yes — re-seed from controlled fixtures |

## Login (public shape only)

| Field | Value |
|-------|--------|
| Login email | `demo@otzar.ai` (preferred) or operator-provisioned `demo+yc@…` |
| Display name | **YC Product Review** |
| Password | **Generated securely at provision time** — never `ycombinator`, never in frontend, docs, screenshots, or public repo |

Password delivery: **application submission only** (private channel). Store hash only in the database.

## Demo story (one coherent operating loop)

1. Fragmented launch communication enters Otzar.  
2. Otzar understands decisions, commitments, owners, risks.  
3. AI Teammates collaborate under policy.  
4. Low-risk action executes with proof.  
5. One exception needs human judgment.  
6. Second similar run needs fewer interventions.  

## Team (fictional — no real YC people)

Use synthetic names only, e.g.:

- Ava Chen — Engineering lead  
- Jordan Hale — Product  
- Sam Rivera — Research  
- Riley Okonkwo — Operations  

Do **not** hard-code real Y Combinator partners, employees, or reviewers.

## Admin vs employee

| Surface | Who |
|---------|-----|
| Otzar (`/app`) | Demo employee / reviewer path |
| Control Tower (`/`) | Demo admin only when reviewing governance |

## Anti-patterns

- Real YC names in seed data  
- Weak public passwords  
- Credentials in `src/`, screenshots, or README  
- Demo that is a feature tour instead of problem → proof  
