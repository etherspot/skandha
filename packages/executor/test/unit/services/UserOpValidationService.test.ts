import { describe, it } from 'vitest';
import {
  createRandomUnsignedUserOp,
  createSignedUserOp,
  getClient,
  getConfigs,
  getCounterFactualAddress,
  getModules,
  testAccounts,
} from '../../fixtures';
import { Wallet } from 'ethers';
import { EntryPointAddress } from '../../constants';
import { setBalance } from '../../utils';
import { assert } from 'chai';

describe('UserOpValidation Service', async () => {
  await getClient(); // runs anvil
  const wallet = new Wallet(testAccounts[0]);
  const aaWalletAddress = await getCounterFactualAddress(wallet.address);
  const { config, networkConfig, configUnsafe, networkConfigUnsafe } =
    await getConfigs();
  const { userOpValidationService: serviceUnsafe, eth: ethModuleUnsafe } =
    await getModules(configUnsafe, networkConfigUnsafe);
  const { userOpValidationService: service, eth: ethModule } = await getModules(
    config,
    networkConfig
  );

  it('Validate For Estimation with unsafe config details', async () => {
    await setBalance(aaWalletAddress);
    const userOp = await createSignedUserOp(ethModuleUnsafe, wallet);
    try {
      const data = await serviceUnsafe.validateForEstimation(
        userOp,
        EntryPointAddress
      );

      assert.isNotEmpty(
        data.preOpGas,
        'The preOpGas value is empty in the validateForEstimation response'
      );

      assert.isNotEmpty(
        data.paid,
        'The paid value is empty in the validateForEstimation response'
      );

      assert.isNumber(
        data.validAfter,
        'The preOpGas value is not number in the validateForEstimation response'
      );

      assert.isNumber(
        data.validUntil,
        'The validUntil value is not number in the validateForEstimation response'
      );

      assert.isFalse(
        data.targetSuccess,
        'The targetSuccess value is not number in the validateForEstimation response'
      );

      assert.isNotEmpty(
        data.targetResult,
        'The targetResult value is empty in the validateForEstimation response'
      );
    } catch (err) {
      assert.fail(
        'The validation for estimation with valid details is not working correctly.'
      );
    }
  });

  it('Validate For Estimation with signature with unsafe config details', async () => {
    await setBalance(aaWalletAddress);
    const userOp = await createSignedUserOp(ethModuleUnsafe, wallet);
    try {
      const data = await serviceUnsafe.validateForEstimationWithSignature(
        userOp,
        EntryPointAddress
      );

      assert.isNotEmpty(
        data.returnInfo.preOpGas,
        'The preOpGas value of returnInfo is empty in the validateForEstimationWithSignature response'
      );

      assert.isNotEmpty(
        data.returnInfo.prefund,
        'The prefund value of returnInfo is empty in the validateForEstimationWithSignature response'
      );

      assert.isFalse(
        data.returnInfo.sigFailed,
        'The sigFailed value of returnInfo is true in the validateForEstimationWithSignature response'
      );

      assert.isNumber(
        data.returnInfo.validAfter,
        'The validAfter value of returnInfo is not number in the validateForEstimationWithSignature response'
      );

      assert.isNumber(
        data.returnInfo.validUntil,
        'The validUntil value of returnInfo is not number in the validateForEstimationWithSignature response'
      );

      assert.isNotEmpty(
        data.senderInfo.stake,
        'The stake value of senderInfo is empty in the validateForEstimationWithSignature response'
      );

      assert.isNotEmpty(
        data.senderInfo.unstakeDelaySec,
        'The unstakeDelaySec value of senderInfo is empty in the validateForEstimationWithSignature response'
      );

      assert.isNotEmpty(
        data.senderInfo.addr,
        'The addr value of senderInfo is empty in the validateForEstimationWithSignature response'
      );

      assert.isNotEmpty(
        data.factoryInfo?.stake,
        'The stake value of factoryInfo is empty in the validateForEstimationWithSignature response'
      );

      assert.isNotEmpty(
        data.factoryInfo?.unstakeDelaySec,
        'The unstakeDelaySec value of factoryInfo is empty in the validateForEstimationWithSignature response'
      );

      assert.isNotEmpty(
        data.factoryInfo?.addr,
        'The addr value of factoryInfo is empty in the validateForEstimationWithSignature response'
      );
    } catch (err) {
      assert.fail(
        'The validation for estimation with signature is not working correctly.'
      );
    }
  });

  it.skip('Simulate the Validation with safe config details', async () => {
    await setBalance(aaWalletAddress);
    const userOp = await createSignedUserOp(ethModule, wallet);
    try {
      await service.simulateValidation(userOp, EntryPointAddress);
    } catch (e) {}
  });

  it('Simulate the Validation with unsafe config details', async () => {
    await setBalance(aaWalletAddress);
    const userOp = await createSignedUserOp(ethModuleUnsafe, wallet);
    const data = await serviceUnsafe.simulateValidation(
      userOp,
      EntryPointAddress
    );

    assert.isNotEmpty(
      data.returnInfo.preOpGas,
      'The preOpGas value of returnInfo is empty in the validateForEstimationWithSignature response'
    );

    assert.isNotEmpty(
      data.returnInfo.prefund,
      'The prefund value of returnInfo is empty in the validateForEstimationWithSignature response'
    );

    assert.isFalse(
      data.returnInfo.sigFailed,
      'The sigFailed value of returnInfo is true in the validateForEstimationWithSignature response'
    );

    assert.isNumber(
      data.returnInfo.validAfter,
      'The validAfter value of returnInfo is not number in the validateForEstimationWithSignature response'
    );

    assert.isNumber(
      data.returnInfo.validUntil,
      'The validUntil value of returnInfo is not number in the validateForEstimationWithSignature response'
    );

    assert.isNotEmpty(
      data.senderInfo.stake,
      'The stake value of senderInfo is empty in the validateForEstimationWithSignature response'
    );

    assert.isNotEmpty(
      data.senderInfo.unstakeDelaySec,
      'The unstakeDelaySec value of senderInfo is empty in the validateForEstimationWithSignature response'
    );

    assert.isNotEmpty(
      data.senderInfo.addr,
      'The addr value of senderInfo is empty in the validateForEstimationWithSignature response'
    );

    assert.isNotEmpty(
      data.factoryInfo?.stake,
      'The stake value of factoryInfo is empty in the validateForEstimationWithSignature response'
    );

    assert.isNotEmpty(
      data.factoryInfo?.unstakeDelaySec,
      'The unstakeDelaySec value of factoryInfo is empty in the validateForEstimationWithSignature response'
    );

    assert.isNotEmpty(
      data.factoryInfo?.addr,
      'The addr value of factoryInfo is empty in the validateForEstimationWithSignature response'
    );
  });

  it('Validate Gas Fee with safe config details', async () => {
    await setBalance(aaWalletAddress);
    const userOp = await createSignedUserOp(ethModule, wallet);
    const data = await service.validateGasFee(userOp);

    assert.isTrue(
      data,
      'The value is displayed false in the validateGasFee response'
    );
  });

  it('Validate Gas Fee with unsafe config details', async () => {
    await setBalance(aaWalletAddress);
    const userOp = await createSignedUserOp(ethModuleUnsafe, wallet);
    const data = await serviceUnsafe.validateGasFee(userOp);

    assert.isTrue(
      data,
      'The value is displayed false in the validateGasFee response'
    );
  });

  it('Validate Gas Fee with maxFeePerGas is less than baseFee', async () => {
    await setBalance(aaWalletAddress);
    const userOp = await createRandomUnsignedUserOp(wallet.address);

    try {
      const data = await serviceUnsafe.validateGasFee(userOp);
    } catch (e: any) {
      if (e.message === 'maxFeePerGas must be greater or equal to baseFee') {
        assert.ok(
          'The correct code is display for the invalid details for the validating gas fee.'
        );
      } else {
        assert.fail('The validate gas fee is not working correctly.');
      }
    }
  });

  it('Validate Gas Fee with maxFeePerGas is less than baseFee************', async () => {
    await setBalance(aaWalletAddress);
    const userOp = {
      sender: '0xcd4295624350aB5F3e5413a667472f68Dd6d0030',
      nonce: 0,
      initCode:
        '0x6cf2534c6aa425f20fb6a15fc836c8dd7e8f14e35fbfb9cf000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb922660000000000000000000000000000000000000000000000000000000000000000',
      callGasLimit: 35000,
      callData:
        '0xb61d27f600000000000000000000000040379505221ef0a561fee9c70e2ed41586b0f435000000000000000000000000000000000000000000000000000000003b9aca0000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000',
      verificationGasLimit: 200000,
      maxFeePerGas: '5',
      maxPriorityFeePerGas: '10',
      preVerificationGas: 45000,
      signature: '0x',
      paymasterAndData: '0x',
    };

    try {
      const data = await service.validateGasFee(userOp);
    } catch (e: any) {
      if (e.message === 'maxFeePerGas must be greater or equal to baseFee') {
        assert.ok(
          'The correct code is display for the invalid details for the validating gas fee.'
        );
      } else {
        assert.fail('The validate gas fee is not working correctly.');
      }
    }
  });

  it('Binary Search VGL with safe config details', async () => {
    await setBalance(aaWalletAddress);
    const userOp = await createSignedUserOp(ethModule, wallet);
    const data = await service.binarySearchVGL(userOp, EntryPointAddress);

    assert.isNotEmpty(
      data.sender,
      'The sender value is empty in the binarySearchVGL response.'
    );

    assert.isNumber(
      data.nonce,
      'The nonce value is not number in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.initCode,
      'The initCode value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.callGasLimit,
      'The callGasLimit value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.callData,
      'The callData value is empty in the binarySearchVGL response.'
    );

    assert.isNumber(
      data.verificationGasLimit,
      'The verificationGasLimit value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.maxFeePerGas,
      'The maxFeePerGas value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.maxPriorityFeePerGas,
      'The maxPriorityFeePerGas value is empty in the binarySearchVGL response.'
    );

    assert.isNumber(
      data.preVerificationGas,
      'The preVerificationGas value is not number in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.signature,
      'The signature value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.paymasterAndData,
      'The paymasterAndData value is empty in the binarySearchVGL response.'
    );
  });

  it('Binary Search VGL with unsafe config details', async () => {
    await setBalance(aaWalletAddress);
    const userOp = await createSignedUserOp(ethModuleUnsafe, wallet);
    const data = await serviceUnsafe.binarySearchVGL(userOp, EntryPointAddress);

    assert.isNotEmpty(
      data.sender,
      'The sender value is empty in the binarySearchVGL response.'
    );

    assert.isNumber(
      data.nonce,
      'The nonce value is not number in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.initCode,
      'The initCode value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.callGasLimit,
      'The callGasLimit value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.callData,
      'The callData value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.verificationGasLimit,
      'The verificationGasLimit value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.maxFeePerGas,
      'The maxFeePerGas value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.maxPriorityFeePerGas,
      'The maxPriorityFeePerGas value is empty in the binarySearchVGL response.'
    );

    assert.isNumber(
      data.preVerificationGas,
      'The preVerificationGas value is not number in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.signature,
      'The signature value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.paymasterAndData,
      'The paymasterAndData value is empty in the binarySearchVGL response.'
    );
  });

  it('Binary Search CGL with safe config details', async () => {
    await setBalance(aaWalletAddress);
    const userOp = await createSignedUserOp(ethModule, wallet);
    const data = await service.binarySearchCGL(userOp, EntryPointAddress);

    assert.isNotEmpty(
      data.sender,
      'The sender value is empty in the binarySearchVGL response.'
    );

    assert.isNumber(
      data.nonce,
      'The nonce value is not number in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.initCode,
      'The initCode value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.callGasLimit,
      'The callGasLimit value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.callData,
      'The callData value is empty in the binarySearchVGL response.'
    );

    assert.isNumber(
      data.verificationGasLimit,
      'The verificationGasLimit value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.maxFeePerGas,
      'The maxFeePerGas value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.maxPriorityFeePerGas,
      'The maxPriorityFeePerGas value is empty in the binarySearchVGL response.'
    );

    assert.isNumber(
      data.preVerificationGas,
      'The preVerificationGas value is not number in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.signature,
      'The signature value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.paymasterAndData,
      'The paymasterAndData value is empty in the binarySearchVGL response.'
    );
  });

  it('Binary Search CGL with unsafe config details', async () => {
    await setBalance(aaWalletAddress);
    const userOp = await createSignedUserOp(ethModuleUnsafe, wallet);
    const data = await serviceUnsafe.binarySearchCGL(userOp, EntryPointAddress);

    assert.isNotEmpty(
      data.sender,
      'The sender value is empty in the binarySearchVGL response.'
    );

    assert.isNumber(
      data.nonce,
      'The nonce value is not number in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.initCode,
      'The initCode value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.callGasLimit,
      'The callGasLimit value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.callData,
      'The callData value is empty in the binarySearchVGL response.'
    );

    assert.isNumber(
      data.verificationGasLimit,
      'The verificationGasLimit value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.maxFeePerGas,
      'The maxFeePerGas value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.maxPriorityFeePerGas,
      'The maxPriorityFeePerGas value is empty in the binarySearchVGL response.'
    );

    assert.isNumber(
      data.preVerificationGas,
      'The preVerificationGas value is not number in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.signature,
      'The signature value is empty in the binarySearchVGL response.'
    );

    assert.isNotEmpty(
      data.paymasterAndData,
      'The paymasterAndData value is empty in the binarySearchVGL response.'
    );
  });
});
