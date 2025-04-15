import { registerDecorator, ValidationOptions } from "class-validator";
import { isAddress } from "ethers/lib/utils";

export function IsValidFactory(options: ValidationOptions = {}) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      propertyName,
      options: {
        message: `${propertyName} must be a valid factory address or 0x7702`,
        ...options,
      },
      name: "isValidFactory",
      target: object.constructor,
      constraints: [],
      validator: {
        validate(value: string): boolean {
          try {
            return value === "0x7702" || isAddress(value);
          } catch (_) {
            return false;
          }
        },
      },
    });
  };
}
