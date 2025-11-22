# Repository Guidelines

This document guides contributors (and automated agents) working on the LLM Speed Test application.

## Project Structure & Modules
- Root Go backend: `main.go`, `app.go`, `speed_test_service.go`, `export_service.go`, `models.go`, `openai_client.go`.
- Frontend (React + Vite + Tailwind): `frontend/src`, bundled via Wails.
- Tools and utilities: `tools/` (e.g., `test_api_debug.go` for API debugging).
- Documentation and assets: `docs/`, `build/`, `exports/`, `third_party/`.

## Build, Run, and Development
- Desktop dev mode: `wails dev` (runs Go backend and frontend together).
- Production build: `wails build` (outputs desktop binaries into `build/`).
- Frontend-only work: `cd frontend && npm install && npm run dev` or `npm run build`.
- API debug helper: `cd tools && go run test_api_debug.go` after editing endpoint/key.

## Coding Style & Naming
- Go: use idiomatic Go, run `gofmt` on all touched files; exported symbols in `CamelCase`, unexported in `camelCase`.
- TypeScript/React: follow existing patterns in `frontend/src` (functional components, hooks, 2-space indentation).
- Keep modules focused (service logic in `*_service.go`, models in `models.go`, HTTP/client code in `openai_client.go`).
- TypeScript: 禁止随意使用 `any`；如需与第三方库交互，优先使用精确类型或 `unknown` 并通过类型守卫/缩窄来处理。

## Testing Guidelines
- Go tests: `go test ./...` at the repo root; add tests alongside code (e.g., `foo_test.go`).
- Prefer table-driven tests and deterministic inputs for speed/performance logic.
- When changing prompt generation, update and extend `prompt_generator_test.go`.

## Commit & Pull Request Practices
- Commit messages: short, imperative summaries (e.g., `Add round throughput chart`, `Refactor speed test service`).
- PRs: describe motivation, key changes, and testing performed (`go test ./...`, `wails dev`/manual UI checks). Include screenshots for UI changes when practical.

## Agent-Specific Instructions
- Keep changes minimal and localized; do not modify `LICENSE` or overall project branding.
- Prefer updating existing patterns over introducing new frameworks or architectural styles.
- When touching Go code, assume `go test ./...` should pass; when touching the frontend, ensure `npm run build` in `frontend/` conceptually succeeds.
