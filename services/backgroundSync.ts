import { AppState, AppStateStatus } from "react-native";
import {
  getPendingSurveys,
  incrementRetryCount,
  updateSurveySyncStatus,
} from "./surveyStorage";
import { syncPendingSurveys } from "./syncService";

interface BackgroundSyncOptions {
  interval?: number; // Sync interval in minutes
  onSyncStart?: () => void;
  onSyncComplete?: (syncedCount: number, failedCount: number) => void;
  onSyncError?: (error: Error) => void;
}

class BackgroundSyncService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private options: BackgroundSyncOptions;
  private isRunning = false;
  private appStateSubscription: any = null;

  constructor(options: BackgroundSyncOptions = {}) {
    this.options = {
      interval: 5, // Default 5 minutes
      ...options,
    };
  }

  start() {
    if (this.isRunning) {
      console.log("Background sync already running");
      return;
    }

    console.log("Starting background sync service");
    this.isRunning = true;

    // Start periodic sync
    this.scheduleNextSync();

    // Listen for app state changes
    this.appStateSubscription = AppState.addEventListener(
      "change",
      this.handleAppStateChange
    );
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log("Stopping background sync service");
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  private scheduleNextSync() {
    if (!this.isRunning) return;

    const intervalMs = (this.options.interval || 5) * 60 * 1000; // Convert minutes to milliseconds

    this.intervalId = setInterval(() => {
      this.performSync();
    }, intervalMs);

    console.log(`Next sync scheduled in ${this.options.interval} minutes`);
  }

  private async performSync() {
    if (!this.isRunning) return;

    try {
      this.options.onSyncStart?.();
      console.log("Starting background sync...");

      const pendingSurveys = await getPendingSurveys();

      if (pendingSurveys.length === 0) {
        console.log("No pending surveys to sync");
        this.options.onSyncComplete?.(0, 0);
        return;
      }

      let syncedCount = 0;
      let failedCount = 0;

      await syncPendingSurveys(
        pendingSurveys,
        // On success
        (id: string) => {
          updateSurveySyncStatus(id, "synced");
          syncedCount++;
          console.log(`Survey ${id} synced successfully`);
        },
        // On error
        (id: string, error: Error) => {
          incrementRetryCount(id);
          updateSurveySyncStatus(id, "failed");
          failedCount++;
          console.error(`Failed to sync survey ${id}:`, error);
        }
      );

      console.log(
        `Background sync completed: ${syncedCount} synced, ${failedCount} failed`
      );
      this.options.onSyncComplete?.(syncedCount, failedCount);
    } catch (error) {
      console.error("Background sync error:", error);
      this.options.onSyncError?.(error as Error);
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === "active") {
      // App became active, perform immediate sync
      console.log("App became active, performing immediate sync");
      this.performSync();
    }
  };

  // Manual sync trigger
  async triggerSync() {
    console.log("Manual sync triggered");
    await this.performSync();
  }
}

// Singleton instance
let backgroundSyncInstance: BackgroundSyncService | null = null;

export const getBackgroundSyncService = (
  options?: BackgroundSyncOptions
): BackgroundSyncService => {
  if (!backgroundSyncInstance) {
    backgroundSyncInstance = new BackgroundSyncService(options);
  }
  return backgroundSyncInstance;
};

export const startBackgroundSync = (options?: BackgroundSyncOptions) => {
  const service = getBackgroundSyncService(options);
  service.start();
};

export const stopBackgroundSync = () => {
  if (backgroundSyncInstance) {
    backgroundSyncInstance.stop();
  }
};

export const triggerManualSync = async () => {
  if (backgroundSyncInstance) {
    await backgroundSyncInstance.triggerSync();
  }
};
