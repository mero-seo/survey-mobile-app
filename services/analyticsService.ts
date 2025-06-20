import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDeviceInfo } from "./deviceConfigService";

export interface AnalyticsEvent {
  id: string;
  eventType:
    | "survey_submitted"
    | "survey_synced"
    | "device_registered"
    | "sync_failed"
    | "app_opened"
    | "admin_panel_opened";
  timestamp: string;
  deviceId: string;
  location: string;
  metadata?: any;
}

export interface AnalyticsData {
  totalSurveys: number;
  syncedSurveys: number;
  failedSurveys: number;
  syncSuccessRate: number;
  averageSyncTime: number;
  deviceUptime: number;
  lastSyncTime?: string;
  dailyStats: {
    [date: string]: {
      surveysSubmitted: number;
      surveysSynced: number;
      syncFailures: number;
    };
  };
}

const ANALYTICS_STORAGE_KEY = "analytics_data";
const EVENTS_STORAGE_KEY = "analytics_events";

// Track an analytics event
export const trackEvent = async (
  eventType: AnalyticsEvent["eventType"],
  metadata?: any
): Promise<void> => {
  try {
    const deviceInfo = await getDeviceInfo();
    const event: AnalyticsEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      timestamp: new Date().toISOString(),
      deviceId: deviceInfo.deviceId,
      location: deviceInfo.location,
      metadata,
    };

    // Get existing events
    const existingEventsJson = await AsyncStorage.getItem(EVENTS_STORAGE_KEY);
    const existingEvents: AnalyticsEvent[] = existingEventsJson
      ? JSON.parse(existingEventsJson)
      : [];

    // Add new event
    const updatedEvents = [...existingEvents, event];

    // Keep only last 1000 events to prevent storage bloat
    const trimmedEvents = updatedEvents.slice(-1000);

    // Save events
    await AsyncStorage.setItem(
      EVENTS_STORAGE_KEY,
      JSON.stringify(trimmedEvents)
    );

    // Update analytics data
    await updateAnalyticsData(event);

    console.log("Analytics event tracked:", event);
  } catch (error) {
    console.error("Failed to track analytics event:", error);
  }
};

// Update analytics data based on new event
const updateAnalyticsData = async (event: AnalyticsEvent): Promise<void> => {
  try {
    const existingDataJson = await AsyncStorage.getItem(ANALYTICS_STORAGE_KEY);
    const existingData: AnalyticsData = existingDataJson
      ? JSON.parse(existingDataJson)
      : getDefaultAnalyticsData();

    const today = new Date().toISOString().split("T")[0];

    // Update daily stats
    if (!existingData.dailyStats[today]) {
      existingData.dailyStats[today] = {
        surveysSubmitted: 0,
        surveysSynced: 0,
        syncFailures: 0,
      };
    }

    // Update based on event type
    switch (event.eventType) {
      case "survey_submitted":
        existingData.totalSurveys++;
        existingData.dailyStats[today].surveysSubmitted++;
        break;
      case "survey_synced":
        existingData.syncedSurveys++;
        existingData.dailyStats[today].surveysSynced++;
        existingData.lastSyncTime = event.timestamp;
        if (event.metadata?.syncTime) {
          existingData.averageSyncTime =
            (existingData.averageSyncTime + event.metadata.syncTime) / 2;
        }
        break;
      case "sync_failed":
        existingData.failedSurveys++;
        existingData.dailyStats[today].syncFailures++;
        break;
    }

    // Calculate sync success rate
    const totalSyncAttempts =
      existingData.syncedSurveys + existingData.failedSurveys;
    existingData.syncSuccessRate =
      totalSyncAttempts > 0
        ? (existingData.syncedSurveys / totalSyncAttempts) * 100
        : 0;

    // Clean up old daily stats (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split("T")[0];

    Object.keys(existingData.dailyStats).forEach((date) => {
      if (date < cutoffDate) {
        delete existingData.dailyStats[date];
      }
    });

    // Save updated data
    await AsyncStorage.setItem(
      ANALYTICS_STORAGE_KEY,
      JSON.stringify(existingData)
    );
  } catch (error) {
    console.error("Failed to update analytics data:", error);
  }
};

// Get analytics data
export const getAnalyticsData = async (): Promise<AnalyticsData> => {
  try {
    const dataJson = await AsyncStorage.getItem(ANALYTICS_STORAGE_KEY);
    return dataJson ? JSON.parse(dataJson) : getDefaultAnalyticsData();
  } catch (error) {
    console.error("Failed to get analytics data:", error);
    return getDefaultAnalyticsData();
  }
};

// Get analytics events
export const getAnalyticsEvents = async (
  limit: number = 100
): Promise<AnalyticsEvent[]> => {
  try {
    const eventsJson = await AsyncStorage.getItem(EVENTS_STORAGE_KEY);
    const events: AnalyticsEvent[] = eventsJson ? JSON.parse(eventsJson) : [];
    return events.slice(-limit).reverse(); // Return most recent events first
  } catch (error) {
    console.error("Failed to get analytics events:", error);
    return [];
  }
};

// Get default analytics data
const getDefaultAnalyticsData = (): AnalyticsData => ({
  totalSurveys: 0,
  syncedSurveys: 0,
  failedSurveys: 0,
  syncSuccessRate: 0,
  averageSyncTime: 0,
  deviceUptime: 0,
  dailyStats: {},
});

// Reset analytics data
export const resetAnalytics = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ANALYTICS_STORAGE_KEY);
    await AsyncStorage.removeItem(EVENTS_STORAGE_KEY);
    console.log("Analytics data reset");
  } catch (error) {
    console.error("Failed to reset analytics:", error);
  }
};

// Export analytics data for backend
export const exportAnalyticsData = async (): Promise<any> => {
  try {
    const analyticsData = await getAnalyticsData();
    const recentEvents = await getAnalyticsEvents(100);
    const deviceInfo = await getDeviceInfo();

    return {
      deviceId: deviceInfo.deviceId,
      location: deviceInfo.location,
      timestamp: new Date().toISOString(),
      analytics: analyticsData,
      recentEvents,
    };
  } catch (error) {
    console.error("Failed to export analytics data:", error);
    return null;
  }
};
