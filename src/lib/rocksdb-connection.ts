import rocks from 'rocksdb';
import logger from '../logger';

if (!process.env.ROCKS_FILE) {
  logger.error('ROCKS_FILE not specified in environment', new Error('ROCKS_FILE not specified in environment'));
  process.exit(1);
}

export const db = rocks(process.env.ROCKS_FILE);

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
