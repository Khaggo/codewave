Useful Windows/PowerShell commands for this repo:
- `Get-ChildItem -Force` : list files including hidden
- `rg --files docs frontend backend` : fast file listing
- `rg "pattern" docs backend frontend` : fast text search
Backend npm scripts (run in `backend`):
- `npm run build` : build both services
- `npm run build:main`
- `npm run build:ecommerce`
- `npm run dev:main`
- `npm run dev:ecommerce`
- `npm run start:main`
- `npm run start:ecommerce`
- `npm run test`
- `npm run docs:validate`
- `npm run swagger:up`
- `npm run swagger:check`
- `npm run swagger:stop`
- `npm run swagger:ready`
- `npm run db:generate`
- `npm run db:push`
There is currently no frontend package.json or runnable frontend app command in the repo root/frontend folder.