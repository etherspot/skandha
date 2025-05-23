import { BigNumber, utils } from "ethers";
import RpcError from "@skandha/types/lib/api/errors/rpc-error";
import {
  IEntityWithAggregator,
  IWhitelistedEntities,
  ReputationStatus,
} from "@skandha/types/lib/executor";
import * as RpcErrorCodes from "@skandha/types/lib/api/errors/rpc-error-codes";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { INITCODE_EIP7702_MARKER } from "@skandha/params/lib";
import { MempoolEntry } from "../../entities/MempoolEntry";
import { KnownEntities, NetworkConfig, StakeInfo } from "../../interfaces";
import { ReputationService } from "../ReputationService";
import { getAddr } from "../../utils";
import { EntryPointService } from "../EntryPointService";
import { MempoolService } from "./service";
import {
  MAX_MEMPOOL_USEROPS_PER_SENDER,
  THROTTLED_ENTITY_MEMPOOL_COUNT,
} from "./constants";

export class MempoolReputationChecks {
  constructor(
    private service: MempoolService,
    private entryPointService: EntryPointService,
    private reputationService: ReputationService,
    private networkConfig: NetworkConfig
  ) {}

  async checkEntityCountInMempool(
    entry: MempoolEntry,
    accountInfo: StakeInfo,
    factoryInfo: StakeInfo | undefined,
    paymasterInfo: StakeInfo | undefined,
    aggregatorInfo: StakeInfo | undefined
  ): Promise<void> {
    const mEntries = await this.service.fetchPendingUserOps();
    const titles: IEntityWithAggregator[] = [
      "account",
      "factory",
      "paymaster",
      "aggregator",
    ];
    const count = [1, 1, 1, 1]; // starting all values from one because `entry` param counts as well
    const stakes = [accountInfo, factoryInfo, paymasterInfo, aggregatorInfo];
    for (const mEntry of mEntries) {
      if (
        utils.getAddress(mEntry.userOp.sender) ==
        utils.getAddress(accountInfo.addr)
      ) {
        count[0]++;
      }
      // counts the number of similar factories, paymasters and aggregator in the mempool
      for (let i = 1; i < 4; ++i) {
        const mEntity = mEntry[titles[i] as keyof MempoolEntry] as string;
        if (
          stakes[i] &&
          mEntity &&
          utils.getAddress(mEntity) == utils.getAddress(stakes[i]!.addr)
        ) {
          count[i]++;
        }
      }
    }

    // check for ban
    for (const [index, stake] of stakes.entries()) {
      if (!stake) continue;
      const whitelist =
        this.networkConfig.whitelistedEntities[
          titles[index] as keyof IWhitelistedEntities
        ];
      if (
        stake.addr &&
        whitelist != null &&
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        whitelist.some(
          (addr: string) =>
            utils.getAddress(addr) === utils.getAddress(stake.addr)
        )
      ) {
        continue;
      }
      const status = await this.reputationService.getStatus(stake.addr);
      if (status === ReputationStatus.BANNED) {
        throw new RpcError(
          `${titles[index]} ${stake.addr} is banned`,
          RpcErrorCodes.PAYMASTER_OR_AGGREGATOR_BANNED
        );
      }
      if (
        status === ReputationStatus.THROTTLED &&
        count[index] > THROTTLED_ENTITY_MEMPOOL_COUNT
      ) {
        throw new RpcError(
          `${titles[index]} ${stake.addr} is throttled`,
          RpcErrorCodes.PAYMASTER_OR_AGGREGATOR_BANNED
        );
      }
      const reputationEntry =
        index === 0 ? null : await this.reputationService.fetchOne(stake.addr);
      const maxMempoolCount =
        index === 0
          ? MAX_MEMPOOL_USEROPS_PER_SENDER
          : this.reputationService.calculateMaxAllowedMempoolOpsUnstaked(
              reputationEntry!
            );
      if (count[index] > maxMempoolCount) {
        const checkStake = await this.reputationService.checkStake(stake);
        if (checkStake.code !== 0) {
          throw new RpcError(checkStake.msg, checkStake.code);
        }
      }
    }
  }

  async checkMultipleRolesViolation(entry: MempoolEntry): Promise<void> {
    const { userOp, entryPoint } = entry;
    const { otherEntities, accounts } = await this.getKnownEntities();
    if (otherEntities.includes(utils.getAddress(userOp.sender))) {
      throw new RpcError(
        `The sender address "${userOp.sender}" is used as a different entity in another UserOperation currently in mempool`,
        RpcErrorCodes.INVALID_OPCODE
      );
    }

    const paymaster = this.entryPointService.getPaymaster(entryPoint, userOp);
    if (paymaster) {
      if (accounts.includes(utils.getAddress(paymaster))) {
        throw new RpcError(
          `A Paymaster at ${paymaster} in this UserOperation is used as a sender entity in another UserOperation currently in mempool.`,
          RpcErrorCodes.INVALID_OPCODE
        );
      }
    }

    const factory = this.entryPointService.getFactory(entryPoint, userOp);
    if (factory && factory !== INITCODE_EIP7702_MARKER) {
      if (accounts.includes(utils.getAddress(factory))) {
        throw new RpcError(
          `Factory: ${factory} is already used as a sender in another pending UserOperation.`,
          RpcErrorCodes.INVALID_OPCODE
        );
      }
    }
  }

  async updateSeenStatus(
    entryPoint: string,
    userOp: UserOperation,
    stakeInfo: StakeInfo,
    aggregator?: string
  ): Promise<void> {
    const paymaster = this.entryPointService.getPaymaster(entryPoint, userOp);
    const factory = this.entryPointService.getFactory(entryPoint, userOp);

    const isStaked =
      BigNumber.from(stakeInfo.stake).gte(this.networkConfig.minStake!) &&
      BigNumber.from(stakeInfo.unstakeDelaySec).gte(
        this.networkConfig.minUnstakeDelay
      );

    if (isStaked) {
      await this.reputationService.updateSeenStatus(userOp.sender);
    }
    if (aggregator) {
      await this.reputationService.updateSeenStatus(aggregator);
    }
    if (paymaster) {
      await this.reputationService.updateSeenStatus(paymaster);
    }
    if (factory) {
      await this.reputationService.updateSeenStatus(factory);
    }
  }

  /**
   * returns a list of addresses of all entities in the mempool
   */
  private async getKnownEntities(): Promise<KnownEntities> {
    const entities: KnownEntities = {
      accounts: [],
      otherEntities: [],
    };
    const entries = await this.service.fetchPendingUserOps();
    for (const entry of entries) {
      entities.accounts.push(utils.getAddress(entry.userOp.sender));
      if (entry.paymaster && entry.paymaster.length >= 42) {
        entities.otherEntities.push(
          utils.getAddress(getAddr(entry.paymaster)!)
        );
      }
      if (entry.factory && entry.factory.length >= 42) {
        entities.otherEntities.push(utils.getAddress(getAddr(entry.factory)!));
      }
    }
    return entities;
  }
}
