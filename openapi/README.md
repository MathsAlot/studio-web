# Pinned OpenAPI contract

`openapi.yaml` in this directory is the OpenAPI contract the Studio web client
(`src/types/api.ts`) is generated from. It is a **byte-identical copy** of the
canonical spec owned by the API repo:

```
studio-api/apps/studio-api/openapi/openapi.yaml
```

The web repo keeps its own pinned copy so the generated-types drift gate in
`.github/workflows/ci.yml` can run self-contained, without a cross-repo checkout
or token.

## Why a copy

- `npm run generate:api-types` reads `openapi/openapi.yaml` and writes
  `src/types/api.ts`. CI regenerates and `git diff --exit-code` fails if the
  committed client is stale.
- The canonical spec lives in the API repo; its CI (`export:openapi` +
  `git diff --exit-code`) is what keeps that file honest.

## Keeping it in sync

When the API contract changes, refresh this copy from the API repo and
regenerate the client in the same change:

```bash
# from the agentic workspace (both repos checked out as siblings)
cp ../studio-api/apps/studio-api/openapi/openapi.yaml openapi/openapi.yaml
npm run generate:api-types
```

Do not hand-edit `openapi.yaml` or `src/types/api.ts`. Cross-repo spec drift is
a known residual risk (see `docs/a11y-audit.md`, "Residual risk").
