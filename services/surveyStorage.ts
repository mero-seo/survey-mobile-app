import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";

// Check if SQLite is available (not available in Expo Go)
const isSQLiteAvailable = typeof SQLite !== "undefined" && SQLite.openDatabase;

let db: SQLite.SQLiteDatabase | null = null;

if (isSQLiteAvailable) {
  try {
    db = SQLite.openDatabase("survey.db");
  } catch (error) {
    console.warn("SQLite not available, falling back to AsyncStorage:", error);
  }
}

export type SurveyRow = {
  id: string;
  deviceId: string;
  location: string;
  answer: string;
  timestamp: string;
  syncStatus: "synced" | "pending" | "failed";
  retryCount: number;
  createdAt: string;
};

// AsyncStorage fallback functions
const SURVEYS_KEY = "surveys";

const getSurveysFromStorage = async (): Promise<SurveyRow[]> => {
  try {
    const surveysJson = await AsyncStorage.getItem(SURVEYS_KEY);
    return surveysJson ? JSON.parse(surveysJson) : [];
  } catch (error) {
    console.error("Error reading surveys from storage:", error);
    return [];
  }
};

const saveSurveysToStorage = async (surveys: SurveyRow[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(SURVEYS_KEY, JSON.stringify(surveys));
  } catch (error) {
    console.error("Error saving surveys to storage:", error);
  }
};

export const initSurveyTable = () => {
  if (db) {
    db.transaction((tx: SQLite.SQLiteTransaction) => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS surveys (
          id TEXT PRIMARY KEY NOT NULL,
          deviceId TEXT NOT NULL,
          location TEXT NOT NULL,
          answer TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          syncStatus TEXT DEFAULT 'pending',
          retryCount INTEGER DEFAULT 0,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );`
      );
    });
  } else {
    console.log("Using AsyncStorage for survey data");
  }
};

export const insertSurvey = async (survey: SurveyRow) => {
  if (db) {
    db.transaction((tx: SQLite.SQLiteTransaction) => {
      tx.executeSql(
        `INSERT INTO surveys (id, deviceId, location, answer, timestamp, syncStatus, retryCount, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          survey.id,
          survey.deviceId,
          survey.location,
          survey.answer,
          survey.timestamp,
          survey.syncStatus,
          survey.retryCount,
          survey.createdAt,
        ]
      );
    });
  } else {
    // Use AsyncStorage
    const surveys = await getSurveysFromStorage();
    surveys.push(survey);
    await saveSurveysToStorage(surveys);
  }
};

export const getPendingSurveys = async (): Promise<SurveyRow[]> => {
  if (db) {
    return new Promise((resolve, reject) => {
      db!.transaction((tx: SQLite.SQLiteTransaction) => {
        tx.executeSql(
          `SELECT * FROM surveys WHERE syncStatus != 'synced';`,
          [],
          (_: SQLite.SQLiteTransaction, { rows }: SQLite.SQLiteResultSet) =>
            resolve(rows._array as SurveyRow[]),
          (_: SQLite.SQLiteTransaction, error: SQLite.SQLiteError) => {
            reject(error);
            return false;
          }
        );
      });
    });
  } else {
    // Use AsyncStorage
    const surveys = await getSurveysFromStorage();
    return surveys.filter((survey) => survey.syncStatus !== "synced");
  }
};

export const updateSurveySyncStatus = async (
  id: string,
  syncStatus: "synced" | "pending" | "failed"
) => {
  if (db) {
    db.transaction((tx: SQLite.SQLiteTransaction) => {
      tx.executeSql(`UPDATE surveys SET syncStatus = ? WHERE id = ?;`, [
        syncStatus,
        id,
      ]);
    });
  } else {
    // Use AsyncStorage
    const surveys = await getSurveysFromStorage();
    const surveyIndex = surveys.findIndex((survey) => survey.id === id);
    if (surveyIndex !== -1) {
      surveys[surveyIndex].syncStatus = syncStatus;
      await saveSurveysToStorage(surveys);
    }
  }
};

export const incrementRetryCount = async (id: string) => {
  if (db) {
    db.transaction((tx: SQLite.SQLiteTransaction) => {
      tx.executeSql(
        `UPDATE surveys SET retryCount = retryCount + 1 WHERE id = ?;`,
        [id]
      );
    });
  } else {
    // Use AsyncStorage
    const surveys = await getSurveysFromStorage();
    const surveyIndex = surveys.findIndex((survey) => survey.id === id);
    if (surveyIndex !== -1) {
      surveys[surveyIndex].retryCount += 1;
      await saveSurveysToStorage(surveys);
    }
  }
};

export const cleanupSyncedSurveys = async () => {
  if (db) {
    db.transaction((tx: SQLite.SQLiteTransaction) => {
      tx.executeSql(`DELETE FROM surveys WHERE syncStatus = 'synced';`);
    });
  } else {
    // Use AsyncStorage
    const surveys = await getSurveysFromStorage();
    const filteredSurveys = surveys.filter(
      (survey) => survey.syncStatus !== "synced"
    );
    await saveSurveysToStorage(filteredSurveys);
  }
};
