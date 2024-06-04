import { IDbController, Logger } from "@skandha/types/lib";
import {
  AccountDeployedEvent,
  SignatureAggregatorChangedEvent,
  UserOperationEventEvent,
  EntryPoint,
} from "@skandha/types/lib/contracts/EPv7/core/EntryPoint";
import { MempoolEntryStatus } from "@skandha/types/lib/executor";
import { TypedEvent, TypedListener } from "@skandha/types/lib/contracts/common";
import { ReputationService } from "../../ReputationService";
import { MempoolService } from "../../MempoolService";
import { ExecutorEvent, ExecutorEventBus } from "../../SubscriptionService";

export class EntryPointV7EventsService {
  private lastBlock = 0;
  private LAST_BLOCK_KEY: string;

  constructor(
    private entryPoint: string,
    private chainId: number,
    private contract: EntryPoint,
    private reputationService: ReputationService,
    private mempoolService: MempoolService,
    private eventBus: ExecutorEventBus,
    private db: IDbController,
    private logger: Logger
  ) {
    this.LAST_BLOCK_KEY = `${this.chainId}:LAST_PARSED_BLOCK:${this.entryPoint}`;
  }

  initEventListener(): void {
    this.contract.on(
      this.contract.filters.UserOperationEvent(),
      async (...args) => {
        const ev = args[args.length - 1];
        await this.handleEvent(ev as ParsedEventType);
      }
    );
  }

  onUserOperationEvent(callback: TypedListener<UserOperationEventEvent>): void {
    this.contract.on(this.contract.filters.UserOperationEvent(), callback);
  }

  offUserOperationEvent(
    callback: TypedListener<UserOperationEventEvent>
  ): void {
    this.contract.off(this.contract.filters.UserOperationEvent(), callback);
  }

  /**
   * manually handle all new events since last run
   */
  async handlePastEvents(): Promise<void> {
    await this.fetchLastBlockPerEntryPoints();
    const events = await this.contract.queryFilter(
      { address: this.entryPoint },
      this.lastBlock
    );
    for (const ev of events) {
      await this.handleEvent(ev);
    }
    if (events.length > 0) {
      const lastEvent = events[events.length - 1];
      const blockNum = lastEvent!.blockNumber;
      if (!this.lastBlock || Number(this.lastBlock) < blockNum) {
        this.lastBlock = blockNum;
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
    await this.db.put(this.LAST_BLOCK_KEY, this.lastBlock);
  }

  private async fetchLastBlockPerEntryPoints(): Promise<void> {
    const entry = await this.db
      .get<typeof this.lastBlock>(this.LAST_BLOCK_KEY)
      .catch(() => null);
    if (entry != null) {
      this.lastBlock = entry;
    }
  }
}

type ParsedEventType =
  | UserOperationEventEvent
  | AccountDeployedEvent
  | SignatureAggregatorChangedEvent;
