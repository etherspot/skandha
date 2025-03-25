import { IDbController, Logger } from "@skandha/types/lib";
import {
  AccountDeployedEvent,
  SignatureAggregatorChangedEvent,
  UserOperationEventEvent,
} from "@skandha/types/lib/contracts/EPv7/core/EntryPoint";
import { MempoolEntryStatus } from "@skandha/types/lib/executor";
import { ReputationService } from "../../ReputationService";
import { MempoolService } from "../../MempoolService";
import { ExecutorEvent, ExecutorEventBus } from "../../SubscriptionService";
import { EntryPoint__factory } from "@skandha/types/lib/contracts/EPv7/factories/core";
import { GetContractReturnType, Hex, PublicClient, Log, parseAbiItem } from "viem";

type UserOperationEventAbi = {
  anonymous: false,
  inputs: [
    {
      indexed: true,
      internalType: "bytes32",
      name: "userOpHash",
      type: "bytes32",
    },
    {
      indexed: true,
      internalType: "address",
      name: "sender",
      type: "address",
    },
    {
      indexed: true,
      internalType: "address",
      name: "paymaster",
      type: "address",
    },
    {
      indexed: false,
      internalType: "uint256",
      name: "nonce",
      type: "uint256",
    },
    {
      indexed: false,
      internalType: "bool",
      name: "success",
      type: "bool",
    },
    {
      indexed: false,
      internalType: "uint256",
      name: "actualGasCost",
      type: "uint256",
    },
    {
      indexed: false,
      internalType: "uint256",
      name: "actualGasUsed",
      type: "uint256",
    },
  ],
  name: "UserOperationEvent",
  type: "event",
};

type AccountDeployedEventAbi = {
  anonymous: false,
  inputs: [
    {
      indexed: true,
      internalType: "bytes32",
      name: "userOpHash",
      type: "bytes32",
    },
    {
      indexed: true,
      internalType: "address",
      name: "sender",
      type: "address",
    },
    {
      indexed: false,
      internalType: "address",
      name: "factory",
      type: "address",
    },
    {
      indexed: false,
      internalType: "address",
      name: "paymaster",
      type: "address",
    },
  ],
  name: "AccountDeployed",
  type: "event",
};

type SignatureAggregatorChangedEventAbi = {
  anonymous: false,
  inputs: [
    {
      indexed: true,
      internalType: "address",
      name: "aggregator",
      type: "address",
    },
  ],
  name: "SignatureAggregatorChanged",
  type: "event",
};

export class EntryPointV7EventsService {
  private lastBlock = 0;
  private LAST_BLOCK_KEY: string;

  constructor(
    private entryPoint: Hex,
    private chainId: number,
    private contract: GetContractReturnType<typeof EntryPoint__factory.abi, PublicClient>,
    private publicClient: PublicClient,
    private reputationService: ReputationService,
    private mempoolService: MempoolService,
    private eventBus: ExecutorEventBus,
    private db: IDbController,
    private logger: Logger
  ) {
    this.LAST_BLOCK_KEY = `${this.chainId}:LAST_PARSED_BLOCK:${this.entryPoint}`;
  }

  initEventListener(): void {
    this.publicClient.watchContractEvent({
      abi: EntryPoint__factory.abi,
      eventName: "UserOperationEvent",
      address: this.entryPoint,
      onLogs: async (args) => {
        const ev = args[args.length - 1];
        await this.handleUserOperationEvent(ev);
      }
    });

    this.publicClient.watchContractEvent({
      abi: EntryPoint__factory.abi,
      address: this.entryPoint,
      eventName: "AccountDeployed",
      onLogs: async (args) => {
        const ev = args[args.length - 1];
        await this.handleAccountDeployedEvent(ev);
      }
    });

    this.publicClient.watchContractEvent({
      abi: EntryPoint__factory.abi,
      address: this.entryPoint,
      eventName: "SignatureAggregatorChanged",
      onLogs: async (args) => {
        const ev = args[args.length - 1];
        await this.handleAggregatorChangedEvent(ev);
      }
    });
  }

  // onUserOperationEvent(callback: TypedListener<UserOperationEventEvent>): void {
  //   this.contract.on(this.contract.filters.UserOperationEvent(), callback);
  // }

