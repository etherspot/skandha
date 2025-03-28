import { EntryPoint as IEntryPointV7 } from "@skandha/types/lib/contracts/EPv7/core/EntryPoint";
import { IDbController, Logger } from "@skandha/types/lib";
import { ReputationService } from "../ReputationService";
import { MempoolService } from "../MempoolService";
import { EntryPointService } from "../EntryPointService";
import { NetworkConfig } from "../../interfaces";
import { ExecutorEventBus } from "../SubscriptionService";
import {
  EntryPointV7EventsService,
  IEntryPointEventsService,
} from "./versions";
import { PublicClient } from "viem";

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
      this.eventsService[address] = new EntryPointV7EventsService(
        addr,
        this.chainId,
        this.entryPointService.getEntryPoint(address).contract,
        this.publicClient,
        this.reputationService,
        this.mempoolService,
        this.eventBus,
        this.db,
        this.logger,
        this.networkConfig.pollingInterval
      );
      this.eventsService[address].initEventListener();
    }
  }
}
