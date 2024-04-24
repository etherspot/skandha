/* eslint-disable @typescript-eslint/no-explicit-any */
import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import logger from "../logger";

export function validationFactory<T>(
  metadataKey: symbol,
  model: { new (...args: any[]): T }
) {
  // eslint-disable-next-line func-names
  return function (
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<any>
  ) {
    Reflect.defineMetadata(metadataKey, model, target, propertyName);

    const method = descriptor.value!;
    // eslint-disable-next-line func-names
    descriptor.value = async function (...args: any[]) {
      const schema = Reflect.getOwnMetadata(metadataKey, target, propertyName);
      const errors = await validate(plainToInstance(schema, args[0]));
      if (errors.length > 0) {
        logger.info(
          {
            data: {
              errors,
              arguments: args[0],
            },
          },
          "Invalid Request"
        );
        throw new RpcError("Invalid Request", RpcErrorCodes.INVALID_REQUEST);
      }

      return method.apply(this, args);
    };
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const RpcMethodValidator = (dto: any) =>
  validationFactory(Symbol("rpc-method"), dto);
