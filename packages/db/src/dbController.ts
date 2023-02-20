import rocks from "rocksdb";

enum Status {
  started = "started",
  stopped = "stopped",
}

export class DbController {
  private namespace: string;
  private db: rocks;
  private status = Status.stopped;

  constructor(dbDir: string, dbFile: string, namespace: string) {
    this.db = rocks(dbDir + dbFile);
    this.namespace = namespace;
  }

  get<T>(key: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.db.get(key, (err, value) => {
        if (err) {
          return reject(err);
        }
        try {
          resolve(JSON.parse(value as string));
        } catch (_) {
          return resolve(value as T);
        }
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  put(key: string, value: Object): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.put(key, JSON.stringify(value), (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  del(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.del(key, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  getMany<T>(keys: string[]): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.getMany(keys, (err, values) => {
        if (err) {
          return reject(err);
        }
        try {
          resolve(values.map((value) => JSON.parse(value as string)));
        } catch (_) {
          return reject(values as T[]);
        }
      });
    });
  }

  async start(): Promise<void> {
    if (this.status === Status.started) return;
    this.status = Status.started;
    this.db.open((err) => {
      if (err) throw Error("Unable to start database " + err);
    });
  }

  async stop(): Promise<void> {
    if (this.status === Status.stopped) return;
    this.status = Status.stopped;

    this.db.close((err) => {
      if (err) {
        throw Error("Unable to stop database " + err);
      }
    });
  }
}
