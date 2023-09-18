import { homedir } from "node:os";

export interface IDBOptions {
  dbDir: string;
  dbFile: string;
  namespace: string;
}

export const defaultDBOptions = {
  dbDir: `${homedir()}/.skandha/db/`,
  dbFile: "mempool-db",
  namespace: "userops",
};
