# Wealth Dashboard Web

Next.js + FastAPI wealth planning dashboard for retirement, tax, insurance, debt, and inheritance simulation.

Production URL:

https://wealth-dashboard-web.vercel.app

## Stack

- Next.js 16
- React 19
- Recharts
- Tailwind CSS 4
- FastAPI serverless function on Vercel

## Local Development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```

Current lint status:

- `npm run lint` passes cleanly.
- `npm run typecheck` passes cleanly.
- `npm run build` passes.

## API

Health check:

```text
GET /api/health
```

Main simulation:

```text
POST /api/v1/wealth/simulate
```

Vercel rewrites `/api/*` traffic to `api/index.py`.

## Frontend Architecture

The main app page is intentionally kept as a composition layer. Domain state, UI panels, and calculation helpers are split by responsibility:

- `src/app/page.tsx`: page orchestration, high-level data flow, and layout composition.
- `src/components/`: reusable dashboard panels, charts, tables, and report views.
- `src/hooks/`: state containers for timeline, income, assets, pension, future events, liabilities, family, insurance, tax parameters, and simulation execution.
- `src/lib/`: typed business logic for pension calculations, loan math, payload building, tax parameter conversion, retirement planning, and API access.
- `src/types/`: shared wealth-planning, API payload, and simulation result types.

## Deployment

This repo is deployed on Vercel. The current `vercel.json` routes API requests to the Python FastAPI handler:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.py"
    }
  ]
}
```

## Notes

- Do not commit `.env*`, secrets, service-account keys, `.next`, `node_modules`, or Python cache files.
- Google Cloud or BigQuery credentials should live in Vercel environment variables, GitHub Actions secrets, or GCP Secret Manager.
- Keep API payload/result contracts typed in `src/types/wealth.ts` and update `src/lib/buildSimulationPayload.ts` when adding new simulation inputs.
