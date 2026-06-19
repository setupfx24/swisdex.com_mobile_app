import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { apiConfig } from '@/lib/api/config';
import { useTheme } from '@/theme';

/**
 * Cloudflare Turnstile widget for React Native.
 *
 * Turnstile is a browser widget, so we host it in a WebView: the page loads
 * Cloudflare's api.js, renders the challenge, and posts the solved token back
 * to RN via `window.ReactNativeWebView.postMessage`. We set the WebView's
 * baseUrl to the production host so the widget's origin matches the domains
 * the site key is registered for (otherwise Turnstile rejects with a domain
 * error). Mirrors the web trader's TurnstileWidget → cf_turnstile_token flow.
 *
 * Renders nothing when no site key is configured (Turnstile disabled).
 */

interface Props {
  /** Called with the solved token, or '' when it errors / expires. */
  onToken: (token: string) => void;
}

// Must be a domain the Turnstile site key is allowed on (production host).
const BASE_URL = 'https://swisdex.com';

function buildHtml(siteKey: string, theme: 'dark' | 'light'): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  #cf { display: flex; align-items: center; justify-content: flex-start; }
</style>
</head>
<body>
  <div id="cf"></div>
  <script>
    function send(m) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m));
    }
    var widgetId;
    function render() {
      if (!window.turnstile) { setTimeout(render, 200); return; }
      try {
        widgetId = window.turnstile.render('#cf', {
          sitekey: '${siteKey}',
          theme: '${theme}',
          callback: function (t) { send({ type: 'token', token: t }); },
          'error-callback': function () {
            send({ type: 'error' });
            // Auto-fetch a fresh challenge so the user isn't stuck on a dead widget.
            try { if (widgetId) window.turnstile.reset(widgetId); } catch (e) {}
          },
          'expired-callback': function () {
            // Tokens live ~5 min. Reset on expiry so a fresh, valid token is
            // ready by the time the user taps Create account.
            send({ type: 'expired' });
            try { if (widgetId) window.turnstile.reset(widgetId); } catch (e) {}
          },
        });
      } catch (e) { send({ type: 'error' }); }
    }
    render();
  </script>
</body>
</html>`;
}

export function TurnstileWidget({ onToken }: Props) {
  const theme = useTheme();
  const siteKey = apiConfig.turnstileSiteKey;
  if (!siteKey) return null;

  const scheme: 'dark' | 'light' = theme.scheme === 'light' ? 'light' : 'dark';

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type?: string; token?: string };
      if (msg.type === 'token' && msg.token) onToken(msg.token);
      else if (msg.type === 'error' || msg.type === 'expired') onToken('');
    } catch {
      /* ignore non-JSON frames */
    }
  };

  return (
    <View style={{ height: 72, overflow: 'hidden' }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: buildHtml(siteKey, scheme), baseUrl: BASE_URL }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />
    </View>
  );
}
