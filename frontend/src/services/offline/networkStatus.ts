import { syncService } from './syncService';
import { getQueueSummary, resetFailedQueueItems } from './offlineQueue';

export interface NetworkStatusState {
  isOnline: boolean;
  isOffline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncingCount: number;
  failedCount: number;
  hasUnsynced: boolean;
}

type NetworkSubscriber = (state: NetworkStatusState) => void;

class NetworkStatusManager {
  private isOnlineState: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private subscribers: NetworkSubscriber[] = [];
  private state: NetworkStatusState = {
    isOnline: this.isOnlineState,
    isOffline: !this.isOnlineState,
    isSyncing: false,
    pendingCount: 0,
    syncingCount: 0,
    failedCount: 0,
    hasUnsynced: false
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
      syncService.subscribe(() => this.updateState());
      this.updateState();
    }
  }

  private handleNetworkChange(online: boolean) {
    this.isOnlineState = online;
    this.updateState();
    if (online) {
      syncService.syncAll();
    }
  }

  public async updateState() {
    const queue = await getQueueSummary();
    const syncState = syncService.getSyncState();

    this.state = {
      isOnline: this.isOnlineState,
      isOffline: !this.isOnlineState,
      isSyncing: syncState.isSyncing,
      pendingCount: queue.pendingCount,
      syncingCount: queue.syncingCount,
      failedCount: queue.failedCount,
      hasUnsynced: queue.hasUnsynced
    };

    this.subscribers.forEach((sub) => {
      try {
        sub(this.state);
      } catch (err) {
        console.error('[NetworkStatusManager] Subscriber error:', err);
      }
    });
  }

  public subscribe(callback: NetworkSubscriber) {
    this.subscribers.push(callback);
    callback(this.state);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  public getState(): NetworkStatusState {
    return this.state;
  }

  public async syncNow() {
    await this.updateState();
    return syncService.syncAll();
  }

  public async retryFailed() {
    await resetFailedQueueItems();
    await this.updateState();
    return syncService.syncAll();
  }
}

export const networkStatusManager = new NetworkStatusManager();
