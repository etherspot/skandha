import rocks from 'rocksdb';

export class DbController {
  private namespace: string;
  private db: rocks;

  constructor(rocksFile: string, namespace: string) {
    this.db = rocks(rocksFile);
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

  put(key: string, value: Object): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.put(key, JSON.stringify(value), err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  del(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.del(key, err => {
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
          resolve(values.map(value => JSON.parse(value as string)));
        } catch (_) {
          return reject(values as T[]);
        }
      });
    });
  }
};