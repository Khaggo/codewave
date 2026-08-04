# Codewave

Codewave powers Cruisers Crib Auto Care Center:

- `backend/`: NestJS service-operations API
- `frontend/`: Next.js staff and administrator workspace
- `mobile/`: Expo customer application
- `qa/playwright/`: cross-application workflow tests
- `docs/architecture/`: canonical architecture and contract documentation

## Requirements

- Node.js `22.23.x`
- npm `10.9.x`
- PostgreSQL, Redis, and RabbitMQ for integration and local service work

## First Run

Install every workspace from the repository root:

```powershell
npm ci
```

Copy only the environment example files needed by the service you are running. Never commit
credentials or production connection strings.

## Development

| Surface | Command | Port |
| --- | --- | --- |
| Main API | `npm run dev:main` | `3000` |
| Staff web | `npm run dev:web` | `3002` |
| Staff web Storybook | `npm run dev:storybook` | `6006` |
| Mobile Storybook | `npm run dev:storybook:mobile` | `8085` |
| Expo LAN | `npm run dev:mobile` | `8081` |
| Expo web | `npm run dev:mobile:web` | `8090` |

The runtime commands start detached, return immediately, reuse a healthy listener, and
refuse to replace an unknown process. Use `runtime:wait` when the next operation needs
an explicit bounded readiness check. A cold `mobile-web` wait may take up to 150 seconds
because it compiles the actual Expo web bundle before reporting ready; later browser loads
reuse that warmed bundle. Runtime-manager commands print their deadline immediately,
bound OS process probes, and terminate with exit code `124` if the manager exceeds its
operation contract.

```powershell
npm run runtime:status
npm run runtime:wait -- backend-main
npm run runtime:restart -- backend-main
npm run runtime:stop -- backend-main
npm run runtime:logs -- backend-main
```

Runtime names are `backend-main`, `staff-web`, `storybook-web`, `storybook-mobile`,
`mobile-lan`, and `mobile-web`. Use the corresponding `dev:*:foreground` command only
when a developer explicitly wants attached live logs.

## Quality Gates

```powershell
npm run check
npm test
npm run build
npm run audit
npm run contracts:check
npm run ui:check
```

Use the narrowest affected check while developing. Run `npm run check` before a review or
release. Cross-application release flows live in `qa/playwright/`.

## Architecture

Start with [the repository map](docs/architecture/repository-map.md), then follow the canonical
documents linked by [the SSOT index](docs/architecture/README.md). Backend Swagger is the
implemented API truth; generated client contracts must not invent routes.

## Data Safety

Production schema changes use committed Drizzle migrations:

```powershell
npm --workspace backend run db:generate
npm --workspace backend run db:check
npm --workspace backend run db:migrate
```

`db:push:local` is reserved for disposable local databases. Repair, cleanup, import, and seed
scripts are dry-run by default and require explicit execution flags.

## Security

Report vulnerabilities using [SECURITY.md](SECURITY.md). Do not place sensitive findings in a
public issue.
