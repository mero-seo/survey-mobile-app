import * as Device from "expo-device";
import { AppState, AppStateStatus } from "react-native";
import { getPendingSurveys } from "./surveyStorage";
import { pingDevice, syncPendingSurveys } from "./syncService";

export interface BackgroundSyncConfig {
  syncInterval: number; // in milliseconds
  enableAutoSync: boolean;
  deviceId: string;
}

class BackgroundSyncService {
  private syncInterval: number | null = null;
  private isActive: boolean = false;
  private config: BackgroundSyncConfig;
  private appStateListener: ((nextAppState: AppStateStatus) => void) | null =
    null;

  constructor(config: BackgroundSyncConfig) {
    this.config = config;
    this.setupAppStateListener();
  }

  private setupAppStateListener() {
    this.appStateListener = this.handleAppStateChange.bind(this);
    AppState.addEventListener("change", this.appStateListener);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === "active" && this.config.enableAutoSync) {
      this.startSync();
    } else if (nextAppState === "background" || nextAppState === "inactive") {
      this.stopSync();
    }
  };

  public startSync() {
    if (this.isActive || !this.config.enableAutoSync) {
      return;
    }

    this.isActive = true;
    console.log("Starting background sync service...");

    // Initial sync
    this.performSync();

    // Set up interval for periodic sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, this.config.syncInterval);
  }

  public stopSync() {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    console.log("Stopping background sync service...");

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private async performSync() {
    try {
      // Check if there are pending surveys
      const pendingSurveys = await getPendingSurveys();

      if (pendingSurveys.length === 0) {
        console.log("No pending surveys to sync");
        return;
      }

      console.log(
        `Background sync: Found ${pendingSurveys.length} pending surveys`
      );

      // Perform sync
      const result = await syncPendingSurveys();

      if (result.success) {
        console.log(
          `Background sync completed: ${result.syncedCount} synced, ${result.failedCount} failed`
        );
      } else {
        console.error("Background sync failed:", result.errors);
      }

      // Ping device to update last seen
      if (this.config.deviceId) {
        await pingDevice(this.config.deviceId);
      }
    } catch (error) {
      console.error("Background sync error:", error);
    }
  }

  public async manualSync(): Promise<boolean> {
    try {
      console.log("Manual sync triggered...");
      const result = await syncPendingSurveys();
      return result.success;
    } catch (error) {
      console.error("Manual sync failed:", error);
      return false;
    }
  }

  public updateConfig(newConfig: Partial<BackgroundSyncConfig>) {
    this.config = { ...this.config, ...newConfig };

    if (this.config.enableAutoSync && this.isActive) {
      // Restart with new config
      this.stopSync();
      this.startSync();
    }
  }

  public getStatus() {
    return {
      isActive: this.isActive,
      config: this.config,
    };
  }

  public cleanup() {
    this.stopSync();
    // Note: AppState.removeEventListener is not available in React Native
    // The listener will be cleaned up when the app is destroyed
  }
}

// Default configuration
const defaultConfig: BackgroundSyncConfig = {
  syncInterval: 5 * 60 * 1000, // 5 minutes
  enableAutoSync: true,
  deviceId: Device.deviceName || "unknown_device",
};

// Singleton instance
let backgroundSyncInstance: BackgroundSyncService | null = null;

export const initializeBackgroundSync = (
  config?: Partial<BackgroundSyncConfig>
) => {
  if (backgroundSyncInstance) {
    backgroundSyncInstance.cleanup();
  }

  const finalConfig = { ...defaultConfig, ...config };
  backgroundSyncInstance = new BackgroundSyncService(finalConfig);

  // Start sync if app is active
  if (AppState.currentState === "active") {
    backgroundSyncInstance.startSync();
  }

  return backgroundSyncInstance;
};

export const getBackgroundSync = () => backgroundSyncInstance;

export const startBackgroundSync = () => {
  if (backgroundSyncInstance) {
    backgroundSyncInstance.startSync();
  }
};

export const stopBackgroundSync = () => {
  if (backgroundSyncInstance) {
    backgroundSyncInstance.stopSync();
  }
};

export const manualSync = async (): Promise<boolean> => {
  if (backgroundSyncInstance) {
    return await backgroundSyncInstance.manualSync();
  }
  return false;
};
