import rocks from 'rocksdb';

let ROCKS_FILE = process.env.ROCKS_FILE || 'db';

export const db = rocks(ROCKS_FILE);

export function put(key: string, value: Object): Promise<void> {
  return new Promise((resolve, reject) => {
    db.put(key, JSON.stringify(value), err => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

export function get<T>(key: string): Promise<T> {
  return new Promise((resolve, reject) => {
    db.get(key, (err, value) => {
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

export function del(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.del(key, err => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

export function getMany<T>(keys: string[]): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.getMany(keys, (err, values) => {
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

export default db;
