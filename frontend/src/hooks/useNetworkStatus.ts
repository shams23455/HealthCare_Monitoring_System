import { useState, useEffect } from 'react';
import { networkStatusManager, NetworkStatusState } from '@/services/offline/networkStatus';

export function useNetworkStatus(): NetworkStatusState & {
  syncNow: () => Promise<any>;
  retryFailed: () => Promise<any>;
} {
  const [state, setState] = useState<NetworkStatusState>(networkStatusManager.getState());

  useEffect(() => {
    const unsubscribe = networkStatusManager.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  return {
    ...state,
    syncNow: () => networkStatusManager.syncNow(),
    retryFailed: () => networkStatusManager.retryFailed()
  };
}
