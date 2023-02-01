import { NetworkNames } from 'etherspot';
import { providers } from 'ethers';
import logger from 'app/logger';
import { EntryPointContract } from 'app/bundler/contracts';
import { MempoolService } from './MempoolService';
import {
  UserOpValidationResult,
  UserOpValidationService
} from './UserOpValidation';
import { MempoolEntry } from '../entities/MempoolEntry';
import config from 'app/config';

export class BundlingService {;
  constructor(
    private network: NetworkNames,
    private provider: providers.JsonRpcProvider,
    private mempoolService: MempoolService,
    private userOpValidationService: UserOpValidationService,
  ) {}

  async sendBundle(bundle: MempoolEntry[]): Promise<void> {
    if (!bundle.length) {
      return;
    }
    const entryPoint = bundle[0]!.entryPoint;
    const entryPointContract = new EntryPointContract(
      this.provider,
      entryPoint
    );
    const wallet = config.getEntryPointRelayer(this.network, entryPoint)!;
    const beneficiary = config.getEntryBeneficiary(this.network, entryPoint)!;
    try {
      let txRequest = entryPointContract.encodeHandleOps(
        bundle.map(entry => entry.userOp),
        beneficiary
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
      const { index } = err.errorArgs;
      const entry = bundle[index]!;
      await this.mempoolService.remove(entry);
    }
  };

  async createBundle(): Promise<MempoolEntry[]> {
    // TODO: support multiple entry points
    //       filter bundles by entry points
    // TODO: add total gas cap
    // TODO: reputation
    const entries = await this.mempoolService.getSortedOps();
    const bundle: MempoolEntry[] = [];

    const senders = new Set<string>();
    for (const entry of entries) {
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
      senders.add(entry.userOp.sender);
      bundle.push(entry);
    }
    return bundle;
  }
}