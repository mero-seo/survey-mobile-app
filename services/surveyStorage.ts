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
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );`);
}

// Add a new survey
export async function addSurvey(survey: Survey): Promise<void> {
  const stmt = await db.prepareAsync(
    `INSERT INTO surveys (id, deviceId, location, answer, timestamp, syncStatus, retryCount, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`
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
