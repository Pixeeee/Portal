# Lovable Portal UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Lovable Portal layout into the Expo Android app, add a portal splash flow, hide self-view by default, and push the safe result to GitHub.

**Architecture:** Keep all backend and app state logic intact. Adapt the Lovable web visual system into React Native primitives in `apps/mobile/src/components/ui.tsx`, then update screen files to consume those components. Generate splash assets from the existing GIF and wire them through Expo config plus the bootstrap route.

**Tech Stack:** Expo Router, React Native, TypeScript, LiveKit React Native, Expo Camera, Expo SQLite, ImageMagick for local asset conversion.

## Global Constraints

- Do not commit `.env`, `.env.*`, `apps/mobile/.env`, or other real secret files.
- Keep `EXPO_PUBLIC_API_URL` in env only; do not hardcode production API URLs in source.
- Preserve existing backend, LiveKit credential, QR, local DB, and production verification behavior.
- Android-only app.
- Hiding self view must not stop publishing the local camera.

---

### Task 1: Splash Assets And Configuration

**Files:**
- Create: `apps/mobile/assets/portal-transparent.gif`
- Create: `apps/mobile/assets/portal-splash.png`
- Modify: `apps/mobile/app.config.ts`

**Interfaces:**
- Produces: safe splash assets used by Expo config and `apps/mobile/src/app/index.tsx`.

- [ ] Generate a transparent GIF by making the black background transparent:

```bash
convert apps/mobile/assets/portal.gif -coalesce -transparent '#000000' -layers Optimize apps/mobile/assets/portal-transparent.gif
```

- [ ] Generate a static splash PNG frame:

```bash
convert 'apps/mobile/assets/portal.gif[0]' -transparent '#000000' apps/mobile/assets/portal-splash.png
```

- [ ] Configure Expo `splash` with `./assets/portal-splash.png`, dark background, and contain resize mode.

- [ ] Verify assets with `file apps/mobile/assets/portal-transparent.gif apps/mobile/assets/portal-splash.png`.

### Task 2: React Native Portal Design System

**Files:**
- Modify: `apps/mobile/src/components/ui.tsx`

**Interfaces:**
- Produces: `colors`, `Screen`, `Title`, `Label`, `Body`, `Input`, `Button`, `Status`, `StatusPill`, `Panel`, `SectionLabel`, `ListRow`, `SettingRow`, `PortalMark`, `QuickAction`, `IconCircle`, `Loading`, `Divider`, `Card`.

- [ ] Replace the minimal component styles with Lovable-inspired graphite/teal tokens.
- [ ] Keep backwards-compatible exports for existing screens.
- [ ] Add compact panel, row, status, and portal mark components.
- [ ] Run `npm run typecheck --workspace @portal/mobile`.

### Task 3: Dashboard, Connect, Onboarding, And Place Screens

**Files:**
- Modify: `apps/mobile/src/app/index.tsx`
- Modify: `apps/mobile/src/app/onboarding.tsx`
- Modify: `apps/mobile/src/app/(tabs)/index.tsx`
- Modify: `apps/mobile/src/app/connect.tsx`
- Modify: `apps/mobile/src/app/portal/[code].tsx`
- Modify: `apps/mobile/src/app/qr.tsx`

**Interfaces:**
- Consumes: Task 2 UI components and Task 1 splash assets.

- [ ] Add the in-app animated splash to bootstrap `index.tsx`.
- [ ] Port dashboard composition from Lovable while preserving real `usePortal()` data.
- [ ] Port onboarding and connect layout without changing API behavior.
- [ ] Port place profile and QR layout without changing navigation behavior.
- [ ] Run mobile typecheck.

### Task 4: Calls, Settings, Lists, And Diagnostics

**Files:**
- Modify: `apps/mobile/src/lib/localDb.ts`
- Modify: `apps/mobile/src/app/live/[sessionId].tsx`
- Modify: `apps/mobile/src/app/incoming/[requestId].tsx`
- Modify: `apps/mobile/src/app/outgoing/[requestId].tsx`
- Modify: `apps/mobile/src/app/(tabs)/settings.tsx`
- Modify: `apps/mobile/src/app/(tabs)/recents.tsx`
- Modify: `apps/mobile/src/app/favorites.tsx`
- Modify: `apps/mobile/src/app/trusted.tsx`
- Modify: `apps/mobile/src/app/diagnostics.tsx`
- Modify: `apps/mobile/src/app/history.tsx`
- Modify: `apps/mobile/src/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: Task 2 UI components.
- Produces: default hidden local preview plus in-call self-view toggle.

- [ ] Change `defaultMediaPreferences.showLocalPreview` to `false`.
- [ ] Add live-call self-view state initialized from preferences and persisted through `setMediaPreference`.
- [ ] Port live, incoming, outgoing, settings, list, and diagnostics screens to the Lovable style.
- [ ] Run mobile tests/typecheck.

### Task 5: Secret-Safe Verification And Push

**Files:**
- Modify: Git remote configuration only if missing.

**Interfaces:**
- Consumes: completed app changes.

- [ ] Confirm env files are ignored:

```bash
git check-ignore -v .env apps/mobile/.env apps/server/.env infrastructure/production/.env
```

- [ ] Scan tracked/staged files for secret-looking values.
- [ ] Run `npm run verify` and focused mobile verification.
- [ ] Add remote `origin` as `https://github.com/Pixeeee/Portal.git` if missing.
- [ ] Commit safe changes.
- [ ] Push `master` to `origin`.
