import { NetworkNames } from 'etherspot';
import { BigNumber, ethers, providers } from 'ethers';
import logger from 'app/logger';
import { MempoolService } from './MempoolService';
import {
  UserOpValidationResult,
  UserOpValidationService
} from './UserOpValidation';
import { MempoolEntry } from '../entities/MempoolEntry';
import config from 'app/config';
import { EntryPoint__factory } from 'app/bundler/contracts/factories';
import { getAddr } from 'app/bundler/utils';
import { ReputationService } from './ReputationService';
import { ReputationStatus } from 'app/@types';

export class BundlingService {;
  constructor(
    private network: NetworkNames,
    private provider: providers.JsonRpcProvider,
    private mempoolService: MempoolService,
    private userOpValidationService: UserOpValidationService,
    private reputationService: ReputationService
  ) {}

  async sendBundle(bundle: MempoolEntry[]): Promise<void> {
    if (!bundle.length) {
      return;
    }
    const entryPoint = bundle[0]!.entryPoint;
    const entryPointContract = EntryPoint__factory.connect(
      entryPoint,
      this.provider,
    );
    const wallet = config.getEntryPointRelayer(this.network, entryPoint)!;
    const beneficiary = config.getEntryBeneficiary(this.network, entryPoint)!;
    try {
      let txRequest = entryPointContract.interface.encodeFunctionData(
        'handleOps',
        [ bundle.map(entry => entry.userOp), beneficiary ]
      );
      const tx = await wallet.sendTransaction({
        to: entryPoint,
        data: txRequest
      });
      
      logger.debug(`Sent new bundle ${tx.hash}`);

      // TODO: change to batched delete
      for (let entry of bundle) {
        await this.mempoolService.remove(entry);
      }
    } catch (err: any) {
      if (err.errorName !== 'FailedOp') {
        logger.warn(`Failed handleOps, but non-FailedOp error ${err}`);
        return;
      }
      const {
        index,
        paymaster,
        reason
      } = err.errorArgs;
      const entry = bundle[index]!;
      if (paymaster !== ethers.constants.AddressZero) {
        this.reputationService.crashedHandleOps(paymaster);
      } else if (typeof reason === 'string' && reason.startsWith('AA1')) {
        const factory = getAddr(entry.userOp.initCode);
        if (factory) {
          this.reputationService.crashedHandleOps(factory);
        }
      } else {
        await this.mempoolService.remove(entry);
        logger.warn(`Failed handleOps sender=${entry.userOp.sender}`);
      }
    }
  };

  async createBundle(): Promise<MempoolEntry[]> {
    // TODO: support multiple entry points
    //       filter bundles by entry points
    const entries = await this.mempoolService.getSortedOps();
    const bundle: MempoolEntry[] = [];

    const paymasterDeposit: { [key: string]: BigNumber } = {};
    const stakedEntityCount: { [key: string]: number } = {};
    const senders = new Set<string>();
    for (const entry of entries) {
      const paymaster = getAddr(entry.userOp.paymasterAndData);
      const factory = getAddr(entry.userOp.initCode);

      if (paymaster) {
        const paymasterStatus = await this.reputationService.getStatus(paymaster);
        if (paymasterStatus === ReputationStatus.BANNED) {
          await this.mempoolService.remove(entry);
          continue;
        } else if (
          paymasterStatus === ReputationStatus.THROTTLED ||
          (stakedEntityCount[paymaster] || 0) > 1
        ) {
          logger.debug('skipping throttled paymaster', {
            metadata: {
              sender: entry.userOp.sender,
              nonce: entry.userOp.nonce,
              paymaster
            }
          });
          continue;
        }
      }

      if (factory) {
        const deployerStatus = await this.reputationService.getStatus(factory);
        if (deployerStatus === ReputationStatus.BANNED) {
          await this.mempoolService.remove(entry);
          continue;
        } else if (
          deployerStatus === ReputationStatus.THROTTLED ||
          (stakedEntityCount[factory] || 0) > 1
        ) {
          logger.debug('skipping throttled factory', {
            metadata: {
              sender: entry.userOp.sender,
              nonce: entry.userOp.nonce,
              factory
            }
          });
          continue;
        }
      }

      if (senders.has(entry.userOp.sender)) {
        logger.debug('skipping already included sender', {
          metadata: {
            sender: entry.userOp.sender,
            nonce: entry.userOp.nonce
          }
        });
        continue;
      }

      let validationResult: UserOpValidationResult ;
      try {
        validationResult = await this.userOpValidationService.callSimulateValidation(
          entry.userOp,
          entry.entryPoint
        );
      } catch (e: any) {
        logger.debug(`failed 2nd validation: ${e.message}`);
        await this.mempoolService.remove(entry);
        continue;
      }
      
      // TODO: add total gas cap
      const entryPointContract = EntryPoint__factory.connect(
        entry.entryPoint,
        this.provider,
      );
      if (paymaster) {
        if (!paymasterDeposit[paymaster]) {
          paymasterDeposit[paymaster] = await entryPointContract.balanceOf(paymaster);
        }
        if (paymasterDeposit[paymaster]?.lt(validationResult.returnInfo.prefund)) {
          // not enough balance in paymaster to pay for all UserOps
          // (but it passed validation, so it can sponsor them separately
          continue;
        }
        stakedEntityCount[paymaster] = (stakedEntityCount[paymaster] || 0) + 1;
        paymasterDeposit[paymaster] = BigNumber.from(
          paymasterDeposit[paymaster]?.sub(validationResult.returnInfo.prefund)
        );
      }

      if (factory) {
        stakedEntityCount[factory] = (stakedEntityCount[factory] || 0) + 1;
      }

      senders.add(entry.userOp.sender);
      bundle.push(entry);
    }
    return bundle;
  }
}
