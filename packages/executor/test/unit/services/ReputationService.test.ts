import { describe, it } from 'vitest';
import { utils } from 'ethers';
import { ReputationStatus } from 'types/src/executor';
import { randomAddress } from '../../utils';
import { getClient, getConfigs, getServices } from '../../fixtures';
import { assert } from 'chai';
import * as RpcErrorCodes from 'types/lib/api/errors/rpc-error-codes';

describe('Reputation Service', async () => {
  await getClient();
  it('The status of a fresh entry should be OK', async () => {
    const { service } = await prepareTest();
    const wallet = randomAddress();

    const status = await service.getStatus(wallet.address);
    assert.strictEqual(
      status,
      ReputationStatus.OK,
      'The reputation status is not displayed OK.'
    );
  });

  it('The status of an entry should be BANNED', async () => {
    const { service } = await prepareTest();
    const wallet = randomAddress();
    await service.setReputation(wallet.address, 1000000000000000, 100);

    const status = await service.getStatus(wallet.address);
    assert.strictEqual(
      status,
      ReputationStatus.BANNED,
      'The reputation status is not displayed BANNED.'
    );
  });

  it('Set the reputation with valid details', async () => {
    let random1 = Math.floor(Math.random() * 10 + 1);
    let random2 = Math.floor(Math.random() * 10 + 1);
    const { service } = await prepareTest();
    const wallet = randomAddress();
    await service.setReputation(wallet.address, random1, random2);

    const data = await service.fetchOne(wallet.address);

    assert.strictEqual(
      data.chainId,
      31337,
      'The chainId value is not displayed correctly in the response of fetchone function.'
    );
    assert.isNotEmpty(
      data.address,
      'The address value is displayed empty in the response of fetchone function.'
    );

    assert.strictEqual(
      data.opsSeen,
      random1,
      'The _opsSeen value is not displayed correctly in the response of fetchone function.'
    );

    assert.strictEqual(
      data.opsIncluded,
      random2,
      'The _opsIncluded value is not displayed correctly in the response of fetchone function.'
    );

    assert.isNumber(
      data.lastUpdateTime,
      'The lastUpdateTime value is not number in the response of fetchone function.'
    );
  });

  it('Dump with single address details', async () => {
    let random1 = Math.floor(Math.random() * 10 + 1);
    let random2 = Math.floor(Math.random() * 10 + 1);
    const { service } = await prepareTest();
    const wallet = randomAddress();
    await service.setReputation(wallet.address, random1, random2);
    const data = await service.dump();

    assert.isNotEmpty(
      data[0].address,
      'The address value is emplty in the dump response.'
    );
    assert.strictEqual(
      data[0].opsSeen,
      random1,
      'The opsSeen value is not displayed equal in the dump response.'
    );
    assert.strictEqual(
      data[0].opsIncluded,
      random2,
      'The opsIncluded value is not displayed equal in the dump response.'
    );
    assert.strictEqual(
      data[0].status,
      0,
      'The status value is not displayed equal in the dump response.'
    );
  });

  it('Check the stake with too low stakes', async () => {
    const { service } = await prepareTest();
    const wallet = randomAddress();
    const data = await service.checkStake({
      stake: utils.parseEther('0.00001'),
      unstakeDelaySec: 2000,
      addr: wallet.address,
    });

    assert.strictEqual(
      data.msg,
      wallet.address +
        ' stake 10000000000000 is too low (min=10000000000000000)',
      'The msg value is not displayed correctly in the response of checkStake function with too low stakes.'
    );

    assert.strictEqual(
      data.code,
      RpcErrorCodes.STAKE_DELAY_TOO_LOW,
      'The code value is not displayed correctly in the response of checkStake function with too low stakes.'
    );
  });

  it('Check the stake with zero stakes', async () => {
    const { service } = await prepareTest();
    const wallet = randomAddress();
    const data = await service.checkStake({
      stake: 0,
      unstakeDelaySec: 2000,
      addr: wallet.address,
    });

    assert.strictEqual(
      data.msg,
      wallet.address + ' is unstaked',
      'The msg value is not displayed correctly in the response of checkStake function with zero stake.'
    );

    assert.strictEqual(
      data.code,
      RpcErrorCodes.STAKE_DELAY_TOO_LOW,
      'The code value is not displayed correctly in the response of checkStake function with zero stake.'
    );
  });

  it('Check the stake with less than minUnstakeDelay value', async () => {
    const { service } = await prepareTest();
    const wallet = randomAddress();
    const data = await service.checkStake({
      stake: utils.parseEther('0.1'),
      unstakeDelaySec: -1, // minUnstakeDelay is given in the config file in packages\executor\test\fixtures\getConfig.ts
      addr: wallet.address,
    });

    assert.strictEqual(
      data.msg,
      wallet.address + ' unstake delay -1 is too low (min=0)',
      'The msg value is not displayed correctly in the response of checkStake function with less than minUnstakeDelay value.'
    );

    assert.strictEqual(
      data.code,
      RpcErrorCodes.STAKE_DELAY_TOO_LOW,
      'The code value is not displayed correctly in the response of checkStake function with less than minUnstakeDelay value.'
    );
  });

  it('Check the stake with banned address', async () => {
    const { service } = await prepareTest();
    const wallet = randomAddress();
    await service.setReputation(wallet.address, 1000000000000000, 100);
    const data = await service.checkStake({
      stake: utils.parseEther('0.1'),
      unstakeDelaySec: 2000,
      addr: wallet.address,
    });

    assert.strictEqual(
      data.msg,
      wallet.address + ' is banned',
      'The msg value is not displayed correctly in the response of checkStake function with banned address.'
    );

    assert.strictEqual(
      data.code,
      RpcErrorCodes.PAYMASTER_OR_AGGREGATOR_BANNED,
      'The code value is not displayed correctly in the response of checkStake function with banned address.'
    );
  });
});

async function prepareTest() {
  const { config, networkConfig } = await getConfigs();
  const { reputationService: service } = await getServices(
    config,
    networkConfig
  );
  return { service };
}
