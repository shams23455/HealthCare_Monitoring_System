import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface ConnectivityIndicatorProps {
  showSyncButton?: boolean;
  compact?: boolean;
}

export const ConnectivityIndicator: React.FC<ConnectivityIndicatorProps> = ({
  showSyncButton = true,
  compact = false
}) => {
  const {
    isOnline,
    isOffline,
    isSyncing,
    pendingCount,
    failedCount,
    syncNow,
    retryFailed
  } = useNetworkStatus();

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

  if (compact) {
    if (isOffline) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Offline
        </span>
      );
    }
    if (isSyncing) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
          <RefreshCw className="w-3 h-3 animate-spin text-blue-700" />
          Syncing
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Online
      </span>
    );
  }

  // 1. OFFLINE state
  if (isOffline) {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-xl text-xs font-semibold text-amber-900 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
          <span>🔴 <strong>Offline</strong> — Observations will sync automatically when connected.</span>
          {pendingCount > 0 && (
            <span className="bg-amber-200 text-amber-900 px-2 py-0.2 rounded-md font-bold text-[11px]">
              {pendingCount} saved offline
            </span>
          )}
        </div>
      </div>
    );
  }

  // 2. SYNCING state
  if (isSyncing) {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-blue-50 border border-blue-300 rounded-xl text-xs font-semibold text-blue-900 shadow-sm">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-700" />
          <span>🔄 Syncing {pendingCount > 0 ? `${pendingCount} observation(s)...` : 'offline data...'}</span>
        </div>
      </div>
    );
  }

  // 3. SYNC ERROR state
  if (failedCount > 0) {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-red-50 border border-red-300 rounded-xl text-xs font-semibold text-red-900 shadow-sm">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
          <span>⚠️ <strong>Sync Error</strong>: {failedCount} item(s) need attention</span>
        </div>
        <button
          onClick={() => retryFailed()}
          className="bg-red-700 hover:bg-red-800 text-white text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // 4. SYNC COMPLETE state
  if (justSynced) {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-900 shadow-sm animate-fade-in">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>✓ <strong>All observations synced.</strong></span>
        </div>
      </div>
    );
  }

  // 5. ONLINE state (with pending items or idle)
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        <span>🟢 <strong>Online</strong></span>
        {pendingCount > 0 && (
          <span className="text-emerald-700 text-[11px]">
            ({pendingCount} queued)
          </span>
        )}
      </div>

      {showSyncButton && pendingCount > 0 && (
        <button
          onClick={() => syncNow()}
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md transition-colors flex items-center gap-1 shadow-sm"
        >
          <RefreshCw className="w-3 h-3" />
          Sync Now
        </button>
      )}
    </div>
  );
};
