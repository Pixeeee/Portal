# Lovable Portal UI Design

## Goal

Port the approved Lovable "portal-link-live" layout into the Expo Android Portal app while preserving the existing backend, QR, LiveKit, local database, and production readiness behavior.

## Source Design

The source is `/home/kimz/Downloads/portal-link-live-main.zip`. It is a web/TanStack/Tailwind prototype, so the implementation will adapt its visual system and screen composition rather than copying web components directly.

## Visual System

- Use a dark graphite operational interface with teal portal accents, amber warning states, emerald live states, and rose destructive states.
- Replace the current large simple cards with compact panels, status pills, setting rows, quick-action tiles, and dense list rows.
- Use stable mobile dimensions, fixed-size call controls, and short labels that fit on Android screens.
- Keep the product focused on place-to-place operation rather than personal accounts.

## App Screens

- Dashboard shows the current place, online status, portal code, QR access, quick actions, favorite places, and link diagnostics.
- Onboarding uses a portal mark, place identity fields, and concise operational copy.
- Connect combines code entry, scan QR, show QR, and recent places.
- Place profile preserves resolve/call/favorite behavior with a clearer identity and trust layout.
- Incoming and outgoing requests use immersive ringing screens with large portal mark and clear accept/cancel actions.
- Live call uses full-screen remote video, compact controls, connection status, quality, elapsed time, and a self-view toggle.
- Settings and diagnostics use setting rows/status panels consistent with the Lovable design.

## Splash

- Use the existing `apps/mobile/assets/portal.gif` as the visual basis.
- Generate a transparent animated GIF variant for the in-app launch screen.
- Generate a static transparent PNG frame for Expo native splash configuration.
- Native splash uses the PNG; the app route displays the animated GIF briefly while Portal bootstraps.

## Self View

- Default `showLocalPreview` becomes `false`.
- The live screen exposes a `Self view` control that toggles the local preview during a call.
- Hiding self view never disables the local camera stream. It only hides the local preview on the current device.
- The setting persists through the existing local database preference.

## Secret Safety

- `.env`, `.env.*`, and mobile/server env files must remain ignored.
- Real API values must not be printed or committed.
- Before pushing, scan tracked files and staged files for common secret names and URL patterns.

## Verification

- Run focused mobile tests/typecheck after UI changes.
- Run repository verification where practical.
- Confirm generated splash assets exist and are tracked only as safe static assets.
- Confirm `.env` files remain ignored before commit and push.
