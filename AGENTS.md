# Expo SDK 54 (compromise between Expo Go support and Node 24 compatibility)

Project was scaffolded on SDK 56. User's Expo Go didn't support 56, so
we tried 53 — but SDK 53's `expo-modules-core` ships as raw TypeScript
source (`main: src/index.ts`, no compiled JS) and Node 24's ESM loader
refuses to import `.ts` from node_modules. SDK 54 publishes compiled JS
in every package and is the closest SDK to 56 that's broadly supported
in store-version Expo Go. When in doubt, read the exact versioned docs
at https://docs.expo.dev/versions/v54.0.0/.

Notable SDK-54 specifics:
- React 19.1 / RN 0.81.5.
- Reanimated 4 (autoconfigured babel plugin). `babel.config.js` lists
  the plugin manually — harmless on SDK 54 but unnecessary.
- `react-native-worklets` companion package required.
- `expo-file-system/legacy` is the import for the procedural API
  (`cacheDirectory`, `downloadAsync`, …). The root module ships the new
  File/Directory class API.
- Skia 2.x.
- TypeScript 5.9 (SDK 54 tsconfig.base.json uses `module: "preserve"`
  which needs TS 5.4+).
- Typed routes (`experiments.typedRoutes`) deliberately disabled in
  app.json — code uses route-group strings like `/(app)` that the
  typed-routes generator doesn't expose as valid Href targets.

Dev-server gotcha on this Windows box: Metro must be started from a
real terminal (PowerShell/CMD) — Claude's sandboxed Bash reaps detached
processes after they go idle, so `pnpm start` invoked from there dies
shortly after the QR would have appeared.

Local dev:
```powershell
cd D:\setupfx\swisdex_web_and_mobile_app\swisdex_mobile_app
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "<your LAN IP>"
pnpm start --lan
```

Then scan the QR with Expo Go or paste `exp://<LAN IP>:8081`.
