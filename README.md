# SwisDex Mobile App

Production React Native + Expo mobile trader for the SwisDex platform.

## Stack

- Expo SDK 56 (managed workflow)
- React Native 0.85 / React 19.2
- TypeScript strict mode (`noUncheckedIndexedAccess` on)
- Expo Router v4 (file-based routing under `app/`)
- Zustand for state
- Reanimated 4 + Skia for animations and charts
- pnpm package manager

## Local development

1. **Bring up the backend** (in the sibling `swisdesk/` checkout):
   ```bash
   cd ../swisdesk
   docker compose up -d postgres timescaledb redis gateway
   # First boot also requires migrations:
   docker compose --profile migrate run --rm migrate
   ```

2. **Configure mobile env**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local — replace 192.168.1.100 with your dev machine's LAN IP.
   # Physical devices can't reach localhost on the dev machine.
   ```

3. **Start Expo**:
   ```bash
   pnpm start
   ```
   Scan the QR with Expo Go on your phone (CLAUDE.md mandates testing on a
   physical phone — Android Studio is too heavy for this dev box).

## Folder layout

```
app/                      Expo Router file-based routes (URL surface)
src/
  theme/                  Color / typography / spacing tokens
  ui/                     Primitive components (Text, Num, Divider, …)
  lib/
    api/                  Fetch wrapper + Bearer auth + 429 backoff (Phase 3)
    storage/              SecureStore wrappers (Phase 3)
    ws/                   WebSocket clients (Phase 6)
  stores/                 Zustand stores (Phase 3+)
  features/               Domain-specific feature modules (Phase 4+)
  types/                  Shared TypeScript types
```

## Design system

Brand canon mirrors the web trader: green `#55a630` accent / buy, near-black
`#08090b` background. **Always** import from `@/theme`, **never** hardcode a
colour or font size in a screen file. New primitives go in `src/ui/` —
adding a one-off style to a screen is a code smell.

Read `CLAUDE.md` at the monorepo root for the full design philosophy (density,
typography, NO cards everywhere, NO FABs on trading screens, etc.).

## Phase status

Built incrementally — see `CLAUDE.md` for the 12-phase plan. This commit ends
Phase 2 (scaffold + design system + primitives).
