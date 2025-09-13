import { IDbController, Logger } from "@skandha/types/lib/index.js";
import { PublicClient } from "viem";
import { ReputationService } from "../ReputationService.js";
import { MempoolService } from "../MempoolService/index.js";
import { EntryPointService } from "../EntryPointService/index.js";
import { NetworkConfig } from "../../interfaces.js";
import { ExecutorEventBus } from "../SubscriptionService.js";
import {
  EntryPointV8EventsService,
  IEntryPointEventsService,
} from "./versions/index.js";

export class EventsService {
  private eventsService: {
    [address: string]: IEntryPointEventsService;
  } = {};

  constructor(
    private chainId: number,
    private networkConfig: NetworkConfig,
    private reputationService: ReputationService,
    private mempoolService: MempoolService,
    private entryPointService: EntryPointService,
    private publicClient: PublicClient,
    private eventBus: ExecutorEventBus,
    private db: IDbController,
    private logger: Logger
  ) {
    for (const addr of this.networkConfig.entryPoints) {
      const address = addr.toLowerCase();
      this.eventsService[address] = new EntryPointV8EventsService(
        addr,
        this.chainId,
        this.entryPointService.getEntryPoint(address).contract,
        this.publicClient,
        this.reputationService,
        this.mempoolService,
        this.eventBus,
        this.db,
        this.logger,
        this.networkConfig.pollingInterval,
        this.networkConfig.disableWatchContract
      );
      this.eventsService[address].initEventListener();
    }
  }
}
