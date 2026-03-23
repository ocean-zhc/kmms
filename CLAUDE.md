# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KMMS (幼儿园食谱管理系统) - A kindergarten weekly meal menu management system with a PHP API backend and UmiJS frontend, deployed via Docker to a NAS.

## Architecture

**Backend** (`api/`): Plain PHP 8.2 (no framework), Apache, PostgreSQL.
- `index.php` — single entry point with manual regex-based routing dispatching to controllers
- `config.php` — config with env var overrides (DB, JWT, CORS, workday API)
- `db.php` — PDO singleton (`DB::getInstance()`)
- `controllers/` — static-method controllers: Auth, Week, Dish, Ai, Workday
- `middleware/auth.php` — JWT auth (manual HMAC-SHA256, no library)
- `middleware/cors.php` — CORS handling
- `helpers/response.php` — `json_success()` / `json_error()` helpers

**Frontend** (`web/`): UmiJS 4 + Ant Design 5 + Pro Components, TypeScript.
- `.umirc.ts` — routes, proxy config, antd plugin
- `src/services/api.ts` — all API calls via a single `req()` wrapper using fetch
- `src/layouts/` — `AdminLayout` (sidebar nav) and `PublicLayout` (parent-facing)
- `src/pages/admin/` — admin pages: weeks, dishes, AI config, profile
- `src/pages/public/` — parent-facing: current week menu, history
- `src/components/` — `MenuGrid` (week grid display), `AiSummary` (AI nutrition summary)

**Database** (`database/`): PostgreSQL. Core tables: `menu_weeks`, `menu_items`, `admin_users`, `dishes`, `ai_config`, `ai_summaries`, `workday_cache`, `operation_logs`. Run `init.sql` then `add_dishes.sql` and `add_ai.sql` for full schema.

**Two-user model**: Admin (manages menus behind JWT auth at `/admin/*`) and Parents (public read-only at `/` and `/history`).

## Common Commands

```bash
# Frontend dev server (proxies /api to localhost:8080)
cd web && npm run dev

# Frontend build
cd web && npm run build

# Docker build
docker build -f Dockerfile.api -t kmms-api:latest .
docker build -f Dockerfile.web -t kmms-web:latest .

# Full deploy to NAS
./deploy-to-nas.sh user@nas-ip
```

## Key Patterns

- API routes are all defined in `api/index.php` — add new routes there with matching controller
- All API responses use `json_success($data)` / `json_error($msg, $code)` from `helpers/response.php`
- Admin endpoints require JWT via `middleware/auth.php`; public endpoints (`/public/*`) do not
- Frontend API base path is `/api`, proxied in dev via `.umirc.ts`, in production via nginx (`deploy/docker-nginx.conf`)
- The nginx container strips `/api/` prefix before forwarding to the PHP container
- AI feature: configurable OpenAI-compatible API for generating weekly nutrition summaries, config stored as single-row `ai_config` table
- Default admin credentials: `admin` / `admin123`
