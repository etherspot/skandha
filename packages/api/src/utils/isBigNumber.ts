import { registerDecorator, ValidationOptions } from "class-validator";

export function IsBigNumberish(options: ValidationOptions = {}) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      propertyName,
      options: {
        message: `${propertyName} must be a big number`,
        ...options,
      },
      name: "isBigNumber",
      target: object.constructor,
      constraints: [],
      validator: {
        validate(value): boolean {
          try {
            BigInt(value);
            return true;
          } catch (_) {
            return false;
          }
        },
      },
    });
  };
}
