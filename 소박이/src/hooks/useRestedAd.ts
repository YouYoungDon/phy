import { useEffect, useRef, useState } from 'react';
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/framework';
import { REST_AD_GROUP_ID } from '../constants/ads';

export type RestAdStatus = 'loading' | 'ready' | 'showing' | 'unsupported' | 'error';

interface UseRestedAdResult {
  status: RestAdStatus;
  show: (onReward: () => void) => void;
}

// Wraps the load → show → reload cycle of the rewarded full-screen ad.
// The boundary the parent code relies on: `onReward` is invoked **only**
// when the SDK fires the `userEarnedReward` event. Dismissal alone never
// triggers it. The hook itself never imports business logic; the consumer
// passes a callback that does whatever grant work is needed.
// Note: the `error` state is terminal — there is no automatic retry. The TV
// component handles this by reducing opacity and redirecting taps to a bubble
// message.
export function useRestedAd(): UseRestedAdResult {
  // Treat an empty ad group id as unsupported. Production builds with the
  // PROD_REST_AD_GROUP_ID slot still empty resolve REST_AD_GROUP_ID to ''
  // — the SDK would reject the load with a confusing error, and a stale
  // dev id must never be used in production per AppsInToss policy. The TV
  // surface already handles 'unsupported' as a soft, non-error state.
  const supported = loadFullScreenAd.isSupported()
    && showFullScreenAd.isSupported()
    && REST_AD_GROUP_ID.length > 0;
  const [status, setStatus] = useState<RestAdStatus>(supported ? 'loading' : 'unsupported');
  const unregisterRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!supported) return;

    const loadOnce = () => {
      const unregister = loadFullScreenAd({
        options: { adGroupId: REST_AD_GROUP_ID },
        onEvent: (event) => {
          if (!mountedRef.current) return;
          if (event.type === 'loaded') setStatus('ready');
        },
        onError: () => {
          if (!mountedRef.current) return;
          setStatus('error');
        },
      });
      unregisterRef.current = unregister;
    };

    loadOnce();
    return () => {
      mountedRef.current = false;
      if (unregisterRef.current !== null) unregisterRef.current();
      unregisterRef.current = null;
    };
  }, [supported]);

  const show = (onReward: () => void) => {
    if (status !== 'ready') return;
    setStatus('showing');
    showFullScreenAd({
      options: { adGroupId: REST_AD_GROUP_ID },
      onEvent: (event) => {
        if (!mountedRef.current) return;
        // The trust signal. dismissed alone is NOT enough.
        if (event.type === 'userEarnedReward') {
          onReward();
        }
        if (event.type === 'dismissed') {
          setStatus('loading');
          // Preload the next ad. The new unregister supersedes the previous.
          const unregister = loadFullScreenAd({
            options: { adGroupId: REST_AD_GROUP_ID },
            onEvent: (loadEvent) => {
              if (!mountedRef.current) return;
              if (loadEvent.type === 'loaded') setStatus('ready');
            },
            onError: () => {
              if (!mountedRef.current) return;
              setStatus('error');
            },
          });
          unregisterRef.current = unregister;
        }
        if (event.type === 'failedToShow') {
          setStatus('error');
        }
      },
      onError: () => {
        if (!mountedRef.current) return;
        setStatus('error');
      },
    });
  };

  return { status, show };
}
