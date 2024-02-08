import { IEntryPoint__factory, SimpleAccountFactory__factory, SimpleAccount__factory } from "types/src/executor/contracts"
import { ChainId, DefaultRpcUrl, EntryPointAddress, SimpleFactoryAddress } from "../constants"
import { BigNumber, BigNumberish, Contract, Wallet, ethers, providers, utils } from "ethers";
import { arrayify, defaultAbiCoder, hexConcat, keccak256 } from "ethers/lib/utils";
import { UserOperationStruct } from "types/src/executor/contracts/EntryPoint";
import { applyEstimatedUserOp, randomAddress } from "../utils";
import { packUserOp } from "../../src/utils";
import { Eth } from "../../src/modules";

// Creates random simple transfer userop
export async function createRandomUnsignedUserOp(
  ownerAddress: string,
  salt: number = 0
): Promise<UserOperationStruct> {
  const accountAddress = await getCounterFactualAddress(ownerAddress, salt);
  const isDeployed = await isAccountDeployed(ownerAddress, salt);
  const initCode = isDeployed ? '0x' : _getAccountInitCode(ownerAddress, salt);
  const verificationGasLimit = isDeployed ? 100000 : 200000; // random value, double if not deployed
  const maxFeePerGas = 1; // TODO: fetch gas prices from skandhaService
  const maxPriorityFeePerGas = 1;

  // generate random calldata
  const callData = _encodeExecute(accountAddress, randomAddress().address, utils.parseUnits('1', 9), '0x');
  const callGasLimit = 35000;

  return {
    sender: accountAddress,
    nonce: isDeployed ? await _getNonce(accountAddress) : 0,
    initCode,
    callGasLimit,
    callData,
    verificationGasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    preVerificationGas: 45000,
    signature: '0x',
    paymasterAndData: '0x'
  }
}

export async function createSignedUserOp(eth: Eth, wallet: Wallet) {
  let unsignedUserOp = await createRandomUnsignedUserOp(wallet.address);
  const response = await eth.estimateUserOperationGas({
    userOp: unsignedUserOp,
    entryPoint: EntryPointAddress
  });
  unsignedUserOp = applyEstimatedUserOp(unsignedUserOp, response);
  const userOp = await signUserOp(wallet, unsignedUserOp);
  return userOp;
}

export async function signUserOp(wallet: Wallet, userOp: UserOperationStruct): Promise<UserOperationStruct> {
  const userOpHash = getUserOpHash(userOp);
  const signature = await _signUserOpHash(wallet, userOpHash);
  return {
    ...userOp,
    signature,
  };
}

export async function getCounterFactualAddress(ownerAddress: string, salt: number = 0): Promise<string> {
  try {
    const provider = new providers.JsonRpcProvider(DefaultRpcUrl);
    const initCode = await _getAccountInitCode(ownerAddress, salt);
    const entryPoint = IEntryPoint__factory.connect(EntryPointAddress, provider);
    await entryPoint.callStatic.getSenderAddress(initCode);

    throw new Error("getSenderAddress: unexpected result");
  } catch (error: any) {
    const addr = error?.errorArgs?.sender;
    if (!addr) throw error;
    if (addr === ethers.constants.AddressZero) throw new Error('Unsupported chain_id/walletFactoryAddress');
    return addr;
  }
}

async function isAccountDeployed(ownerAddress: string, salt: number = 0): Promise<boolean> {
  const provider = new providers.JsonRpcProvider(DefaultRpcUrl);
  const senderAddressCode = await provider.getCode(getCounterFactualAddress(ownerAddress, salt));
  return senderAddressCode.length > 2;
}

export function getUserOpHash(userOp: UserOperationStruct): string {
  const userOpHash = keccak256(packUserOp(userOp, true));
  const enc = defaultAbiCoder.encode(['bytes32', 'address', 'uint256'], [userOpHash, EntryPointAddress, ChainId]);
  return keccak256(enc);
}

async function _signUserOpHash(wallet: Wallet, userOpHash: string): Promise<string> {
  return await wallet.signMessage(arrayify(userOpHash));
}

function _getAccountContract(accountAddress: string): Contract {
  const provider = new providers.JsonRpcProvider(DefaultRpcUrl);
  return new ethers.Contract(accountAddress, SimpleAccount__factory.abi, provider);
}

async function _getNonce(accountAddress: string): Promise<BigNumber> {
  const accountContract = _getAccountContract(accountAddress);
  return await accountContract.getNonce();
}

function _encodeExecute(accountAddress: string, target: string, value: BigNumberish, data: string): string {
  const accountContract = new ethers.Contract(accountAddress, SimpleAccount__factory.abi);
  return accountContract.interface.encodeFunctionData('execute', [target, value, data]);
}

function _encodeBatch(accountAddress: string, targets: string[], datas: string[]): string {
  const accountContract = new ethers.Contract(accountAddress, SimpleAccount__factory.abi);
  return accountContract.interface.encodeFunctionData('executeBatch', [targets, datas]);
}

function _getAccountInitCode(ownerAddress: string, salt: number = 0): string {
  const factory = new ethers.Contract(SimpleFactoryAddress, SimpleAccountFactory__factory.abi);

  return hexConcat([
    SimpleFactoryAddress,
    factory.interface.encodeFunctionData('createAccount', [
      ownerAddress,
      salt,
    ]),
  ]);
}
