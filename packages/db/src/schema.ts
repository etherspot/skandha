// Namespace will be used to store separate databases.
export enum Namespace {
  userOps = 1,
  peers = 2,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getNamespaceByValue(enumValue: number): any {
  const keys = Object.keys(Namespace).filter((x) => {
    if (isNaN(parseInt(x))) {
      return Namespace[x as keyof typeof Namespace] === enumValue;
    } else {
      return false;
    }
  }) as (keyof typeof Namespace)[];
  if (keys.length > 0) {
    return keys[0];
  }
  throw new Error("Missing namespace for value " + enumValue);
}
