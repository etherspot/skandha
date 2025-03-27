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
  PayableOverrides,
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

export declare namespace IStakeManager {
  export type DepositInfoStruct = {
    deposit: PromiseOrValue<BigNumberish>;
    staked: PromiseOrValue<boolean>;
    stake: PromiseOrValue<BigNumberish>;
    unstakeDelaySec: PromiseOrValue<BigNumberish>;
    withdrawTime: PromiseOrValue<BigNumberish>;
  };

  export type DepositInfoStructOutput = [
    BigNumber,
    boolean,
    BigNumber,
    number,
    number
  ] & {
    deposit: BigNumber;
    staked: boolean;
    stake: BigNumber;
    unstakeDelaySec: number;
    withdrawTime: number;
  };
}

export declare namespace IEntryPoint {
  export type UserOpsPerAggregatorStruct = {
    userOps: PackedUserOperationStruct[];
    aggregator: PromiseOrValue<string>;
    signature: PromiseOrValue<BytesLike>;
  };

  export type UserOpsPerAggregatorStructOutput = [
    PackedUserOperationStructOutput[],
    string,
    string
  ] & {
    userOps: PackedUserOperationStructOutput[];
    aggregator: string;
    signature: string;
  };
}

export declare namespace EntryPoint {
  export type MemoryUserOpStruct = {
    sender: PromiseOrValue<string>;
    nonce: PromiseOrValue<BigNumberish>;
    verificationGasLimit: PromiseOrValue<BigNumberish>;
    callGasLimit: PromiseOrValue<BigNumberish>;
    paymasterVerificationGasLimit: PromiseOrValue<BigNumberish>;
    paymasterPostOpGasLimit: PromiseOrValue<BigNumberish>;
    preVerificationGas: PromiseOrValue<BigNumberish>;
    paymaster: PromiseOrValue<string>;
    maxFeePerGas: PromiseOrValue<BigNumberish>;
    maxPriorityFeePerGas: PromiseOrValue<BigNumberish>;
  };

  export type MemoryUserOpStructOutput = [
    string,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber,
    string,
    BigNumber,
    BigNumber
  ] & {
    sender: string;
    nonce: BigNumber;
    verificationGasLimit: BigNumber;
    callGasLimit: BigNumber;
    paymasterVerificationGasLimit: BigNumber;
    paymasterPostOpGasLimit: BigNumber;
    preVerificationGas: BigNumber;
    paymaster: string;
    maxFeePerGas: BigNumber;
    maxPriorityFeePerGas: BigNumber;
  };

  export type UserOpInfoStruct = {
    mUserOp: EntryPoint.MemoryUserOpStruct;
    userOpHash: PromiseOrValue<BytesLike>;
    prefund: PromiseOrValue<BigNumberish>;
    contextOffset: PromiseOrValue<BigNumberish>;
    preOpGas: PromiseOrValue<BigNumberish>;
  };

  export type UserOpInfoStructOutput = [
    EntryPoint.MemoryUserOpStructOutput,
    string,
    BigNumber,
    BigNumber,
    BigNumber
  ] & {
    mUserOp: EntryPoint.MemoryUserOpStructOutput;
    userOpHash: string;
    prefund: BigNumber;
    contextOffset: BigNumber;
    preOpGas: BigNumber;
  };
}

