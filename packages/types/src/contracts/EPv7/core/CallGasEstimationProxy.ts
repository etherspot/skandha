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
import type { FunctionFragment, Result } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "../../common";

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

export declare namespace CallGasEstimationProxy {
  export type EstimateCallGasArgsStruct = {
    userOp: PackedUserOperationStruct;
    minGas: PromiseOrValue<BigNumberish>;
    maxGas: PromiseOrValue<BigNumberish>;
    rounding: PromiseOrValue<BigNumberish>;
    isContinuation: PromiseOrValue<boolean>;
  };

  export type EstimateCallGasArgsStructOutput = [
    PackedUserOperationStructOutput,
    BigNumber,
    BigNumber,
    BigNumber,
    boolean
  ] & {
    userOp: PackedUserOperationStructOutput;
    minGas: BigNumber;
    maxGas: BigNumber;
    rounding: BigNumber;
    isContinuation: boolean;
  };
}

export interface CallGasEstimationProxyInterface extends utils.Interface {
  functions: {
    "_innerCall(address,bytes,uint256)": FunctionFragment;
    "estimateCallGas(((address,uint256,bytes,bytes,bytes32,uint256,bytes32,bytes,bytes),uint256,uint256,uint256,bool))": FunctionFragment;
    "testCallGas((address,uint256,bytes,bytes,bytes32,uint256,bytes32,bytes,bytes),uint256)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic: "_innerCall" | "estimateCallGas" | "testCallGas"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "_innerCall",
    values: [
      PromiseOrValue<string>,
      PromiseOrValue<BytesLike>,
      PromiseOrValue<BigNumberish>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "estimateCallGas",
    values: [CallGasEstimationProxy.EstimateCallGasArgsStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "testCallGas",
    values: [PackedUserOperationStruct, PromiseOrValue<BigNumberish>]
  ): string;

  decodeFunctionResult(functionFragment: "_innerCall", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "estimateCallGas",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "testCallGas",
    data: BytesLike
  ): Result;

  events: {};
}

export interface CallGasEstimationProxy extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: CallGasEstimationProxyInterface;

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
    _innerCall(
      sender: PromiseOrValue<string>,
      callData: PromiseOrValue<BytesLike>,
      gas: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    estimateCallGas(
      args: CallGasEstimationProxy.EstimateCallGasArgsStruct,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    testCallGas(
      userOp: PackedUserOperationStruct,
      callGasLimit: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;
  };

  _innerCall(
    sender: PromiseOrValue<string>,
    callData: PromiseOrValue<BytesLike>,
    gas: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  estimateCallGas(
    args: CallGasEstimationProxy.EstimateCallGasArgsStruct,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  testCallGas(
    userOp: PackedUserOperationStruct,
    callGasLimit: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    _innerCall(
      sender: PromiseOrValue<string>,
      callData: PromiseOrValue<BytesLike>,
      gas: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    estimateCallGas(
      args: CallGasEstimationProxy.EstimateCallGasArgsStruct,
      overrides?: CallOverrides
    ): Promise<void>;

    testCallGas(
      userOp: PackedUserOperationStruct,
      callGasLimit: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {};

  estimateGas: {
    _innerCall(
      sender: PromiseOrValue<string>,
      callData: PromiseOrValue<BytesLike>,
      gas: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    estimateCallGas(
      args: CallGasEstimationProxy.EstimateCallGasArgsStruct,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    testCallGas(
      userOp: PackedUserOperationStruct,
      callGasLimit: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    _innerCall(
      sender: PromiseOrValue<string>,
      callData: PromiseOrValue<BytesLike>,
      gas: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    estimateCallGas(
      args: CallGasEstimationProxy.EstimateCallGasArgsStruct,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    testCallGas(
      userOp: PackedUserOperationStruct,
      callGasLimit: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;
  };
}
