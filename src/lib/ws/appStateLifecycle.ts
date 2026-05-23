import { AppState, type AppStateStatus } from 'react-native';
import { priceSocket } from './priceSocket';
import { tradeSocket } from './tradeSocket';
import { barSocket } from './barSocket';

// Keep WS sockets alive only while the app is foregrounded. Mobile OSes
// kill them in the background anyway; explicitly pausing avoids reconnect
// thrash and battery cost during the background→foreground transition.

let subscription: { remove: () => void } | null = null;
let lastState: AppStateStatus = AppState.currentState;

export function startWebSocketLifecycle() {
  if (subscription) return;
  subscription = AppState.addEventListener('change', (next) => {
    const goingBackground = lastState === 'active' && next !== 'active';
    const comingForeground = lastState !== 'active' && next === 'active';
    lastState = next;
    if (goingBackground) {
      priceSocket.pause();
      tradeSocket.pause();
      barSocket.pause();
    } else if (comingForeground) {
      priceSocket.connect();
      const acctId = tradeSocket.currentAccountId;
      if (acctId) void tradeSocket.connect(acctId);
      barSocket.resume();
    }
  });
}

export function stopWebSocketLifecycle() {
  subscription?.remove();
  subscription = null;
}
