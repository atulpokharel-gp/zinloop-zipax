# TODOS

## Distribution

- **Publish `@zinloop/agent-control-sdk` to npm** — **Priority:** P1
  - The SDK (`sdk/typescript`) ships as a package but `release.yml` has no `npm publish` step, so after merge nobody can `npm install` it. Add a publish job (or decide it is consumed in-repo only).
  - Deferred from: /ship on `refactor/agent-control-single-service` (2026-11-22).

## Repo hygiene

- **Move `console/public/product-tour.mp4` (13 MB) out of git** — **Priority:** P3
  - A 13 MB binary in git history bloats every clone permanently. Prefer Git LFS or external hosting for the product-tour video.
  - Noticed by: /ship on `refactor/agent-control-single-service` (2026-11-22).

## Completed