export interface EntryPointInterface extends utils.Interface {
  functions: {
    "addStake(uint32)": FunctionFragment;
    "balanceOf(address)": FunctionFragment;
    "delegateAndRevert(address,bytes)": FunctionFragment;
    "depositTo(address)": FunctionFragment;
    "eip712Domain()": FunctionFragment;
    "getDepositInfo(address)": FunctionFragment;
    "getDomainSeparatorV4()": FunctionFragment;
    "getNonce(address,uint192)": FunctionFragment;
    "getPackedUserOpTypeHash()": FunctionFragment;
    "getSenderAddress(bytes)": FunctionFragment;
    "getUserOpHash((address,uint256,bytes,bytes,bytes32,uint256,bytes32,bytes,bytes))": FunctionFragment;
    "handleAggregatedOps(((address,uint256,bytes,bytes,bytes32,uint256,bytes32,bytes,bytes)[],address,bytes)[],address)": FunctionFragment;
    "handleOps((address,uint256,bytes,bytes,bytes32,uint256,bytes32,bytes,bytes)[],address)": FunctionFragment;
    "incrementNonce(uint192)": FunctionFragment;
    "innerHandleOp(bytes,((address,uint256,uint256,uint256,uint256,uint256,uint256,address,uint256,uint256),bytes32,uint256,uint256,uint256),bytes)": FunctionFragment;
    "nonceSequenceNumber(address,uint192)": FunctionFragment;
    "senderCreator()": FunctionFragment;
    "supportsInterface(bytes4)": FunctionFragment;
    "unlockStake()": FunctionFragment;
    "withdrawStake(address)": FunctionFragment;
    "withdrawTo(address,uint256)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "addStake"
      | "balanceOf"
      | "delegateAndRevert"
      | "depositTo"
      | "eip712Domain"
      | "getDepositInfo"
      | "getDomainSeparatorV4"
      | "getNonce"
      | "getPackedUserOpTypeHash"
      | "getSenderAddress"
      | "getUserOpHash"
      | "handleAggregatedOps"
      | "handleOps"
      | "incrementNonce"
      | "innerHandleOp"
      | "nonceSequenceNumber"
      | "senderCreator"
      | "supportsInterface"
      | "unlockStake"
      | "withdrawStake"
      | "withdrawTo"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "addStake",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "balanceOf",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "delegateAndRevert",
    values: [PromiseOrValue<string>, PromiseOrValue<BytesLike>]
  ): string;
  encodeFunctionData(
    functionFragment: "depositTo",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "eip712Domain",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getDepositInfo",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "getDomainSeparatorV4",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getNonce",
    values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "getPackedUserOpTypeHash",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getSenderAddress",
    values: [PromiseOrValue<BytesLike>]
  ): string;
  encodeFunctionData(
    functionFragment: "getUserOpHash",
    values: [PackedUserOperationStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "handleAggregatedOps",
    values: [IEntryPoint.UserOpsPerAggregatorStruct[], PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "handleOps",
    values: [PackedUserOperationStruct[], PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "incrementNonce",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "innerHandleOp",
    values: [
      PromiseOrValue<BytesLike>,
      EntryPoint.UserOpInfoStruct,
      PromiseOrValue<BytesLike>
    ]
  ): string;
  encodeFunctionData(
    functionFragment: "nonceSequenceNumber",
    values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "senderCreator",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "supportsInterface",
    values: [PromiseOrValue<BytesLike>]
  ): string;
  encodeFunctionData(
    functionFragment: "unlockStake",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "withdrawStake",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "withdrawTo",
    values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
  ): string;

  decodeFunctionResult(functionFragment: "addStake", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "balanceOf", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "delegateAndRevert",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "depositTo", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "eip712Domain",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getDepositInfo",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getDomainSeparatorV4",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "getNonce", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "getPackedUserOpTypeHash",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getSenderAddress",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getUserOpHash",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "handleAggregatedOps",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "handleOps", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "incrementNonce",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "innerHandleOp",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "nonceSequenceNumber",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "senderCreator",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "supportsInterface",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "unlockStake",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "withdrawStake",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "withdrawTo", data: BytesLike): Result;

  events: {
    "AccountDeployed(bytes32,address,address,address)": EventFragment;
    "BeforeExecution()": EventFragment;
    "Deposited(address,uint256)": EventFragment;
    "EIP712DomainChanged()": EventFragment;
    "PostOpRevertReason(bytes32,address,uint256,bytes)": EventFragment;
    "SignatureAggregatorChanged(address)": EventFragment;
    "StakeLocked(address,uint256,uint256)": EventFragment;
    "StakeUnlocked(address,uint256)": EventFragment;
    "StakeWithdrawn(address,address,uint256)": EventFragment;
    "UserOperationEvent(bytes32,address,address,uint256,bool,uint256,uint256)": EventFragment;
    "UserOperationPrefundTooLow(bytes32,address,uint256)": EventFragment;
    "UserOperationRevertReason(bytes32,address,uint256,bytes)": EventFragment;
    "Withdrawn(address,address,uint256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "AccountDeployed"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "BeforeExecution"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Deposited"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "EIP712DomainChanged"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "PostOpRevertReason"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "SignatureAggregatorChanged"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "StakeLocked"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "StakeUnlocked"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "StakeWithdrawn"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "UserOperationEvent"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "UserOperationPrefundTooLow"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "UserOperationRevertReason"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "Withdrawn"): EventFragment;
}

export interface AccountDeployedEventObject {
  userOpHash: string;
  sender: string;
  factory: string;
  paymaster: string;
}
export type AccountDeployedEvent = TypedEvent<
  [string, string, string, string],
  AccountDeployedEventObject
>;

export type AccountDeployedEventFilter = TypedEventFilter<AccountDeployedEvent>;

export interface BeforeExecutionEventObject {}
export type BeforeExecutionEvent = TypedEvent<[], BeforeExecutionEventObject>;

export type BeforeExecutionEventFilter = TypedEventFilter<BeforeExecutionEvent>;

export interface DepositedEventObject {
  account: string;
  totalDeposit: BigNumber;
}
export type DepositedEvent = TypedEvent<
  [string, BigNumber],
  DepositedEventObject
>;

export type DepositedEventFilter = TypedEventFilter<DepositedEvent>;

export interface EIP712DomainChangedEventObject {}
export type EIP712DomainChangedEvent = TypedEvent<
  [],
  EIP712DomainChangedEventObject
>;

export type EIP712DomainChangedEventFilter =
  TypedEventFilter<EIP712DomainChangedEvent>;

export interface PostOpRevertReasonEventObject {
  userOpHash: string;
  sender: string;
  nonce: BigNumber;
  revertReason: string;
}
export type PostOpRevertReasonEvent = TypedEvent<
  [string, string, BigNumber, string],
  PostOpRevertReasonEventObject
>;

export type PostOpRevertReasonEventFilter =
  TypedEventFilter<PostOpRevertReasonEvent>;

export interface SignatureAggregatorChangedEventObject {
  aggregator: string;
}
export type SignatureAggregatorChangedEvent = TypedEvent<
  [string],
  SignatureAggregatorChangedEventObject
>;

export type SignatureAggregatorChangedEventFilter =
  TypedEventFilter<SignatureAggregatorChangedEvent>;

export interface StakeLockedEventObject {
  account: string;
  totalStaked: BigNumber;
  unstakeDelaySec: BigNumber;
}
export type StakeLockedEvent = TypedEvent<
  [string, BigNumber, BigNumber],
  StakeLockedEventObject
>;

export type StakeLockedEventFilter = TypedEventFilter<StakeLockedEvent>;

export interface StakeUnlockedEventObject {
  account: string;
  withdrawTime: BigNumber;
}
export type StakeUnlockedEvent = TypedEvent<
  [string, BigNumber],
  StakeUnlockedEventObject
>;

export type StakeUnlockedEventFilter = TypedEventFilter<StakeUnlockedEvent>;

export interface StakeWithdrawnEventObject {
  account: string;
  withdrawAddress: string;
  amount: BigNumber;
}
export type StakeWithdrawnEvent = TypedEvent<
  [string, string, BigNumber],
  StakeWithdrawnEventObject
>;

export type StakeWithdrawnEventFilter = TypedEventFilter<StakeWithdrawnEvent>;

export interface UserOperationEventEventObject {
  userOpHash: string;
  sender: string;
  paymaster: string;
  nonce: BigNumber;
  success: boolean;
  actualGasCost: BigNumber;
  actualGasUsed: BigNumber;
}
export type UserOperationEventEvent = TypedEvent<
  [string, string, string, BigNumber, boolean, BigNumber, BigNumber],
  UserOperationEventEventObject
>;

export type UserOperationEventEventFilter =
  TypedEventFilter<UserOperationEventEvent>;

export interface UserOperationPrefundTooLowEventObject {
  userOpHash: string;
  sender: string;
  nonce: BigNumber;
}
export type UserOperationPrefundTooLowEvent = TypedEvent<
  [string, string, BigNumber],
  UserOperationPrefundTooLowEventObject
>;

export type UserOperationPrefundTooLowEventFilter =
  TypedEventFilter<UserOperationPrefundTooLowEvent>;

export interface UserOperationRevertReasonEventObject {
  userOpHash: string;
  sender: string;
  nonce: BigNumber;
  revertReason: string;
}
export type UserOperationRevertReasonEvent = TypedEvent<
  [string, string, BigNumber, string],
  UserOperationRevertReasonEventObject
>;

export type UserOperationRevertReasonEventFilter =
  TypedEventFilter<UserOperationRevertReasonEvent>;

export interface WithdrawnEventObject {
  account: string;
  withdrawAddress: string;
  amount: BigNumber;
}
export type WithdrawnEvent = TypedEvent<
  [string, string, BigNumber],
  WithdrawnEventObject
>;

export type WithdrawnEventFilter = TypedEventFilter<WithdrawnEvent>;

export interface EntryPoint extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: EntryPointInterface;

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
    addStake(
      unstakeDelaySec: PromiseOrValue<BigNumberish>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    balanceOf(
      account: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    delegateAndRevert(
      target: PromiseOrValue<string>,
      data: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    depositTo(
      account: PromiseOrValue<string>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    eip712Domain(
      overrides?: CallOverrides
    ): Promise<
      [string, string, string, BigNumber, string, string, BigNumber[]] & {
        fields: string;
        name: string;
        version: string;
        chainId: BigNumber;
        verifyingContract: string;
        salt: string;
        extensions: BigNumber[];
      }
    >;

    getDepositInfo(
      account: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<
      [IStakeManager.DepositInfoStructOutput] & {
        info: IStakeManager.DepositInfoStructOutput;
      }
    >;

    getDomainSeparatorV4(overrides?: CallOverrides): Promise<[string]>;

    getNonce(
      sender: PromiseOrValue<string>,
      key: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<[BigNumber] & { nonce: BigNumber }>;

    getPackedUserOpTypeHash(overrides?: CallOverrides): Promise<[string]>;

    getSenderAddress(
      initCode: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    getUserOpHash(
      userOp: PackedUserOperationStruct,
      overrides?: CallOverrides
    ): Promise<[string]>;

    handleAggregatedOps(
      opsPerAggregator: IEntryPoint.UserOpsPerAggregatorStruct[],
      beneficiary: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    handleOps(
      ops: PackedUserOperationStruct[],
      beneficiary: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    incrementNonce(
      key: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    innerHandleOp(
      callData: PromiseOrValue<BytesLike>,
      opInfo: EntryPoint.UserOpInfoStruct,
      context: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    nonceSequenceNumber(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    senderCreator(overrides?: CallOverrides): Promise<[string]>;

    supportsInterface(
      interfaceId: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<[boolean]>;

    unlockStake(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    withdrawStake(
      withdrawAddress: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;

    withdrawTo(
      withdrawAddress: PromiseOrValue<string>,
      withdrawAmount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<ContractTransaction>;
  };

  addStake(
    unstakeDelaySec: PromiseOrValue<BigNumberish>,
    overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  balanceOf(
    account: PromiseOrValue<string>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  delegateAndRevert(
    target: PromiseOrValue<string>,
    data: PromiseOrValue<BytesLike>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  depositTo(
    account: PromiseOrValue<string>,
    overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  eip712Domain(
    overrides?: CallOverrides
  ): Promise<
    [string, string, string, BigNumber, string, string, BigNumber[]] & {
      fields: string;
      name: string;
      version: string;
      chainId: BigNumber;
      verifyingContract: string;
      salt: string;
      extensions: BigNumber[];
    }
  >;

  getDepositInfo(
    account: PromiseOrValue<string>,
    overrides?: CallOverrides
  ): Promise<IStakeManager.DepositInfoStructOutput>;

  getDomainSeparatorV4(overrides?: CallOverrides): Promise<string>;

  getNonce(
    sender: PromiseOrValue<string>,
    key: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  getPackedUserOpTypeHash(overrides?: CallOverrides): Promise<string>;

  getSenderAddress(
    initCode: PromiseOrValue<BytesLike>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  getUserOpHash(
    userOp: PackedUserOperationStruct,
    overrides?: CallOverrides
  ): Promise<string>;

  handleAggregatedOps(
    opsPerAggregator: IEntryPoint.UserOpsPerAggregatorStruct[],
    beneficiary: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  handleOps(
    ops: PackedUserOperationStruct[],
    beneficiary: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  incrementNonce(
    key: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  innerHandleOp(
    callData: PromiseOrValue<BytesLike>,
    opInfo: EntryPoint.UserOpInfoStruct,
    context: PromiseOrValue<BytesLike>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  nonceSequenceNumber(
    arg0: PromiseOrValue<string>,
    arg1: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  senderCreator(overrides?: CallOverrides): Promise<string>;

  supportsInterface(
    interfaceId: PromiseOrValue<BytesLike>,
    overrides?: CallOverrides
  ): Promise<boolean>;

  unlockStake(
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  withdrawStake(
    withdrawAddress: PromiseOrValue<string>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  withdrawTo(
    withdrawAddress: PromiseOrValue<string>,
    withdrawAmount: PromiseOrValue<BigNumberish>,
    overrides?: Overrides & { from?: PromiseOrValue<string> }
  ): Promise<ContractTransaction>;

  callStatic: {
    addStake(
      unstakeDelaySec: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    balanceOf(
      account: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    delegateAndRevert(
      target: PromiseOrValue<string>,
      data: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<void>;

    depositTo(
      account: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    eip712Domain(
      overrides?: CallOverrides
    ): Promise<
      [string, string, string, BigNumber, string, string, BigNumber[]] & {
        fields: string;
        name: string;
        version: string;
        chainId: BigNumber;
        verifyingContract: string;
        salt: string;
        extensions: BigNumber[];
      }
    >;

    getDepositInfo(
      account: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<IStakeManager.DepositInfoStructOutput>;

    getDomainSeparatorV4(overrides?: CallOverrides): Promise<string>;

    getNonce(
      sender: PromiseOrValue<string>,
      key: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getPackedUserOpTypeHash(overrides?: CallOverrides): Promise<string>;

    getSenderAddress(
      initCode: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<void>;

    getUserOpHash(
      userOp: PackedUserOperationStruct,
      overrides?: CallOverrides
    ): Promise<string>;

    handleAggregatedOps(
      opsPerAggregator: IEntryPoint.UserOpsPerAggregatorStruct[],
      beneficiary: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    handleOps(
      ops: PackedUserOperationStruct[],
      beneficiary: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    incrementNonce(
      key: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;

    innerHandleOp(
      callData: PromiseOrValue<BytesLike>,
      opInfo: EntryPoint.UserOpInfoStruct,
      context: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    nonceSequenceNumber(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    senderCreator(overrides?: CallOverrides): Promise<string>;

    supportsInterface(
      interfaceId: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<boolean>;

    unlockStake(overrides?: CallOverrides): Promise<void>;

    withdrawStake(
      withdrawAddress: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<void>;

    withdrawTo(
      withdrawAddress: PromiseOrValue<string>,
      withdrawAmount: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {
    "AccountDeployed(bytes32,address,address,address)"(
      userOpHash?: PromiseOrValue<BytesLike> | null,
      sender?: PromiseOrValue<string> | null,
      factory?: null,
      paymaster?: null
    ): AccountDeployedEventFilter;
    AccountDeployed(
      userOpHash?: PromiseOrValue<BytesLike> | null,
      sender?: PromiseOrValue<string> | null,
      factory?: null,
      paymaster?: null
    ): AccountDeployedEventFilter;

    "BeforeExecution()"(): BeforeExecutionEventFilter;
    BeforeExecution(): BeforeExecutionEventFilter;

    "Deposited(address,uint256)"(
      account?: PromiseOrValue<string> | null,
      totalDeposit?: null
    ): DepositedEventFilter;
    Deposited(
      account?: PromiseOrValue<string> | null,
      totalDeposit?: null
    ): DepositedEventFilter;

    "EIP712DomainChanged()"(): EIP712DomainChangedEventFilter;
    EIP712DomainChanged(): EIP712DomainChangedEventFilter;

    "PostOpRevertReason(bytes32,address,uint256,bytes)"(
      userOpHash?: PromiseOrValue<BytesLike> | null,
      sender?: PromiseOrValue<string> | null,
      nonce?: null,
      revertReason?: null
    ): PostOpRevertReasonEventFilter;
    PostOpRevertReason(
      userOpHash?: PromiseOrValue<BytesLike> | null,
      sender?: PromiseOrValue<string> | null,
      nonce?: null,
      revertReason?: null
    ): PostOpRevertReasonEventFilter;

    "SignatureAggregatorChanged(address)"(
      aggregator?: PromiseOrValue<string> | null
    ): SignatureAggregatorChangedEventFilter;
    SignatureAggregatorChanged(
      aggregator?: PromiseOrValue<string> | null
    ): SignatureAggregatorChangedEventFilter;

    "StakeLocked(address,uint256,uint256)"(
      account?: PromiseOrValue<string> | null,
      totalStaked?: null,
      unstakeDelaySec?: null
    ): StakeLockedEventFilter;
    StakeLocked(
      account?: PromiseOrValue<string> | null,
      totalStaked?: null,
      unstakeDelaySec?: null
    ): StakeLockedEventFilter;

    "StakeUnlocked(address,uint256)"(
      account?: PromiseOrValue<string> | null,
      withdrawTime?: null
    ): StakeUnlockedEventFilter;
    StakeUnlocked(
      account?: PromiseOrValue<string> | null,
      withdrawTime?: null
    ): StakeUnlockedEventFilter;

    "StakeWithdrawn(address,address,uint256)"(
      account?: PromiseOrValue<string> | null,
      withdrawAddress?: null,
      amount?: null
    ): StakeWithdrawnEventFilter;
    StakeWithdrawn(
      account?: PromiseOrValue<string> | null,
      withdrawAddress?: null,
      amount?: null
    ): StakeWithdrawnEventFilter;

    "UserOperationEvent(bytes32,address,address,uint256,bool,uint256,uint256)"(
      userOpHash?: PromiseOrValue<BytesLike> | null,
      sender?: PromiseOrValue<string> | null,
      paymaster?: PromiseOrValue<string> | null,
      nonce?: null,
      success?: null,
      actualGasCost?: null,
      actualGasUsed?: null
    ): UserOperationEventEventFilter;
    UserOperationEvent(
      userOpHash?: PromiseOrValue<BytesLike> | null,
      sender?: PromiseOrValue<string> | null,
      paymaster?: PromiseOrValue<string> | null,
      nonce?: null,
      success?: null,
      actualGasCost?: null,
      actualGasUsed?: null
    ): UserOperationEventEventFilter;

    "UserOperationPrefundTooLow(bytes32,address,uint256)"(
      userOpHash?: PromiseOrValue<BytesLike> | null,
      sender?: PromiseOrValue<string> | null,
      nonce?: null
    ): UserOperationPrefundTooLowEventFilter;
    UserOperationPrefundTooLow(
      userOpHash?: PromiseOrValue<BytesLike> | null,
      sender?: PromiseOrValue<string> | null,
      nonce?: null
    ): UserOperationPrefundTooLowEventFilter;

    "UserOperationRevertReason(bytes32,address,uint256,bytes)"(
      userOpHash?: PromiseOrValue<BytesLike> | null,
      sender?: PromiseOrValue<string> | null,
      nonce?: null,
      revertReason?: null
    ): UserOperationRevertReasonEventFilter;
    UserOperationRevertReason(
      userOpHash?: PromiseOrValue<BytesLike> | null,
      sender?: PromiseOrValue<string> | null,
      nonce?: null,
      revertReason?: null
    ): UserOperationRevertReasonEventFilter;

    "Withdrawn(address,address,uint256)"(
      account?: PromiseOrValue<string> | null,
      withdrawAddress?: null,
      amount?: null
    ): WithdrawnEventFilter;
    Withdrawn(
      account?: PromiseOrValue<string> | null,
      withdrawAddress?: null,
      amount?: null
    ): WithdrawnEventFilter;
  };

  estimateGas: {
    addStake(
      unstakeDelaySec: PromiseOrValue<BigNumberish>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    balanceOf(
      account: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    delegateAndRevert(
      target: PromiseOrValue<string>,
      data: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    depositTo(
      account: PromiseOrValue<string>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    eip712Domain(overrides?: CallOverrides): Promise<BigNumber>;

    getDepositInfo(
      account: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getDomainSeparatorV4(overrides?: CallOverrides): Promise<BigNumber>;

    getNonce(
      sender: PromiseOrValue<string>,
      key: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getPackedUserOpTypeHash(overrides?: CallOverrides): Promise<BigNumber>;

    getSenderAddress(
      initCode: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    getUserOpHash(
      userOp: PackedUserOperationStruct,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    handleAggregatedOps(
      opsPerAggregator: IEntryPoint.UserOpsPerAggregatorStruct[],
      beneficiary: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    handleOps(
      ops: PackedUserOperationStruct[],
      beneficiary: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    incrementNonce(
      key: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    innerHandleOp(
      callData: PromiseOrValue<BytesLike>,
      opInfo: EntryPoint.UserOpInfoStruct,
      context: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    nonceSequenceNumber(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    senderCreator(overrides?: CallOverrides): Promise<BigNumber>;

    supportsInterface(
      interfaceId: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    unlockStake(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    withdrawStake(
      withdrawAddress: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;

    withdrawTo(
      withdrawAddress: PromiseOrValue<string>,
      withdrawAmount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    addStake(
      unstakeDelaySec: PromiseOrValue<BigNumberish>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    balanceOf(
      account: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    delegateAndRevert(
      target: PromiseOrValue<string>,
      data: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    depositTo(
      account: PromiseOrValue<string>,
      overrides?: PayableOverrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    eip712Domain(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getDepositInfo(
      account: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getDomainSeparatorV4(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getNonce(
      sender: PromiseOrValue<string>,
      key: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getPackedUserOpTypeHash(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getSenderAddress(
      initCode: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    getUserOpHash(
      userOp: PackedUserOperationStruct,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    handleAggregatedOps(
      opsPerAggregator: IEntryPoint.UserOpsPerAggregatorStruct[],
      beneficiary: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    handleOps(
      ops: PackedUserOperationStruct[],
      beneficiary: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    incrementNonce(
      key: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    innerHandleOp(
      callData: PromiseOrValue<BytesLike>,
      opInfo: EntryPoint.UserOpInfoStruct,
      context: PromiseOrValue<BytesLike>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    nonceSequenceNumber(
      arg0: PromiseOrValue<string>,
      arg1: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    senderCreator(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    supportsInterface(
      interfaceId: PromiseOrValue<BytesLike>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    unlockStake(
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    withdrawStake(
      withdrawAddress: PromiseOrValue<string>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;

    withdrawTo(
      withdrawAddress: PromiseOrValue<string>,
      withdrawAmount: PromiseOrValue<BigNumberish>,
      overrides?: Overrides & { from?: PromiseOrValue<string> }
    ): Promise<PopulatedTransaction>;
  };
}
