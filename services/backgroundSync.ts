import { AppState, AppStateStatus } from "react-native";
import {
  getDeviceInfo,
  getDeviceStatusFromBackend,
  saveDeviceStatus,
  syncDeviceConfigFromBackend,
  updateLocalDeviceInfo,
} from "./deviceConfigService";
import {
  getLatestDeviceInfo,
  pingDevice,
  registerDevice,
  syncPendingSurveys,
} from "./syncService";

export type SyncStatus = "idle" | "syncing" | "success" | "error";

export interface BackgroundSyncState {
  status: SyncStatus;
  lastSync: string | null;
  activeSyncs: number; // Track number of active syncs
}

let syncState: BackgroundSyncState = {
  status: "idle",
  lastSync: null,
  activeSyncs: 0,
};

let syncInterval: ReturnType<typeof setInterval> | null = null;
let appStateListener: any = null;
let lastSyncTime = 0; // Track last sync time to prevent rapid successive syncs
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

class BackgroundSyncService {
  private state: BackgroundSyncState = syncState;
  private interval: ReturnType<typeof setInterval> | null = null;
  private appStateListener: any = null;
  private isInitialized = false;

  constructor() {
    this.setupAppStateListener();
  }

  private setupAppStateListener = () => {
    this.appStateListener = AppState.addEventListener(
      "change",
      this.handleAppStateChange
    );
  };

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === "active") {
      console.log("App became active, performing sync...");
      this.performBackgroundSync();
    } else if (nextAppState === "background") {
      console.log("App went to background");
    }
  };

  startPeriodicSync = (intervalMinutes: number = 5) => {
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.interval = setInterval(() => {
      this.performBackgroundSync();
    }, intervalMinutes * 60 * 1000);

    console.log(`Started periodic sync every ${intervalMinutes} minutes`);
  };

  stopPeriodicSync = () => {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log("Stopped periodic sync");
    }
  };

  getStatus = (): BackgroundSyncState => {
    return {
      ...this.state,
      activeSyncs: this.state.activeSyncs,
    };
  };

  // Debounced sync function to prevent rapid successive calls
  performBackgroundSync = async (force: boolean = false) => {
    const now = Date.now();
    // Use longer debounce time in development to prevent rate limiting
    const minInterval = __DEV__ ? 60000 : 30000; // 60 seconds in dev, 30 seconds in production

    // If not forced and last sync was too recent, debounce the call
    if (!force && now - lastSyncTime < minInterval) {
      console.log(
        `Sync requested too soon (${Math.round(
          (now - lastSyncTime) / 1000
        )}s ago), debouncing...`
      );

      // Clear existing debounce timer
      if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
      }

      // Set new debounce timer
      syncDebounceTimer = setTimeout(() => {
        this.performBackgroundSyncInternal();
      }, minInterval - (now - lastSyncTime));

      return;
    }

    // Clear any pending debounce timer
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
      syncDebounceTimer = null;
    }

    await this.performBackgroundSyncInternal();
  };

  private performBackgroundSyncInternal = async () => {
    // Prevent multiple simultaneous syncs
    if (this.state.activeSyncs > 0) {
      console.log(
        `Sync already in progress (${this.state.activeSyncs} active), skipping...`
      );
      return;
    }

    // Allow multiple simultaneous syncs
    this.state.activeSyncs++;
    const syncId = this.state.activeSyncs; // Track this specific sync
    lastSyncTime = Date.now();

    try {
      this.state.status = "syncing";
      console.log(
        `Performing background sync #${syncId}... (Development: ${__DEV__})`
      );

      const deviceInfo = await getDeviceInfo();

      // Register device if needed
      const registered = await registerDevice(deviceInfo);
      if (registered) {
        console.log(
          `Device registration successful during background sync #${syncId}`
        );
      }

      // Sync device configuration and status from backend
      const configSynced = await syncDeviceConfigFromBackend(
        deviceInfo.deviceId
      );
      if (configSynced) {
        console.log(
          `Device configuration synced from backend (sync #${syncId})`
        );
      }

      // Check device status from backend
      const status = await getDeviceStatusFromBackend(deviceInfo.deviceId);
      if (status) {
        await saveDeviceStatus(status);
        console.log(
          `Device status synced from backend (sync #${syncId}):`,
          status.status
        );
      }

      // Sync pending surveys
      await syncPendingSurveys();

      // Ping device to update last seen
      await pingDevice(deviceInfo.deviceId);

      // Update local device information
      await updateLocalDeviceInfo(
        deviceInfo.deviceId,
        deviceInfo.name,
        deviceInfo.location
      );

      // Fetch latest device information
      const latestDeviceInfo = await getLatestDeviceInfo(deviceInfo.deviceId);
      if (latestDeviceInfo) {
        console.log("Latest device information fetched:", latestDeviceInfo);
      }

      this.state.status = "success";
      this.state.lastSync = new Date().toISOString();
      console.log(`Background sync #${syncId} completed successfully`);
    } catch (error: any) {
      this.state.status = "error";

      // Handle rate limiting specifically
      if (error.response?.status === 429) {
        console.log(
          `Background sync #${syncId} rate limited, will retry later (Development: ${__DEV__})`
        );
        // Don't log as error for rate limiting
      } else {
        console.error(`Background sync #${syncId} failed:`, error);
      }
    } finally {
      // Decrement active syncs count
      this.state.activeSyncs = Math.max(0, this.state.activeSyncs - 1);

      // Update status based on remaining active syncs
      if (this.state.activeSyncs === 0) {
        this.state.status = this.state.status === "error" ? "error" : "success";
      }
    }
  };

  // Add a separate function for quick status checks
  checkDeviceStatus = async () => {
    try {
      const deviceInfo = await getDeviceInfo();
      const status = await getDeviceStatusFromBackend(deviceInfo.deviceId);
      if (status) {
        await saveDeviceStatus(status);
        console.log("Device status checked:", status.status);
        return status;
      }
    } catch (error) {
      console.error("Device status check failed:", error);
    }
    return null;
  };

  cleanup = () => {
    this.stopPeriodicSync();
    if (this.appStateListener) {
      this.appStateListener.remove();
    }
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
      syncDebounceTimer = null;
    }
  };
}

