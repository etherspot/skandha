// eslint-disable-next-line import/no-extraneous-dependencies
import { IDbController } from "types/src";

enum Status {
  started = "started",
  stopped = "stopped",
}

export class LocalDbController implements IDbController {
  private namespace: string;
  private status = Status.stopped;
  private db: {
    [key: string]: any;
  } = {};

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  async get<T>(key: string): Promise<T> {
    key = `${this.namespace}:${key}`;
    const value = this.db[key];
    if (!value) {
      throw new Error("Not Found");
    }
    try {
      return JSON.parse(value as string);
    } catch (_) {
      return value as T;
    }
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  async put(key: string, value: Object): Promise<void> {
    key = `${this.namespace}:${key}`;
    this.db[key] = JSON.stringify(value);
  }

  async del(key: string): Promise<void> {
    key = `${this.namespace}:${key}`;
    delete this.db[key];
  }

  async getMany<T>(keys: string[]): Promise<T[]> {
    return keys.map((key) => {
      key = `${this.namespace}:${key}`;
      const value = this.db[key];
      if (!value) {
        throw new Error("Not Found");
      }
      try {
        return JSON.parse(value as string);
      } catch (_) {
        return value as T;
      }
    });
  }

  async start(): Promise<void> {
    if (this.status === Status.started) return;
    this.status = Status.started;
  }

  async stop(): Promise<void> {
    if (this.status === Status.stopped) return;
    this.status = Status.stopped;
  }
}