  // offUserOperationEvent(
  //   callback: TypedListener<UserOperationEventEvent>
  // ): void {
  //   this.contract.off(this.contract.filters.UserOperationEvent(), callback);
  // }

  /**
   * manually handle all new events since last run
   */
  // async handlePastEvents(): Promise<void> {
  //   await this.fetchLastBlockPerEntryPoints();
  //   const events = await this.contract.queryFilter(
  //     { address: this.entryPoint },
  //     this.lastBlock
  //   );
  //   for (const ev of events) {
  //     await this.handleEvent(ev);
  //   }
  //   if (events.length > 0) {
  //     const lastEvent = events[events.length - 1];
  //     const blockNum = lastEvent!.blockNumber;
  //     if (!this.lastBlock || Number(this.lastBlock) < blockNum) {
  //       this.lastBlock = blockNum;
  //     }
  //   }
  //   await this.saveLastBlockPerEntryPoints();
  // }

  // async handleEvent(ev: ParsedEventType): Promise<void> {
  //   switch (ev.event) {
  //     case "UserOperationEvent":
  //       await this.handleUserOperationEvent(ev as UserOperationEventEvent);
  //       break;
  //     case "AccountDeployedEvent":
  //       await this.handleAccountDeployedEvent(ev as AccountDeployedEvent);
  //       break;
  //     case "SignatureAggregatorForUserOperations":
  //       await this.handleAggregatorChangedEvent(
  //         ev as SignatureAggregatorChangedEvent
  //       );
  //       break;
  //   }
  // }

  async handleAggregatorChangedEvent(
    ev: Log<bigint, number, false, SignatureAggregatorChangedEventAbi>
  ): Promise<void> {
    this.eventAggregator = ev.args.aggregator ?? null;
    this.eventAggregatorTxHash = ev.transactionHash;
  }

  eventAggregator: string | null = null;
  eventAggregatorTxHash: string | null = null;

  // aggregator event is sent once per events bundle for all UserOperationEvents in this bundle.
  // it is not sent at all if the transaction is handleOps
  getEventAggregator(
    ev: Log<bigint, number, false, SignatureAggregatorChangedEventAbi> | 
          Log<bigint, number, false, UserOperationEventAbi>
  ): string | null {
    if (ev.transactionHash !== this.eventAggregatorTxHash) {
      this.eventAggregator = null;
      this.eventAggregatorTxHash = ev.transactionHash;
    }
    return this.eventAggregator;
  }

  // AccountDeployed event is sent before each UserOperationEvent that deploys a contract.
  async handleAccountDeployedEvent(
    ev: Log<bigint, number, false, AccountDeployedEventAbi>
  ): Promise<void> {
    await this.includedAddress(ev.args.factory ?? null);
  }

  async handleUserOperationEvent(
    ev: Log<bigint, number, false, UserOperationEventAbi>
  ): Promise<void> {
    const entry = await this.mempoolService.getEntryByHash(ev.args.userOpHash!);
    if (entry) {
      this.logger.debug(
        `Found UserOperationEvent for ${ev.args.userOpHash}. Deleting userop...`
      );
      await this.mempoolService.updateStatus(
        [entry],
        MempoolEntryStatus.OnChain,
        { transaction: ev.transactionHash }
      );
      this.eventBus.emit(ExecutorEvent.onChainUserOps, entry);
    }
    await this.includedAddress(ev.args.sender ?? null);
    await this.includedAddress(ev.args.paymaster ?? null);
    await this.includedAddress(this.getEventAggregator(ev));
  }

  private async includedAddress(data: string | null): Promise<void> {
    if (data != null && data.length >= 42) {
      const addr = data.slice(0, 42);
      await this.reputationService.updateIncludedStatus(addr);
    }
  }

  // private async saveLastBlockPerEntryPoints(): Promise<void> {
  //   await this.db.put(this.LAST_BLOCK_KEY, this.lastBlock);
  // }

  // private async fetchLastBlockPerEntryPoints(): Promise<void> {
  //   const entry = await this.db
  //     .get<typeof this.lastBlock>(this.LAST_BLOCK_KEY)
  //     .catch(() => null);
  //   if (entry != null) {
  //     this.lastBlock = entry;
  //   }
  // }
}

type ParsedEventType =
  | UserOperationEventEvent
  | AccountDeployedEvent
  | SignatureAggregatorChangedEvent;
