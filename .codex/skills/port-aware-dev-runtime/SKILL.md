---
name: port-aware-dev-runtime
description: Use before starting, stopping, or debugging local dev servers in this repo, especially backend, frontend, Expo LAN/web, Metro, or any Node process on ports 3000, 3001, 3002, 8081, 8085, or 8090. This skill prevents duplicate Node servers by checking active listeners first, reusing healthy servers, and only starting missing runtimes deliberately.
---

# Port-Aware Dev Runtime

## Core Rule

Never start backend, web, Expo, Metro, or another long-running Node dev server blindly. Check the expected port first and reuse a healthy listener when it already exists.

## Port Map

- Backend main service: `3000`
- Ecommerce service: `3001`
- Next.js staff/admin web: usually `3002`
- Expo Go LAN / Metro: usually `8081`
- Expo alternate LAN/debug: `8085`
- Expo web debug: usually `8090`

## Workflow

1. Check listeners before starting anything:

```powershell
netstat -ano | Select-String -Pattern ':3000|:3001|:3002|:8081|:8085|:8090'
```

2. Identify the listener if needed:

```powershell
Get-Process -Id <PID> -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,Path
```

3. Health-check reusable servers:

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/health' -UseBasicParsing
```

4. Run `npm run runtime:status` from the repository root to distinguish a managed listener from an external or stale listener.
5. If the needed port is already healthy, do not start another server. Tell the user which port is active and continue debugging against it.

6. Use `npm run runtime:restart -- <runtime-name>` only for manager-owned runtimes. The manager refuses to terminate unknown listeners.

7. If the needed port is empty, use the repo-root `dev:*` command. It starts detached, returns immediately, and writes ownership/log data under the application's `.runtime/` directory.
8. When the next operation requires a ready service, run `npm run runtime:wait -- <runtime-name>`. This readiness check is explicitly bounded and reports the relevant log tail on failure.

## Safe Starts

- Backend:

```powershell
cd D:\mainprojects\codewave
npm run dev:main
```

- Staff/admin web:

```powershell
cd D:\mainprojects\codewave
npm run dev:web
```

- Expo Go on phone:

```powershell
cd D:\mainprojects\codewave
npm run dev:mobile
```

- Expo web debug:

```powershell
cd D:\mainprojects\codewave
npm run dev:mobile:web
```

Do not use PowerShell `Start-Process`, raw app-level `dev` commands, or ad hoc detached
Node launches for these runtimes. Codex Windows sessions can contain both `Path` and
`PATH`; the runtime manager normalizes that environment and avoids inherited terminal
handles.

## Repo-Specific Reminders

- Keep backend on `3000`; mobile and web env files point at it.
- For Expo Go on a phone, `mobile/.env.local` should use the PC LAN IP, not `127.0.0.1`.
- For Expo Web in the PC browser, `mobile/.env.local` can use `http://127.0.0.1:3000`.
- Check CORS if browser web clients cannot reach backend.
- Prefer closing known stale ports (`8081`, `8085`, `8090`) over spawning replacements.
