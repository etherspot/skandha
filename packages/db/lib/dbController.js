import rocks from "rocksdb";
var Status;
(function (Status) {
    Status["started"] = "started";
    Status["stopped"] = "stopped";
})(Status || (Status = {}));
export class DbController {
    constructor(dbDir, dbFile, namespace) {
        this.status = Status.stopped;
        this.db = rocks(dbDir + dbFile);
        this.namespace = namespace;
    }
    get(key) {
        return new Promise((resolve, reject) => {
            this.db.get(key, (err, value) => {
                if (err) {
                    return reject(err);
                }
                try {
                    resolve(JSON.parse(value));
                }
                catch (_) {
                    return resolve(value);
                }
            });
        });
    }
    put(key, value) {
        return new Promise((resolve, reject) => {
            this.db.put(key, JSON.stringify(value), (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
    del(key) {
        return new Promise((resolve, reject) => {
            this.db.del(key, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }
    getMany(keys) {
        return new Promise((resolve, reject) => {
            this.db.getMany(keys, (err, values) => {
                if (err) {
                    return reject(err);
                }
                try {
                    resolve(values.map((value) => JSON.parse(value)));
                }
                catch (_) {
                    return reject(values);
                }
            });
        });
    }
    async start() {
        if (this.status === Status.started)
            return;
        this.status = Status.started;
        this.db.open((err) => {
            if (err)
                throw Error("Unable to start database " + err);
        });
    }
    async stop() {
        if (this.status === Status.stopped)
            return;
        this.status = Status.stopped;
        this.db.close((err) => {
            if (err) {
                throw Error("Unable to stop database " + err);
            }
        });
    }
}
//# sourceMappingURL=dbController.js.map