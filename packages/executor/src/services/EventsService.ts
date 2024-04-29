import { providers } from "ethers";
import { IDbController, Logger } from "types/lib";
import { IEntryPoint } from "types/lib/executor/contracts";
import { IEntryPoint__factory } from "types/lib/executor/contracts/factories";
import {
  AccountDeployedEvent,
  SignatureAggregatorChangedEvent,
  UserOperationEventEvent,
} from "types/lib/executor/contracts/EntryPoint";
import { TypedEvent, TypedListener } from "types/lib/executor/contracts/common";
import { MempoolEntryStatus } from "types/lib/executor";
import { ReputationService } from "./ReputationService";
import { MempoolService } from "./MempoolService";
import { ExecutorEvent, ExecutorEventBus } from "./SubscriptionService";

/**
 * Listens for events in the blockchain
 */
export class EventsService {
  private entryPoints: IEntryPoint[] = [];
  private lastBlockPerEntryPoint: {
    [address: string]: number;
  } = {};
  private LAST_BLOCK_KEY: string;

  constructor(
    private chainId: number,
    private provider: providers.JsonRpcProvider,
    private logger: Logger,
    private reputationService: ReputationService,
    private mempoolService: MempoolService,
    private eventBus: ExecutorEventBus,
    private entryPointAddrs: string[],
    private db: IDbController
  ) {
    this.LAST_BLOCK_KEY = `${this.chainId}:LAST_BLOCK_PER_ENTRY_POINTS`;
    for (const entryPoint of this.entryPointAddrs) {
      const contract = IEntryPoint__factory.connect(entryPoint, this.provider);
      this.entryPoints.push(contract);
    }
  }

  initEventListener(): void {
    for (const contract of this.entryPoints) {
      contract.on(contract.filters.UserOperationEvent(), async (...args) => {
        const ev = args[args.length - 1];
        await this.handleEvent(ev as ParsedEventType);
      });
    }
  }

  onUserOperationEvent(callback: TypedListener<UserOperationEventEvent>): void {
    for (const contract of this.entryPoints) {
      contract.on(contract.filters.UserOperationEvent(), callback);
    }
  }

  offUserOperationEvent(
    callback: TypedListener<UserOperationEventEvent>
  ): void {
    for (const contract of this.entryPoints) {
      contract.off(contract.filters.UserOperationEvent(), callback);
    }
  }

  /**
   * manually handle all new events since last run
   */
  async handlePastEvents(): Promise<void> {
    await this.fetchLastBlockPerEntryPoints();
    for (const contract of this.entryPoints) {
      const { address } = contract;
      const events = await contract.queryFilter(
        { address: contract.address },
        this.lastBlockPerEntryPoint[address]
      );
      for (const ev of events) {
        await this.handleEvent(ev);
      }
      if (events.length > 0) {
        const lastEvent = events[events.length - 1];
        const blockNum = lastEvent!.blockNumber;
        if (
          !(this.lastBlockPerEntryPoint[address] ?? 0) ||
          Number(this.lastBlockPerEntryPoint[address]) < blockNum
        ) {
          this.lastBlockPerEntryPoint[address] = blockNum;
        }
      }
    }
    await this.saveLastBlockPerEntryPoints();
  }

  async handleEvent(ev: ParsedEventType): Promise<void> {
    switch (ev.event) {
      case "UserOperationEvent":
        await this.handleUserOperationEvent(ev as UserOperationEventEvent);
        break;
      case "AccountDeployedEvent":
        await this.handleAccountDeployedEvent(ev as AccountDeployedEvent);
        break;
      case "SignatureAggregatorForUserOperations":
        await this.handleAggregatorChangedEvent(
          ev as SignatureAggregatorChangedEvent
        );
        break;
    }
  }

  async handleAggregatorChangedEvent(
    ev: SignatureAggregatorChangedEvent
  ): Promise<void> {
    this.eventAggregator = ev.args.aggregator;
    this.eventAggregatorTxHash = ev.transactionHash;
  }

  eventAggregator: string | null = null;
  eventAggregatorTxHash: string | null = null;

  // aggregator event is sent once per events bundle for all UserOperationEvents in this bundle.
  // it is not sent at all if the transaction is handleOps
  getEventAggregator(ev: TypedEvent): string | null {
    if (ev.transactionHash !== this.eventAggregatorTxHash) {
      this.eventAggregator = null;
      this.eventAggregatorTxHash = ev.transactionHash;
    }
    return this.eventAggregator;
  }

  // AccountDeployed event is sent before each UserOperationEvent that deploys a contract.
  async handleAccountDeployedEvent(ev: AccountDeployedEvent): Promise<void> {
    await this.includedAddress(ev.args.factory);
  }

  async handleUserOperationEvent(ev: UserOperationEventEvent): Promise<void> {
    const entry = await this.mempoolService.getEntryByHash(ev.args.userOpHash);
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
    await this.includedAddress(ev.args.sender);
    await this.includedAddress(ev.args.paymaster);
    await this.includedAddress(this.getEventAggregator(ev));
  }

  private async includedAddress(data: string | null): Promise<void> {
    if (data != null && data.length >= 42) {
      const addr = data.slice(0, 42);
      await this.reputationService.updateIncludedStatus(addr);
    }
  }

  private async saveLastBlockPerEntryPoints(): Promise<void> {
    await this.db.put(this.LAST_BLOCK_KEY, this.lastBlockPerEntryPoint);
  }

  private async fetchLastBlockPerEntryPoints(): Promise<void> {
    const entry = await this.db
      .get<typeof this.lastBlockPerEntryPoint>(this.LAST_BLOCK_KEY)
      .catch(() => null);
    if (entry) {
      this.lastBlockPerEntryPoint = entry;
    }
  }
}

type ParsedEventType =
  | UserOperationEventEvent
  | AccountDeployedEvent
  | SignatureAggregatorChangedEvent;
