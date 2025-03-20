/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type {
  FunctionFragment,
  Result,
  EventFragment,
} from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "../../../common";

export type PackedUserOperationStruct = {
  sender: PromiseOrValue<string>;
  nonce: PromiseOrValue<BigNumberish>;
  initCode: PromiseOrValue<BytesLike>;
  callData: PromiseOrValue<BytesLike>;
  accountGasLimits: PromiseOrValue<BytesLike>;
  preVerificationGas: PromiseOrValue<BigNumberish>;
  gasFees: PromiseOrValue<BytesLike>;
  paymasterAndData: PromiseOrValue<BytesLike>;
  signature: PromiseOrValue<BytesLike>;
};

export type PackedUserOperationStructOutput = [
  string,
  BigNumber,
  string,
  string,
  string,
  BigNumber,
  string,
  string,
  string
] & {
  sender: string;
  nonce: BigNumber;
  initCode: string;
  callData: string;
  accountGasLimits: string;
  preVerificationGas: BigNumber;
  gasFees: string;
  paymasterAndData: string;
  signature: string;
};

export interface IBLSAccountInterface extends utils.Interface {
  functions: {
    "getBlsPublicKey()": FunctionFragment;
    "validateUserOp((address,uint256,bytes,bytes,bytes32,uint256,bytes32,bytes,bytes),bytes32,uint256)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic: "getBlsPublicKey" | "validateUserOp"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "getBlsPublicKey",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "validateUserOp",
    values: [
      PackedUserOperationStruct,
      PromiseOrValue<BytesLike>,
      PromiseOrValue<BigNumberish>
    ]
  ): string;

  decodeFunctionResult(
    functionFragment: "getBlsPublicKey",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "validateUserOp",
    data: BytesLike
  ): Result;

  events: {
    "PublicKeyChanged(uint256[4],uint256[4])": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "PublicKeyChanged"): EventFragment;
}

export interface PublicKeyChangedEventObject {
  oldPublicKey: [BigNumber, BigNumber, BigNumber, BigNumber];
  newPublicKey: [BigNumber, BigNumber, BigNumber, BigNumber];
}
export type PublicKeyChangedEvent = TypedEvent<
  [
    [BigNumber, BigNumber, BigNumber, BigNumber],
    [BigNumber, BigNumber, BigNumber, BigNumber]
  ],
  PublicKeyChangedEventObject
>;

export type PublicKeyChangedEventFilter =
  TypedEventFilter<PublicKeyChangedEvent>;

export interface IBLSAccount extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: IBLSAccountInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    getBlsPublicKey(
      overrides?: CallOverrides
    ): Promise<[[BigNumber, BigNumber, BigNumber, BigNumber]]>;

    validateUserOp(
      userOp: PackedUserOperationStruct,
      userOpHash: PromiseOrValue<BytesLike>,
      missingAccountFunds: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;
  };

  getBlsPublicKey(
    overrides?: CallOverrides
  ): Promise<[BigNumber, BigNumber, BigNumber, BigNumber]>;

  validateUserOp(
    userOp: PackedUserOperationStruct,
    userOpHash: PromiseOrValue<BytesLike>,
    missingAccountFunds: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    getBlsPublicKey(
      overrides?: CallOverrides
    ): Promise<[BigNumber, BigNumber, BigNumber, BigNumber]>;

    validateUserOp(
      userOp: PackedUserOperationStruct,
      userOpHash: PromiseOrValue<BytesLike>,
      missingAccountFunds: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  filters: {
    "PublicKeyChanged(uint256[4],uint256[4])"(
      oldPublicKey?: null,
      newPublicKey?: null
    ): PublicKeyChangedEventFilter;
    PublicKeyChanged(
      oldPublicKey?: null,
      newPublicKey?: null
    ): PublicKeyChangedEventFilter;
  };

  estimateGas: {
    getBlsPublicKey(overrides?: CallOverrides): Promise<BigNumber>;

    validateUserOp(
      userOp: PackedUserOperationStruct,
      userOpHash: PromiseOrValue<BytesLike>,
      missingAccountFunds: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    getBlsPublicKey(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    validateUserOp(
      userOp: PackedUserOperationStruct,
      userOpHash: PromiseOrValue<BytesLike>,
      missingAccountFunds: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;
  };
}
