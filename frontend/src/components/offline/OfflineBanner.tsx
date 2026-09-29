import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export const OfflineBanner: React.FC = () => {
  const { isOffline, isSyncing, pendingCount, failedCount, syncNow, retryFailed } = useNetworkStatus();
  const [justSynced, setJustSynced] = useState(false);
  const [prevSyncing, setPrevSyncing] = useState(false);

  useEffect(() => {
    if (prevSyncing && !isSyncing && failedCount === 0 && pendingCount === 0) {
      setJustSynced(true);
      const timer = setTimeout(() => setJustSynced(false), 4000);
      return () => clearTimeout(timer);
    }
    setPrevSyncing(isSyncing);
  }, [isSyncing, failedCount, pendingCount, prevSyncing]);

  if (isOffline) {
    return (
      <div className="bg-amber-600 text-white text-xs sm:text-sm font-bold px-4 py-2.5 flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-2 mx-auto">
          <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
          <span>🔴 Offline — Observations will sync automatically when connected.</span>
          {pendingCount > 0 && (
            <span className="bg-amber-700/90 px-2 py-0.5 rounded-full text-xs">
              ({pendingCount} saved locally)
            </span>
          )}
        </div>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="bg-farm-700 text-white text-xs sm:text-sm font-bold px-4 py-2 flex items-center justify-center gap-2 shadow-inner animate-pulse">
        <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
        <span>🔄 Syncing {pendingCount > 0 ? `${pendingCount} observation(s)...` : 'offline data with server...'}</span>
      </div>
    );
  }

  if (failedCount > 0) {
    return (
      <div className="bg-red-700 text-white text-xs sm:text-sm font-bold px-4 py-2 flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>⚠️ Sync Error: {failedCount} item(s) failed to sync.</span>
        </div>
        <button
          onClick={() => retryFailed()}
          className="bg-white text-red-800 hover:bg-red-50 text-xs px-2.5 py-1 rounded-lg font-extrabold shadow-sm transition-colors"
        >
          Retry Failed
        </button>
      </div>
    );
  }

  if (justSynced) {
    return (
      <div className="bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 py-2 flex items-center justify-center gap-2 shadow-inner">
        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
        <span>✓ All observations synced.</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="bg-farm-800 text-white text-xs sm:text-sm font-bold px-4 py-2 flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-farm-300" />
          <span>{pendingCount} offline observation(s) ready to sync.</span>
        </div>
        <button
          onClick={() => syncNow()}
          className="bg-white text-farm-900 hover:bg-farm-50 text-xs px-2.5 py-1 rounded-lg font-extrabold shadow-sm transition-colors"
        >
          Sync Now
        </button>
      </div>
    );
  }

  return null;
};