// Global instance
let backgroundSyncService: BackgroundSyncService | null = null;

export const getBackgroundSyncService = (): BackgroundSyncService => {
  if (!backgroundSyncService) {
    backgroundSyncService = new BackgroundSyncService();
  }
  return backgroundSyncService;
};

export const getBackgroundSyncStatus = (): BackgroundSyncState => {
  return getBackgroundSyncService().getStatus();
};

export const startBackgroundSync = (intervalMinutes: number = 10) => {
  // In development, use longer intervals to prevent rate limiting
  const isDevelopment = __DEV__;
  const adjustedInterval = isDevelopment
    ? Math.max(intervalMinutes, 5)
    : intervalMinutes;

  if (isDevelopment) {
    console.log(
      `Development mode: Using ${adjustedInterval} minute sync interval to prevent rate limiting`
    );
  }

  getBackgroundSyncService().startPeriodicSync(adjustedInterval);
};

export const stopBackgroundSync = () => {
  getBackgroundSyncService().stopPeriodicSync();
};

export const manualSync = async (force: boolean = false): Promise<void> => {
  const service = getBackgroundSyncService();
  await service.performBackgroundSync(force);
};

export const checkDeviceStatus = async () => {
  const service = getBackgroundSyncService();
  return await service.checkDeviceStatus();
};

export const cleanupBackgroundSync = () => {
  if (backgroundSyncService) {
    backgroundSyncService.cleanup();
    backgroundSyncService = null;
  }
  // Reset global state
  syncState = {
    status: "idle",
    lastSync: null,
    activeSyncs: 0,
  };
  lastSyncTime = 0;
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
};
