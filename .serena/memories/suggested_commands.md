Useful Windows/PowerShell commands for this repo:
- `Get-ChildItem -Force` : list files including hidden
- `rg --files docs frontend backend` : fast file listing
- `rg "pattern" docs backend frontend` : fast text search
Backend npm scripts (run in `backend`):
- `npm run build` : build the main API
- `npm run build:main`
- `npm run dev:main`
- `npm run start:main`
- `npm run test`
- `npm run docs:validate`
- `npm run swagger:up`
- `npm run swagger:check`
- `npm run swagger:stop`
- `npm run swagger:ready`
- `npm run db:generate`
- `npm run db:migrate`
Root managed runtime commands start the main API, staff web, Storybook, Expo LAN, and Expo web without attaching long-lived processes to the terminal.
