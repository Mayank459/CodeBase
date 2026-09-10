import { useState, useEffect, useCallback, useRef } from 'react';
import { checkBackendHealth } from '../api';

const PING_INTERVAL_SEC = 240; // 4 minutes

export function useKeepAlive() {
  const [health, setHealth] = useState({
    online: false,
    latency: null,
    lastPing: null,
    checking: true,
  });
  const [countdown, setCountdown] = useState(PING_INTERVAL_SEC);
  const timerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  const doPing = useCallback(async () => {
    setHealth(prev => ({ ...prev, checking: true }));
    const res = await checkBackendHealth();
    setHealth({
      online: res.online,
      latency: res.latency,
      lastPing: new Date(),
      checking: false,
    });
    setCountdown(PING_INTERVAL_SEC);
  }, []);

  useEffect(() => {
    // Initial ping
    doPing();

    // Regular keep-alive ping loop
    timerRef.current = setInterval(doPing, PING_INTERVAL_SEC * 1000);

    // 1-second countdown ticker
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => (prev > 1 ? prev - 1 : PING_INTERVAL_SEC));
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownTimerRef.current);
    };
  }, [doPing]);

  return {
    ...health,
    countdown,
    refresh: doPing,
  };
}
