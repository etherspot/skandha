import { IDbController, Logger } from "@skandha/types/lib/index.js";
import { MempoolEntryStatus } from "@skandha/types/lib/executor";
import { GetContractReturnType, Hex, PublicClient, Log, parseAbi } from "viem";
import { EntryPoint__factory } from "@skandha/types/lib/contracts/EPv7/factories/core";
import { ReputationService } from "../../ReputationService.js";
import { MempoolService } from "../../MempoolService/index.js";
import { ExecutorEvent, ExecutorEventBus } from "../../SubscriptionService.js";

type UserOperationEventAbi = {
  anonymous: false;
  inputs: [
    {
      indexed: true;
      internalType: "bytes32";
      name: "userOpHash";
      type: "bytes32";
    },
    {
      indexed: true;
      internalType: "address";
      name: "sender";
      type: "address";
    },
    {
      indexed: true;
      internalType: "address";
      name: "paymaster";
      type: "address";
    },
    {
      indexed: false;
      internalType: "uint256";
      name: "nonce";
      type: "uint256";
    },
    {
      indexed: false;
      internalType: "bool";
      name: "success";
      type: "bool";
    },
    {
      indexed: false;
      internalType: "uint256";
      name: "actualGasCost";
      type: "uint256";
    },
    {
      indexed: false;
      internalType: "uint256";
      name: "actualGasUsed";
      type: "uint256";
    }
  ];
  name: "UserOperationEvent";
  type: "event";
};

type AccountDeployedEventAbi = {
  anonymous: false;
  inputs: [
    {
      indexed: true;
      internalType: "bytes32";
      name: "userOpHash";
      type: "bytes32";
    },
    {
      indexed: true;
      internalType: "address";
      name: "sender";
      type: "address";
    },
    {
      indexed: false;
      internalType: "address";
      name: "factory";
      type: "address";
    },
    {
      indexed: false;
      internalType: "address";
      name: "paymaster";
      type: "address";
    }
  ];
  name: "AccountDeployed";
  type: "event";
};

type SignatureAggregatorChangedEventAbi = {
  anonymous: false;
  inputs: [
    {
      indexed: true;
      internalType: "address";
      name: "aggregator";
      type: "address";
    }
  ];
  name: "SignatureAggregatorChanged";
  type: "event";
};

export class EntryPointV8EventsService {
  private lastBlock: bigint = BigInt(0);
  private LAST_BLOCK_KEY: string;
  private eventsAbi;

  constructor(
    private entryPoint: Hex,
    private chainId: number,
    private contract: GetContractReturnType,
    private publicClient: PublicClient,
    private reputationService: ReputationService,
    private mempoolService: MempoolService,
    private eventBus: ExecutorEventBus,
    private db: IDbController,
    private logger: Logger,
    private pollingInterval: number,
    private disableWatchContractevent: boolean
  ) {
    this.LAST_BLOCK_KEY = `${this.chainId}:LAST_PARSED_BLOCK:${this.entryPoint}`;
    this.eventsAbi = parseAbi([
      "event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)",
      "event AccountDeployed(bytes32 indexed userOpHash, address indexed sender, address factory, address paymaster)",
      "event SignatureAggregatorChanged(address indexed aggregator)",
    ]);
  }

  async pollEvents(publicClient: PublicClient): Promise<void> {
    try {
      let blockNumber: bigint;
      const currentBlockNumber = await this.publicClient
        .getBlockNumber()
        .catch((err) => {
          this.logger.error(
            `Error fetching block number while polling for user operation events: ${JSON.stringify(
              err
            )}`
          );
          return err;
        });
      if (currentBlockNumber instanceof Error) {
        return;
      }
      if (this.lastBlock === BigInt(0)) {
        blockNumber = currentBlockNumber - BigInt(1);
      } else {
        blockNumber = this.lastBlock + BigInt(1);
      }
      const logs = await publicClient
        .getLogs({
          events: this.eventsAbi,
          address: this.entryPoint,
          fromBlock: blockNumber,
        })
        .catch((err) => {
          this.logger.error(
            `Error fetching logs while polling for user operation events: ${JSON.stringify(
              err
            )}`
          );
          return err;
        });

      if (logs instanceof Error) {
        return;
      }

      if (logs.length === 0) {
        this.lastBlock = currentBlockNumber;
      }

      for (const log of logs) {
        void this.handleEvent(log);
        this.lastBlock = log.blockNumber;
      }
    } catch (error) {
      this.logger.error(
        "Error fetching block number during, polling for user operation events"
      );
    }
  }

  initEventListener(): void {
    if (!this.disableWatchContractevent) {
      this.publicClient.watchContractEvent({
        abi: EntryPoint__factory.abi,
        eventName: "UserOperationEvent",
        address: this.entryPoint,
        onLogs: async (args) => {
          const ev = args[args.length - 1];
          await this.handleUserOperationEvent(ev);
        },
      });

      this.publicClient.watchContractEvent({
        abi: EntryPoint__factory.abi,
        address: this.entryPoint,
        eventName: "AccountDeployed",
        onLogs: async (args) => {
          const ev = args[args.length - 1];
          await this.handleAccountDeployedEvent(ev);
        },
      });

      this.publicClient.watchContractEvent({
        abi: EntryPoint__factory.abi,
        address: this.entryPoint,
        eventName: "SignatureAggregatorChanged",
        onLogs: async (args) => {
          const ev = args[args.length - 1];
          await this.handleAggregatorChangedEvent(ev);
        },
      });
    }

    setInterval(() => {
      void this.pollEvents(this.publicClient);
    }, this.pollingInterval);
  }

  async handleEvent(
    ev:
      | Log<bigint, number, false, UserOperationEventAbi>
      | Log<bigint, number, false, AccountDeployedEventAbi>
      | Log<bigint, number, false, SignatureAggregatorChangedEventAbi>
  ): Promise<void> {
    switch (ev.eventName) {
      case "UserOperationEvent":
        await this.handleUserOperationEvent(ev);
        break;
      case "AccountDeployed":
        await this.handleAccountDeployedEvent(ev);
        break;
      case "SignatureAggregatorChanged":
        await this.handleAggregatorChangedEvent(ev);
        break;
    }
  }

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
    ev:
      | Log<bigint, number, false, SignatureAggregatorChangedEventAbi>
      | Log<bigint, number, false, UserOperationEventAbi>
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
      await this.includedAddress(ev.args.sender ?? null);
      await this.includedAddress(ev.args.paymaster ?? null);
      await this.includedAddress(this.getEventAggregator(ev));
    }
  }

  private async includedAddress(data: string | null): Promise<void> {
    if (data != null && data.length >= 42) {
      const addr = data.slice(0, 42);
      await this.reputationService.updateIncludedStatus(addr);
    }
  }
}
