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
export function useRestedAd(): UseRestedAdResult {
  const supported = loadFullScreenAd.isSupported() && showFullScreenAd.isSupported();
  const [status, setStatus] = useState<RestAdStatus>(supported ? 'loading' : 'unsupported');
  const unregisterRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!supported) return;

    const loadOnce = () => {
      const unregister = loadFullScreenAd({
        options: { adGroupId: REST_AD_GROUP_ID },
        onEvent: (event) => {
          if (event.type === 'loaded') setStatus('ready');
        },
        onError: () => setStatus('error'),
      });
      unregisterRef.current = unregister;
    };

    loadOnce();
    return () => {
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
              if (loadEvent.type === 'loaded') setStatus('ready');
            },
            onError: () => setStatus('error'),
          });
          unregisterRef.current = unregister;
        }
        if (event.type === 'failedToShow') {
          setStatus('error');
        }
      },
      onError: () => setStatus('error'),
    });
  };

  return { status, show };
}
