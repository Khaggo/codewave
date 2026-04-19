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

4. If the needed port is already healthy, do not start another server. Tell the user which port is active and continue debugging against it.

5. If the needed port is active but wrong, stale, or explicitly requested to be closed, stop only that specific PID. Do not kill broad `node` process groups.

6. If the needed port is empty, start only the missing runtime and capture its PID/logs under that app's `.runtime/` folder.

## Safe Starts

- Backend:

```powershell
cd D:\mainprojects\codewave\backend
npm run dev:main
```

- Staff/admin web:

```powershell
cd D:\mainprojects\codewave\frontend
npm run dev
```

- Expo Go on phone:

```powershell
cd D:\mainprojects\codewave\mobile
npx expo start --lan --clear
```

- Expo web debug:

```powershell
cd D:\mainprojects\codewave\mobile
npx expo start --web --port 8090 --clear
```

## Repo-Specific Reminders

- Keep backend on `3000`; mobile and web env files point at it.
- For Expo Go on a phone, `mobile/.env.local` should use the PC LAN IP, not `127.0.0.1`.
- For Expo Web in the PC browser, `mobile/.env.local` can use `http://127.0.0.1:3000`.
- Check CORS if browser web clients cannot reach backend.
- Prefer closing known stale ports (`8081`, `8085`, `8090`) over spawning replacements.
