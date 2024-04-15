import { describe, it } from 'vitest';
import {
  getClient,
  getConfigs,
  getCounterFactualAddress,
  getModules,
  testAccounts,
} from '../../fixtures';
import { Wallet } from 'ethers';
import { setBalance } from '../../utils';
import { assert } from 'chai';

describe('UserOpValidation Service', async () => {
  await getClient(); // runs anvil
  const wallet = new Wallet(testAccounts[0]);
  const aaWalletAddress = await getCounterFactualAddress(wallet.address);
  const { configUnsafe, networkConfigUnsafe } =
    await getConfigs();
  const { userOpValidationService: service } = await getModules(
    configUnsafe,
    networkConfigUnsafe
  );
  it('Validate Gas Fee with maxFeePerGas less than baseFee', async () => {
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
      await service.validateGasFee(userOp);
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
});
