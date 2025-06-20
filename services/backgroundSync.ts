import { AppState, AppStateStatus } from "react-native";
import { getDeviceInfo } from "./deviceConfigService";
import { pingDevice, registerDevice, syncPendingSurveys } from "./syncService";

export type SyncStatus = "idle" | "syncing" | "success" | "error";

export interface BackgroundSyncState {
  status: SyncStatus;
  lastSync: string | null;
}

export interface BackgroundSyncConfig {
  syncInterval: number; // in milliseconds
  enableAutoSync: boolean;
  deviceId: string;
}

class BackgroundSyncService {
  private state: BackgroundSyncState = { status: "idle", lastSync: null };
  private syncInterval: ReturnType<typeof setTimeout> | null = null;
  private isInitialized = false;

  public initialize = (config: BackgroundSyncConfig) => {
    if (this.isInitialized) {
      console.log("Background sync already initialized");
      return;
    }

    console.log("Initializing background sync with config:", config);

    if (config.enableAutoSync) {
      this.syncInterval = setInterval(async () => {
        await this.performBackgroundSync();
      }, config.syncInterval);

      console.log(
        `Background sync started with ${config.syncInterval}ms interval`
      );
    }

    AppState.addEventListener("change", this.handleAppStateChange);
    this.isInitialized = true;
  };

  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === "active") {
      console.log("App became active - performing immediate sync");
      await this.performBackgroundSync();
    }
  };

  public manualSync = async () => {
    console.log("Manual sync triggered...");
    await this.performBackgroundSync();
  };

  public getStatus = (): BackgroundSyncState => {
    return { ...this.state };
  };

  public stop = () => {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log("Background sync stopped");
    }
    this.isInitialized = false;
  };

  private performBackgroundSync = async () => {
    if (this.state.status === "syncing") return;

    try {
      this.state.status = "syncing";
      console.log("Performing background sync...");

      const deviceInfo = await getDeviceInfo();
      const registered = await registerDevice(deviceInfo);
      if (registered) {
        console.log("Device registration successful during background sync");
      }

      await syncPendingSurveys();
      await pingDevice(deviceInfo.deviceId);

      this.state.status = "success";
      this.state.lastSync = new Date().toISOString();
      console.log("Background sync completed successfully");
    } catch (error) {
      this.state.status = "error";
      console.error("Background sync failed:", error);
    }
  };
}

const backgroundSyncService = new BackgroundSyncService();

export const initializeBackgroundSync = backgroundSyncService.initialize;
export const manualSync = backgroundSyncService.manualSync;
export const getBackgroundSyncStatus = backgroundSyncService.getStatus;
export const stopBackgroundSync = backgroundSyncService.stop;
