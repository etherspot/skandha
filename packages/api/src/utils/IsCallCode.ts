import { registerDecorator, ValidationOptions } from "class-validator";

export function IsCallData(options: ValidationOptions = {}) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      propertyName,
      options: {
        message: `${propertyName} invalid`,
        ...options,
      },
      name: "isCallData",
      target: object.constructor,
      constraints: [],
      validator: {
        validate(value: string): boolean {
          return !!value && (value.length === 2 || value.length >= 42);
        },
      },
    });
  };
}
