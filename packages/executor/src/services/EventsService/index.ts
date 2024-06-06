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
    private eventBus: ExecutorEventBus,
    private db: IDbController,
    private logger: Logger
  ) {
    for (const addr of this.networkConfig.entryPoints) {
      const address = addr.toLowerCase();
      this.eventsService[address] = new EntryPointV7EventsService(
        addr,
        this.chainId,
        this.entryPointService.getEntryPoint(address).contract as IEntryPointV7,
        this.reputationService,
        this.mempoolService,
        this.eventBus,
        this.db,
        this.logger
      );
      this.eventsService[address].initEventListener();
    }
  }
}
