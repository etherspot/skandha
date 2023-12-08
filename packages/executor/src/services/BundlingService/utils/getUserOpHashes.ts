import { IEntryPoint } from "types/lib/executor/contracts";
import { providers } from "ethers";
import { IMulticall3__factory } from "types/lib/executor/contracts/factories/IMulticall3__factory";
import { MempoolEntry } from "../../../entities/MempoolEntry";

/**
 * returns userop hashes
 * @param entryPoint address of the entrypoint
 * @param userOps mempool entries
 * @param provider rpc provider
 * @param multicall address of the multicall3 contract
 */
export async function getUserOpHashes(
  entryPoint: IEntryPoint,
  userOps: MempoolEntry[],
  provider: providers.JsonRpcProvider,
  multicall: string
): Promise<string[]> {
  if (userOps.length === 1) {
    return [await entryPoint.callStatic.getUserOpHash(userOps[0].userOp)];
  }
  try {
    const multicallContract = IMulticall3__factory.connect(multicall, provider);
    const callDatas = userOps.map((op) =>
      entryPoint.interface.encodeFunctionData("getUserOpHash", [op.userOp])
    );
    const result = await multicallContract.callStatic.aggregate3(
      callDatas.map((data) => ({
        target: entryPoint.address,
        callData: data,
        allowFailure: false,
      }))
    );
    return result.map((call) => call.returnData);
  } catch (err) {
    return [];
  }
}
