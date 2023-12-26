import { exec } from "child_process";
import { now, wait } from "../../src/utils";
import { BytesLike, hexConcat, hexZeroPad, hexlify } from "ethers/lib/utils";
import { IEntryPoint__factory, SimpleAccountFactory__factory } from "types/src/executor/contracts";
import { DefaultRpcUrl, EntryPointAddress } from "../constants";
import { Wallet, constants, providers, utils } from "ethers";
import { testAccounts } from "./accounts";

let provider: providers.JsonRpcProvider;

export async function getClient() {
  if (provider) return provider;
  await runAnvil();
  provider = new providers.JsonRpcProvider(DefaultRpcUrl);
  await deployDetermisticDeployer();
  await deployEntryPointAndFactory();
  return provider;
}

export async function getWallet(index: number = 0) {
  const client = await getClient();
  return new Wallet(testAccounts[index], client);
}

async function runAnvil() {
  exec("anvil");
  const time = now();
  while (now() < time + 5000) {
    try {
      let provider = new providers.JsonRpcProvider(DefaultRpcUrl);
      (await provider.getNetwork()).chainId;
      return;
    } catch (err) {
      await wait(500);
    }
  }
}

export async function deployEntryPointAndFactory() {
  await deployContractDeterministically(IEntryPoint__factory.bytecode);
  await deployContractDeterministically((new SimpleAccountFactory__factory()).getDeployTransaction(EntryPointAddress).data!);
}

export async function deployDetermisticDeployer() {
  const contractAddress = '0x4e59b44847b379578588920ca78fbf26c0b4956c'
  const factoryTx = '0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222'
  const factoryDeployer = '0x3fab184622dc19b6109349b94811493bf2a45362'
  const deploymentGasPrice = 100e9
  const deploymentGasLimit = 100000
  const factoryDeploymentFee = deploymentGasPrice * deploymentGasLimit;

  const deployedBytecode = await provider.getCode(contractAddress);
  if (deployedBytecode.length > 2) return;
  const wallet = await getWallet();
  try {
    let tx = await wallet.sendTransaction({
      to: factoryDeployer,
      value: BigInt(factoryDeploymentFee),
      nonce: await wallet.getTransactionCount()
    })
    await tx.wait();
    tx = await provider.sendTransaction(factoryTx);
    await tx.wait();
  } catch (err) {}
}

export async function deployContractDeterministically(bytecode: BytesLike) {
  const salt = constants.HashZero;
  const saltBytes32 = hexZeroPad(hexlify(salt), 32);
  const deployerAddress = '0x4e59b44847b379578588920ca78fbf26c0b4956c';
  const bytecodeHash = utils.keccak256(bytecode);
  const address = utils.getCreate2Address(deployerAddress, salt, bytecodeHash);
  const deployedBytecode = await provider.getCode(address);
  if (deployedBytecode.length > 2) return address;
  const wallet = await getWallet();
  try {
    const tx = await wallet.sendTransaction({
      to: deployerAddress,
      data: hexConcat([saltBytes32, bytecode]),
      nonce: await wallet.getTransactionCount()
    });
    await tx.wait();
  } catch (err) { }
  return address;
}
