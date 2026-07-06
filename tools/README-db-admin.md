# WeSpice DB Admin

Local PowerShell/CMD tool for Supabase admin operations.

## Setup

Add the service role key to your local `.env`:

```txt
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Keep this key local. It bypasses RLS and must never be used in app code or exposed with an `EXPO_PUBLIC_` prefix.

## Launch

Local browser UI:

```powershell
npm.cmd run db:admin:web
```

Or directly:

```powershell
.\tools\user-admin.ps1
```

Keep the terminal open while using the browser UI. It runs on `127.0.0.1` and keeps the Supabase service role key inside the local Node process.

Terminal menu:

```powershell
.\tools\db-admin.ps1
```

Or through npm:

```powershell
npm.cmd run db:admin
```

From CMD:

```cmd
tools\db-admin.cmd
```

## Commands

```powershell
.\tools\db-admin.ps1 Get User List
.\tools\db-admin.ps1 Get User List --search thomas
.\tools\db-admin.ps1 Get User Info user@email.com
.\tools\db-admin.ps1 Update Profile user@email.com --display-name "Alex" --color rose
.\tools\db-admin.ps1 Update Auth user@email.com --email new@email.com --confirm user@email.com
.\tools\db-admin.ps1 Delete User user@email.com --dry-run
.\tools\db-admin.ps1 Delete User user@email.com --confirm user@email.com
```

Use `--json` for script-friendly output. Use `--show-secrets` only if you really need unmasked push tokens in `Get User Info`.
