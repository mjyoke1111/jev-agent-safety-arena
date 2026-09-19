# Jev Agent Safety Arena

A small, reproducible browser-agent safety harness. A configurable generative model proposes actions. Jev (`typesafe-ai/jev` through Vercel AI Gateway) selects the next action and makes a separate typed safety judgment. Playwright supplies fixed benign and prompt-injected pages. The dashboard reads only completed run artifacts.

## What is real

- The harness makes live model calls. It stops if credentials are missing.
- `public/runs/latest.json` is created only after a completed run. The repository does not ship sample benchmark numbers.
- Latency is measured around provider requests. Token usage comes from provider response metadata.
- Cost is computed only from price variables you set. If prices are left blank, cost is recorded as zero, not estimated.
- The baseline runs the same goal and page through the configured mini model. Its confidence is recorded as zero because generic chat completions do not expose calibrated confidence.

This is a small evaluation fixture, not proof that any model is secure in production.

## Setup

Requirements: Node 20+, npm, and a Chromium browser installed by Playwright.

```bash
npm install
npx playwright install chromium
cp .env.example .env
# add your key and current provider prices
npm run harness:preflight
npm run harness
npm run dev
```

Open the URL printed by Vite. Use the Jev / Mini baseline toggle to compare only the latest completed run.

## Credentials

Required:

- `AI_GATEWAY_API_KEY`: Vercel AI Gateway key with access to both configured models.
- `JEV_MODEL`: defaults to `typesafe-ai/jev`.
- `PLANNER_MODEL`: a cheap generative model available through the gateway.
- `BASELINE_MODEL`: usually the same mini model as the planner.

No key is bundled. Never commit `.env`.

## Reproduce and inspect

Each run launches a local HTTP server for `harness/pages`, opens every case with Playwright, sends page text plus a constrained action set to the models, evaluates the decisions, and writes:

- Immutable artifact: `harness/results/run_<timestamp>.json`
- Dashboard artifact: `public/runs/latest.json`

Add cases in `harness/pages` and register their goal and expected safety outcome in `harness/src/cases.ts`. Results are intentionally ignored by git so a benchmark cannot be mistaken for a shipped claim.

## Cost notes

Set the four `*_USD_PER_MILLION` values from current provider pricing before a run. A case currently uses one planner call, two Jev calls, and one baseline call. Actual usage varies with page length and model output. Start with the four fixed cases, inspect the artifact, then expand deliberately.

## Static deployment

```bash
npm run build
```

Deploy `dist/` as a static site. Generate `public/runs/latest.json` before the build when you want the dashboard to include a verified run. Without it, the dashboard shows an explicit "No run data yet" state.

## Safety constraints

The harness exposes a constrained action vocabulary. It does not read local secrets or execute arbitrary page instructions. The injected pages are inert local fixtures. For higher-stakes research, isolate the browser and use synthetic credentials.

## Project layout

- `src/`: static React dashboard
- `harness/src/`: model gateway, typed schemas, runner, local server
- `harness/pages/`: fixed benign and injected fixtures
- `public/runs/`: completed artifact loaded by the UI

## Run the hosted evaluation

The Vercel deployment includes `POST /api/run-evaluation`. It runs the same fixed two-benign/two-injection suite from server-side fixture text, using the deployment's secrets. It never writes benchmark data into the site automatically. Save the returned JSON as `public/runs/latest.json`, review it, then rebuild and deploy the static dashboard.

Required Vercel environment variables:

- `AI_GATEWAY_API_KEY`: Vercel AI Gateway key.
- `ARENA_RUN_SECRET`: a long random shared secret used only to authorize evaluation runs.
- Model and price variables from `.env.example` as applicable.

Call it with the secret in a header, not in the URL:

```bash
curl -fsS -X POST \
  -H "x-arena-run-secret: $ARENA_RUN_SECRET" \
  https://YOUR-DEPLOYMENT.example/api/run-evaluation \
  > public/runs/latest.json
```

The endpoint fails closed when either required secret is absent and rejects missing or incorrect run secrets. It uses the account plan’s standard AI Gateway data handling and does not request Zero Data Retention, which is limited to Pro and Enterprise plans. Each request is bounded to four fixed cases, four provider calls per case, at most 220 output tokens per provider call, and 4,000 fixture characters. It returns a generic failure response rather than provider details. Public visitors cannot trigger a run without the shared secret.

### Direct Jev provider fallback

Set `TYPESAFE_API_KEY` from the TypeSafe console to route only Jev choice and safety calls through `POST https://api.typesafe.ai/v1/systemone` with model `jev-latest`. Planner and baseline calls still use Vercel AI Gateway. When the key is absent, Jev falls back to `typesafe-ai/jev` through AI Gateway. The run JSON records `jevRoute`.
