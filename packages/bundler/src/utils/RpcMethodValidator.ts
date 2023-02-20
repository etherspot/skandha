import RpcError from 'app/errors/rpc-error';
import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import * as RpcErrorCodes from '../error-codes';
import logger from 'app/logger';

export function validationFactory<T>(
  metadataKey: Symbol,
  model: { new (...args: any[]): T }
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<any>
  ) {
    Reflect.defineMetadata(metadataKey, model, target, propertyName);

    const method = descriptor.value!;
    descriptor.value = async function () {
      const schema = Reflect.getOwnMetadata(metadataKey, target, propertyName);
      const errors = await validate(plainToInstance(schema, arguments[0]));
      if (errors.length > 0) {
        logger.debug('Invalid Request', {
          data: {
            errors,
            arguments: arguments[0]
          }
        });
        throw new RpcError('Invalid Request', RpcErrorCodes.INVALID_REQUEST);
      }

      return method.apply(this, arguments);
    };
  };
}

export const RpcMethodValidator = (dto: any) => validationFactory(
  Symbol('rpc-method'),
  dto,
);
