declare module "expo-sqlite" {
  export interface SQLiteDatabase {
    transaction(callback: (transaction: SQLiteTransaction) => void): void;
  }

  export interface SQLiteTransaction {
    executeSql(
      sqlStatement: string,
      arguments?: any[],
      callback?: (
        transaction: SQLiteTransaction,
        resultSet: SQLiteResultSet
      ) => void,
      errorCallback?: (
        transaction: SQLiteTransaction,
        error: SQLiteError
      ) => boolean
    ): void;
  }

  export interface SQLiteResultSet {
    insertId?: number;
    rowsAffected: number;
    rows: SQLiteRows;
  }

  export interface SQLiteRows {
    length: number;
    item(index: number): any;
    _array: any[];
  }

  export interface SQLiteError {
    code: number;
    message: string;
  }

  export function openDatabase(name: string): SQLiteDatabase;
}
