import { providers } from 'ethers';
import { EntryPoint } from 'app/bundler/contracts';
import { ReputationService } from './ReputationService';
import { EntryPoint__factory } from 'app/bundler/contracts/factories';
import { put, get, getMany, del } from 'app/lib/rocksdb-connection';
import {
  AccountDeployedEvent,
  SignatureAggregatorChangedEvent,
  UserOperationEventEvent
} from 'app/bundler/contracts/EntryPoint';
import { TypedEvent } from 'app/bundler/contracts/common';

export class EventsService {
  private entryPoints: EntryPoint[] = [];
  private lastBlockPerEntryPoint: {
    [address: string]: number
  } = {};
  private LAST_BLOCK_KEY: string;

  constructor(
    private chainId: number,
    private provider: providers.JsonRpcProvider,
    private reputationService: ReputationService,
    private entryPointAddrs: string[]
  ) {
    this.LAST_BLOCK_KEY = `${this.chainId}:LAST_BLOCK_PER_ENTRY_POINTS`;
    for (const entryPoint of this.entryPointAddrs) {
      const contract = EntryPoint__factory.connect(entryPoint, this.provider);
      this.entryPoints.push(contract);
    }
  }

  initEventListener(): void {
    for (const contract of this.entryPoints) {
      contract.on(contract.filters.UserOperationEvent(), (...args) => {
        const ev = args[args.length - 1];
        this.handleEvent(ev as any);
      });
    }
  }

  /**
   * manually handle all new events since last run
   */
  async handlePastEvents (): Promise<void> {
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
          !this.lastBlockPerEntryPoint[address] ||
          Number(this.lastBlockPerEntryPoint[address]) < blockNum
        ) {
          this.lastBlockPerEntryPoint[address] = blockNum;
        }
      }
    }
    await this.saveLastBlockPerEntryPoints();
  }

  async handleEvent (ev: UserOperationEventEvent | AccountDeployedEvent | SignatureAggregatorChangedEvent): Promise<void> {
    switch (ev.event) {
      case 'UserOperationEventEvent':
        this.handleUserOperationEvent(ev as any);
        break;
      case 'AccountDeployedEvent':
        this.handleAccountDeployedEvent(ev as any);
        break;
      case 'SignatureAggregatorForUserOperationsEvent':
        this.handleAggregatorChangedEvent(ev as any);
        break;
    }
  }

  handleAggregatorChangedEvent (ev: SignatureAggregatorChangedEvent): void {
    this.eventAggregator = ev.args.aggregator;
    this.eventAggregatorTxHash = ev.transactionHash;
  }

  eventAggregator: string | null = null;
  eventAggregatorTxHash: string | null = null;

  // aggregator event is sent once per events bundle for all UserOperationEvents in this bundle.
  // it is not sent at all if the transaction is handleOps
  getEventAggregator (ev: TypedEvent): string | null {
    if (ev.transactionHash !== this.eventAggregatorTxHash) {
      this.eventAggregator = null;
      this.eventAggregatorTxHash = ev.transactionHash;
    }
    return this.eventAggregator;
  }

  // AccountDeployed event is sent before each UserOperationEvent that deploys a contract.
  handleAccountDeployedEvent (ev: AccountDeployedEvent): void {
    this.includedAddress(ev.args.factory);
  }

  handleUserOperationEvent (ev: UserOperationEventEvent): void {
    this.includedAddress(ev.args.sender);
    this.includedAddress(ev.args.paymaster);
    this.includedAddress(this.getEventAggregator(ev));
  }

  private includedAddress (data: string | null): void {
    if (data != null && data.length > 42) {
      const addr = data.slice(0, 42);
      this.reputationService.updateIncludedStatus(addr);
    }
  }

  private async saveLastBlockPerEntryPoints() {
    await put(this.LAST_BLOCK_KEY, this.lastBlockPerEntryPoint);
  }

  private async fetchLastBlockPerEntryPoints() {
    const entry = await get<typeof this.lastBlockPerEntryPoint>(this.LAST_BLOCK_KEY).catch(_ => null);
    if (entry) {
      this.lastBlockPerEntryPoint = entry;
    }
  }
}