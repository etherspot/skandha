import { registerDecorator, ValidationOptions } from "class-validator";
import { isAddress } from "ethers/lib/utils";

export function IsValidFactory(options: ValidationOptions = {}) {
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
