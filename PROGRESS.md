# Vantage Redesign Progress

Tracking the screen-by-screen rebuild against the Vantage-style spec.

## Tokens
- [x] colors — brand green #55a630 / sell #FF2D55 / row tints / chips
- [x] typography — display.hero/large, title.1/2, body, caption (Inter system fallback)
- [x] spacing — 4px grid

## Primitives
- [x] Sparkline (react-native-svg, up/down color)
- [x] HeroCard (promo banner with CTA)
- [x] QuickActionGrid (4-icon row)
- [x] MarketRow (symbol + sparkline + price + change)
- [x] DualPriceButton (signature SELL | spread | BUY pill)

## Layout
- [x] Floating pill bottom tab bar

## Screens
- [x] Markets (Home dashboard: total / quick actions / hero / providers / watchlist)
- [x] Trade (account pill + symbol + dual button + order form)
- [x] Portfolio (equity card + positions list)
- [x] Wallet (balance + actions + transactions / empty state)
- [x] More (grouped sections list)

## Outstanding follow-ups
- 3D hero illustrations: placeholders (lucide icon stack) — replace when assets ship.
- Real crypto / fiat logos (cryptocurrency-icons or sprite) — Lucide placeholders for now.
- Inter font via expo-font: deferred — system default for now (good fallback on both OS).
- Stock-tab hero bar chart on Markets/Explore: deferred to Explore-tab phase.
- Top header tab pills "Watchlist | Explore" inside Markets tab: deferred (single-stream Home for now).
