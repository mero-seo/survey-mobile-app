import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabase("survey.db");

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

export const initSurveyTable = () => {
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
};

export const insertSurvey = (survey: SurveyRow) => {
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
};

export const getPendingSurveys = (): Promise<SurveyRow[]> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx: SQLite.SQLiteTransaction) => {
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
};

export const updateSurveySyncStatus = (
  id: string,
  syncStatus: "synced" | "pending" | "failed"
) => {
  db.transaction((tx: SQLite.SQLiteTransaction) => {
    tx.executeSql(`UPDATE surveys SET syncStatus = ? WHERE id = ?;`, [
      syncStatus,
      id,
    ]);
  });
};

export const incrementRetryCount = (id: string) => {
  db.transaction((tx: SQLite.SQLiteTransaction) => {
    tx.executeSql(
      `UPDATE surveys SET retryCount = retryCount + 1 WHERE id = ?;`,
      [id]
    );
  });
};

export const cleanupSyncedSurveys = () => {
  db.transaction((tx: SQLite.SQLiteTransaction) => {
    tx.executeSql(`DELETE FROM surveys WHERE syncStatus = 'synced';`);
  });
};
