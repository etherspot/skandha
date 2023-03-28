export interface IDbController {
  get<T>(key: string): Promise<T>;
  // eslint-disable-next-line @typescript-eslint/ban-types
  put(key: string, value: Object): Promise<void>;
  del(key: string): Promise<void>;
  getMany<T>(keys: string[]): Promise<T[]>;
  start(): Promise<void>;
  stop(): Promise<void>;
}
