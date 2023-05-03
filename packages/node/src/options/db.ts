export interface IDBOptions {
  dbDir: string;
  dbFile: string;
  namespace: string;
}

export const defaultDBOptions = {
  dbDir: "/data/",
  dbFile: "mempool-db",
  namespace: "userops",
};
