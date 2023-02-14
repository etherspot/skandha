// Namespace will be used to store separate databases.
export var Namespace;
(function (Namespace) {
    Namespace[Namespace["userOps"] = 1] = "userOps";
    Namespace[Namespace["peers"] = 2] = "peers";
})(Namespace || (Namespace = {}));
export function getNamespaceByValue(enumValue) {
    const keys = Object.keys(Namespace).filter((x) => {
        if (isNaN(parseInt(x))) {
            return Namespace[x] === enumValue;
        }
        else {
            return false;
        }
    });
    if (keys.length > 0) {
        return keys[0];
    }
    throw new Error("Missing namespace for value " + enumValue);
}
//# sourceMappingURL=schema.js.map