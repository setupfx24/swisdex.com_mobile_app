import { useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/theme';

/**
 * TradingView Advanced Chart — the EXACT same widget the web trader uses
 * (src/components/charts/AdvancedChart.tsx). The web embeds TradingView's
 * free `embed-widget-advanced-chart.js`; on mobile we render that same
 * embed inside a WebView so the chart, indicators, drawing tools, and
 * timeframe controls are identical.
 *
 * Data note (same trade-off as web): the chart shows TradingView's public
 * feed (OANDA / FX / BINANCE / TVC), not the broker bid/ask — fills can
 * differ from the chart by the spread. The order panel stays the symbol
 * picker (allow_symbol_change is off), so every order goes to the symbol
 * the app is showing.
 */

interface Props {
  /** Platform symbol, e.g. "XAUUSD". Mapped to a TV-prefixed symbol below. */
  symbol: string;
}

// Mirrors SYMBOL_PREFIX in the web AdvancedChart. Prefer OANDA for
// commodities/metals, TVC for indices/oil, Binance for crypto, FX: for
// everything else.
const SYMBOL_PREFIX: Record<string, string> = {
  XAUUSD: 'OANDA:XAUUSD', XAGUSD: 'OANDA:XAGUSD',
  USOIL: 'TVC:USOIL', UKOIL: 'TVC:UKOIL', NGAS: 'TVC:NATGAS', NATGAS: 'TVC:NATGAS',
  SPX500: 'TVC:SPX', SPX: 'TVC:SPX', US500: 'TVC:SPX',
  NAS100: 'TVC:NDX', NDX: 'TVC:NDX', US100: 'TVC:NDX',
  US30: 'TVC:DJI', DJI: 'TVC:DJI',
  GER30: 'TVC:DEU30', DAX: 'TVC:DEU30', DE40: 'TVC:DEU30',
  UK100: 'TVC:UKX', FTSE: 'TVC:UKX',
  NI225: 'TVC:NI225', JPN225: 'TVC:NI225',
  BTCUSD: 'BINANCE:BTCUSDT', BTCUSDT: 'BINANCE:BTCUSDT',
  ETHUSD: 'BINANCE:ETHUSDT', ETHUSDT: 'BINANCE:ETHUSDT',
  BNBUSD: 'BINANCE:BNBUSDT', BNBUSDT: 'BINANCE:BNBUSDT',
  SOLUSD: 'BINANCE:SOLUSDT', SOLUSDT: 'BINANCE:SOLUSDT',
  XRPUSD: 'BINANCE:XRPUSDT', XRPUSDT: 'BINANCE:XRPUSDT',
  ADAUSD: 'BINANCE:ADAUSDT', DOGEUSD: 'BINANCE:DOGEUSDT',
};

function resolveTvSymbol(sym: string | null | undefined): string {
  const s = (sym || '').toUpperCase();
  if (!s) return 'OANDA:XAUUSD';
  if (s.includes(':')) return s;
  return SYMBOL_PREFIX[s] || `FX:${s}`;
}

function buildHtml(tvSymbol: string, bg: string, scheme: 'dark' | 'light'): string {
  // Same widget config as the web AdvancedChart (interval 5, candles,
  // drawing tools on, symbol-change off). Theme follows the app's
  // light/dark mode so the chart background matches the screen.
  const config = {
    autosize: true,
    symbol: tvSymbol,
    interval: '5',
    timezone: 'Etc/UTC',
    theme: scheme,
    style: '1',
    locale: 'en',
    enable_publishing: false,
    allow_symbol_change: false,
    hide_side_toolbar: false,
    withdateranges: true,
    hide_volume: false,
    details: false,
    studies: [],
    support_host: 'https://www.tradingview.com',
  };
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { height: 100%; margin: 0; padding: 0; background: ${bg}; overflow: hidden; }
  .tradingview-widget-container, .tradingview-widget-container__widget { height: 100%; width: 100%; }
  .tradingview-widget-copyright { display: none; }
</style>
</head>
<body>
  <div class="tradingview-widget-container">
    <div class="tradingview-widget-container__widget"></div>
    <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
${JSON.stringify(config)}
    </script>
  </div>
</body>
</html>`;
}

export function TradingViewChart({ symbol }: Props) {
  const theme = useTheme();
  const tvSymbol = useMemo(() => resolveTvSymbol(symbol), [symbol]);
  const bg = theme.colors.bg.base;
  const scheme: 'dark' | 'light' = theme.scheme === 'light' ? 'light' : 'dark';
  // key on symbol + scheme so a symbol switch or theme toggle fully reloads
  // the widget (the embed script reads its config once at load).
  const html = useMemo(() => buildHtml(tvSymbol, bg, scheme), [tvSymbol, bg, scheme]);

  return (
    <View style={{ flex: 1, backgroundColor: bg, overflow: 'hidden' }}>
      <WebView
        key={`${tvSymbol}-${scheme}`}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://www.tradingview.com' }}
        javaScriptEnabled
        domStorageEnabled
        scalesPageToFit={false}
        scrollEnabled={false}
        nestedScrollEnabled
        setSupportMultipleWindows={false}
        style={{ flex: 1, backgroundColor: bg }}
        startInLoadingState
        renderLoading={() => (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
            <ActivityIndicator color={theme.colors.buy} />
          </View>
        )}
      />
    </View>
  );
}
