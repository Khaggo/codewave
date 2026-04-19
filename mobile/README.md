# Mobile Run Guide

This app is an Expo / React Native frontend for the `codewave` backend.

## Windows Sandbox Workaround

The Windows "sandbox" issue is about how heavy commands run from inside Codex, not about a bug in the mobile app.

Use this workflow:

1. Let Codex inspect files and make code changes normally.
2. For heavier commands such as `npm install`, `expo start`, or `expo export`, either:
   - approve the escalated command request from Codex, or
   - run the same command yourself in PowerShell and paste the output back.
3. If Docker commands are involved, prefer running them yourself in PowerShell on Windows.

This keeps the repo workflow simple and avoids fighting local command restrictions.

## Backend Prerequisites

The backend must be running before mobile auth will work.

In [backend/.env](../backend/.env), keep:

```env
DATABASE_URL=postgresql://admin:root@localhost:5433/codewave
```

Then start the local stack:

```powershell
cd d:\mainprojects\codewave\backend
docker compose up -d
npm run db:push
npm run dev:main
```

Verify the API is healthy on your computer:

```text
http://127.0.0.1:3000/api/health
```

Expected response:

```json
{"service":"main-service","status":"ok"}
```

## Run On A Physical Phone

### 1. Find your computer's LAN IP

Run this in PowerShell:

```powershell
ipconfig
```

Look for the `IPv4 Address` on your active Wi-Fi adapter.

Example:

```text
192.168.1.14
```

### 2. Create a local mobile env file

Create `mobile/.env.local` and point it to your computer's LAN IP:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.14:3000
```

Replace `192.168.1.14` with your real IP.

Do not use `127.0.0.1` on a physical phone. On a phone, `127.0.0.1` means the phone itself, not your computer.

### 3. Install dependencies once

```powershell
cd d:\mainprojects\codewave\mobile
npm install
```

### 4. Start Expo

Preferred:

```powershell
npm run start:lan
```

Fallback if LAN mode has trouble:

```powershell
npm run start:tunnel
```

Keep `EXPO_PUBLIC_API_BASE_URL` set to your LAN IP even if you use tunnel mode for Metro.

## Expo MCP Setup

Expo MCP has two pieces:

1. The remote Expo MCP server connected to Codex
2. Local Expo app capabilities enabled by the `expo-mcp` dev dependency and MCP startup flag

Per Expo's April 3, 2026 docs, the remote server requires an Expo account with an EAS paid plan.

### 1. Add the remote Expo MCP server to Codex

Run this once in PowerShell:

```powershell
codex mcp add expo-mcp --url https://mcp.expo.dev/mcp
```

Then authenticate the server in Codex:

```powershell
codex mcp login expo-mcp
```

Expo recommends using a personal access token from the EAS dashboard during the OAuth flow.

### 2. Install local Expo MCP support

This repo includes `expo-mcp` as a dev dependency. If you have not refreshed dependencies since it was added, run:

```powershell
cd d:\mainprojects\codewave\mobile
npm install
```

### 3. Log in to Expo CLI with the same account

Before using local MCP tools, make sure Expo CLI is authenticated with the same Expo account you used for `expo-mcp`:

```powershell
npx expo whoami
npx expo login
```

### 4. Start Expo with MCP capabilities enabled

Use one of these commands:

```powershell
npm run start:mcp
npm run start:lan:mcp
npm run start:tunnel:mcp
```

These commands set `EXPO_UNSTABLE_MCP_SERVER=1` before launching Expo so Codex can use local MCP tools like screenshots, taps, logs, and DevTools access.

Whenever you restart Expo in MCP mode, reconnect or restart the Expo MCP server in Codex so the local tools refresh.

### 5. Open the app on the phone

1. Install `Expo Go` on the phone.
2. Put the phone on the same Wi-Fi network as your computer.
3. Scan the QR code shown by Expo in the terminal or browser.

### 6. Allow Windows Firewall

If Windows asks to allow `Node.js`, allow it on `Private networks`.

This is important for:

- Metro / Expo dev server access
- local API access from the phone

## What To Test

1. Register a new account in the mobile app.
2. Check email for the OTP.
3. Enter the OTP on the registration verification screen.
4. Sign out.
5. Sign back in with email and password only.

Login should not ask for OTP after the account is activated.

## Important Config Notes

- Backend database:

```env
DATABASE_URL=postgresql://admin:root@localhost:5433/codewave
```

- Physical phone API base URL:

```env
EXPO_PUBLIC_API_BASE_URL=http://<YOUR-LAN-IP>:3000
```

- Android emulator is different from a physical phone:
  - emulator usually uses `http://10.0.2.2:3000`
  - physical phone must use your computer's LAN IP

## Troubleshooting

If the app opens but auth calls fail:

1. Re-check `mobile/.env.local`
2. Re-check that the backend is still running on port `3000`
3. Re-open `http://127.0.0.1:3000/api/health` on your computer
4. Confirm your phone and computer are on the same Wi-Fi
5. Confirm Windows Firewall allowed `Node.js` on private networks

If login works on web but not on phone, the first thing to verify is `EXPO_PUBLIC_API_BASE_URL`.
