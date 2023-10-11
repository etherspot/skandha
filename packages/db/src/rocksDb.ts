import path from "node:path";
import rocks from "@farcaster/rocksdb";
// eslint-disable-next-line import/no-extraneous-dependencies
import { IDbController } from "types/lib";

enum Status {
  started = "started",
  stopped = "stopped",
}

export class RocksDbController implements IDbController {
  private namespace: string;
  private db: rocks;
  private status = Status.stopped;

  constructor(dbDir: string, namespace: string) {
    this.db = rocks(path.resolve(dbDir, namespace));
    this.namespace = namespace;
  }

  get<T>(key: string): Promise<T> {
    key = `${this.namespace}:${key}`;
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
    key = `${this.namespace}:${key}`;
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
    key = `${this.namespace}:${key}`;
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
    keys = keys.map((key) => `${this.namespace}:${key}`);
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
