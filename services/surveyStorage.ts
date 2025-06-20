import * as SQLite from "expo-sqlite";

export interface Survey {
  id: string;
  deviceId: string;
  location: string;
  answer: string;
  timestamp: string;
  syncStatus: "synced" | "pending" | "failed";
  retryCount: number;
  createdAt: string;
  deviceModel?: string;
  deviceOs?: string;
  deviceVersion?: string;
  appVersion?: string;
}

const db = SQLite.openDatabaseSync("survey.db");

// Create the surveys table if it doesn't exist
export async function initSurveyTable() {
  await db.execAsync(`CREATE TABLE IF NOT EXISTS surveys (
    id TEXT PRIMARY KEY NOT NULL,
    deviceId TEXT NOT NULL,
    location TEXT NOT NULL,
    answer TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    syncStatus TEXT DEFAULT 'pending',
    retryCount INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    deviceModel TEXT,
    deviceOs TEXT,
    deviceVersion TEXT,
    appVersion TEXT
  );`);
}

// Add a new survey
export async function addSurvey(survey: Survey): Promise<void> {
  const stmt = await db.prepareAsync(
    `INSERT INTO surveys (id, deviceId, location, answer, timestamp, syncStatus, retryCount, createdAt, deviceModel, deviceOs, deviceVersion, appVersion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
  );
  try {
    await stmt.executeAsync([
      survey.id,
      survey.deviceId,
      survey.location,
      survey.answer,
      survey.timestamp,
      survey.syncStatus,
      survey.retryCount,
      survey.createdAt,
      survey.deviceModel || null,
      survey.deviceOs || null,
      survey.deviceVersion || null,
      survey.appVersion || null,
    ]);
  } finally {
    await stmt.finalizeAsync();
  }
}

// Get all surveys
export async function getAllSurveys(): Promise<Survey[]> {
  const stmt = await db.prepareAsync(
    `SELECT * FROM surveys ORDER BY createdAt DESC;`
  );
  try {
    const result = await stmt.executeAsync([]);
    return (await result.getAllAsync()) as Survey[];
  } finally {
    await stmt.finalizeAsync();
  }
}

// Get all pending or failed surveys
export async function getPendingSurveys(): Promise<Survey[]> {
  const stmt = await db.prepareAsync(
    `SELECT * FROM surveys WHERE syncStatus = 'pending' OR syncStatus = 'failed' ORDER BY createdAt ASC;`
  );
  try {
    const result = await stmt.executeAsync([]);
    return (await result.getAllAsync()) as Survey[];
  } finally {
    await stmt.finalizeAsync();
  }
}

// Update sync status and retry count for a survey
export async function updateSurveySyncStatus(
  id: string,
  syncStatus: "synced" | "pending" | "failed",
  retryCount: number = 0
): Promise<void> {
  const stmt = await db.prepareAsync(
    `UPDATE surveys SET syncStatus = ?, retryCount = ? WHERE id = ?;`
  );
  try {
    await stmt.executeAsync([syncStatus, retryCount, id]);
  } finally {
    await stmt.finalizeAsync();
  }
}

// Delete all synced surveys
export async function deleteSyncedSurveys(): Promise<void> {
  const stmt = await db.prepareAsync(
    `DELETE FROM surveys WHERE syncStatus = 'synced';`
  );
  try {
    await stmt.executeAsync([]);
  } finally {
    await stmt.finalizeAsync();
  }
}

// Close the database (optional, not usually needed in Expo)
export async function closeSurveyDB() {
  await db.closeAsync();
}

// Get survey statistics
export const getSurveyStats = async () => {
  try {
    const pendingSurveys = await getPendingSurveys();
    const syncedSurveys = await getSurveysByStatus("synced");
    const failedSurveys = await getSurveysByStatus("failed");

    return {
      pendingCount: pendingSurveys.length,
      syncedCount: syncedSurveys.length,
      failedCount: failedSurveys.length,
      totalCount:
        pendingSurveys.length + syncedSurveys.length + failedSurveys.length,
    };
  } catch (error) {
    console.error("Failed to get survey stats:", error);
    return {
      pendingCount: 0,
      syncedCount: 0,
      failedCount: 0,
      totalCount: 0,
    };
  }
};

// Get surveys by sync status
export const getSurveysByStatus = async (
  status: "synced" | "pending" | "failed"
) => {
  try {
    const result = await db.getAllAsync(
      "SELECT * FROM surveys WHERE syncStatus = ? ORDER BY createdAt DESC",
      [status]
    );
    return result || [];
  } catch (error) {
    console.error(`Failed to get surveys with status ${status}:`, error);
    return [];
  }
};

// Validate survey data before saving
export function validateSurveyData(survey: Survey): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!survey.id || survey.id.trim() === "") {
    errors.push("Survey ID is required");
  }

  if (!survey.deviceId || survey.deviceId.trim() === "") {
    errors.push("Device ID is required");
  }

  if (!survey.location || survey.location.trim() === "") {
    errors.push("Location is required");
  }

  if (!survey.answer || survey.answer.trim() === "") {
    errors.push("Answer is required");
  }

  if (!survey.timestamp || survey.timestamp.trim() === "") {
    errors.push("Timestamp is required");
  }

  // Validate answer format
  const validAnswers = ["EXCELLENT", "SATISFACTORY", "AVERAGE"];
  if (!validAnswers.includes(survey.answer.toUpperCase())) {
    errors.push("Answer must be one of: EXCELLENT, SATISFACTORY, AVERAGE");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Validate device info completeness
export function validateDeviceInfo(deviceInfo: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!deviceInfo.deviceId || deviceInfo.deviceId.trim() === "") {
    errors.push("Device ID is required");
  }

  if (!deviceInfo.location || deviceInfo.location.trim() === "") {
    errors.push("Location is required");
  }

  if (!deviceInfo.name || deviceInfo.name.trim() === "") {
    errors.push("Device name is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
