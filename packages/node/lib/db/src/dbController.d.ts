export declare class DbController {
    private namespace;
    private db;
    private status;
    constructor(dbDir: string, dbFile: string, namespace: string);
    get<T>(key: string): Promise<T>;
    put(key: string, value: Object): Promise<void>;
    del(key: string): Promise<void>;
    getMany<T>(keys: string[]): Promise<T[]>;
    start(): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=dbController.d.ts.map