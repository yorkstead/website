# Operator Access & Quick Launcher Guide

Yorkstead Command Center provides direct, zero-friction operator access to the private Command Center from both your **ThinkPad P14s (Windows 11)** and **OnePlus (Android)** devices without having to divert through the public studio site.

---

## 1. Instant Passkey Biometrics Flow

Public page headers no longer show the owner Command Center button. Demo navigation and Operations demo links remain available. For owner access, open `https://www.yorkstead.com/login` directly.

When you select **Continue with a passkey** on the login page:
- The system immediately triggers the native WebAuthn biometric challenge with zero extra clicks.
- **On ThinkPad**: Windows Hello immediately prompts for your fingerprint / PIN.
- **On OnePlus**: Android biometrics immediately prompts for your fingerprint.
- Upon fingerprint verification, you are immediately routed directly into `/dashboard`.
- If passkey authentication is canceled or if you need recovery password access, the login panel remains visible with the email/password fields ready.

---

## 2. Direct Access on ThinkPad P14s (Windows 11)

### Option A: Install as Dedicated Desktop App (Recommended)
1. Open Microsoft Edge or Google Chrome.
2. Navigate directly to `https://www.yorkstead.com/dashboard` (or `http://localhost:3000/dashboard` for local development).
3. In Edge: Click the **App available** icon in the address bar (or click `...` -> **Apps** -> **Install Yorkstead Command Center**).
   In Chrome: Click `⋮` -> **Cast, save, and share** -> **Install page as app**.
4. Check **Pin to taskbar** and **Pin to Start**.
5. Opening this app launches `/dashboard` in a standalone window. If signed out, sign in on the login page; choose **Continue with a passkey** to request Windows Hello.

### Option B: Native Desktop / Taskbar Shortcut Target
You can create a custom Windows shortcut pointing directly to the app window:
- **Production Target**:
  ```cmd
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=https://www.yorkstead.com/dashboard
  ```
- **Local Dev Target**:
  ```cmd
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3000/dashboard
  ```

### Option C: Direct Quick URL Aliases
Type either alias into your browser address bar:
- `yorkstead.com/cmd`
- `yorkstead.com/ctrl`

---

## 3. Direct Access on OnePlus (Android)

### Option A: Install Progressive Web App (PWA) to Home Screen
1. Open Google Chrome, Brave, or Edge on your OnePlus phone.
2. Navigate to `https://www.yorkstead.com/dashboard` (or `https://www.yorkstead.com/cmd`).
3. Tap the browser menu (`⋮`) in the top right.
4. Select **Add to Home screen** or **Install app**.
5. Tap **Add** / **Install**.
6. An app icon for **Yorkstead Command Center** will appear on your OnePlus home screen / app drawer.

### Option B: 1-Tap Home Screen Launcher & App Shortcuts
- **Direct Launch**: Tapping an updated installed-app icon opens `/dashboard` in standalone mode. An active owner session opens the dashboard; otherwise `/login?next=/dashboard` appears. Choose **Continue with a passkey** or use recovery login to return to the dashboard. Installation does not bypass owner authorization.
- **App Shortcuts (Long Press)**: Long-press the Yorkstead Command Center home screen icon to reveal direct jump shortcuts:
  - **Command Center** (`/dashboard`)
  - **Client Leads** (`/dashboard/leads`)
  - **Analytics** (`/dashboard/analytics`)
  - **Consultations** (`/dashboard/consultations`)
  You can drag any of these shortcuts directly onto your home screen for 1-tap dedicated entry into specific workflows.

---

## 4. Managing Registered Passkeys

To enroll new hardware keys or manage existing devices:
1. Sign in and visit `/account` (or select **Account & passkeys** in the Command Center).
2. Click **Add passkey** to enroll your device biometric (Windows Hello / OnePlus Fingerprint).
3. Always ensure at least one primary biometric key and one backup/recovery credential exist before removing an old passkey.


## Existing Android installations

The manifest keeps `id: "/"`, its existing URL `/manifest.webmanifest`, and scope `/`. Only its name (`Yorkstead Command Center`, short label `Yorkstead`) and launch URL (`/dashboard`) change. Dashboard, login and account stay within the installed app scope. No custom install prompt is added to marketing pages or other routes; use the browser install menu from the signed-in owner dashboard.

Existing Chrome Android WebAPKs can receive these manifest changes without reinstalling, but updates are browser-managed and delayed. Launch the app online, then close all app windows and allow Chrome time to update while the device is charging on Wi-Fi. An old installation may continue launching `/` or showing its old name until updated; a server release or service-worker refresh does not force an immediate launcher update. See [Chrome manifest update behavior](https://web.dev/articles/manifest-updates).

If it still launches the public homepage after allowing an update, or the icon is a plain URL shortcut rather than an installed WebAPK, remove the stale shortcut/uninstall the old web app and reinstall from the signed-in `/dashboard` on the same origin and browser profile. Reauthentication may be needed. Reinstalling is a fallback, not a requirement for every existing installation. Shortcut destinations and authorization remain unchanged; Analytics currently falls back to `/dashboard` after login. Private dashboard, account, login and API responses are never cached by the service worker, so private launch/sign-in requires network access.

Manual device acceptance (not automated by desktop Playwright): verify an existing Android installation before/after its manifest update, check name and launch URL, test signed-in and signed-out launch, long-press all four shortcuts, and confirm private pages are unavailable offline. If a launcher remains stale, verify the reinstall fallback above.
