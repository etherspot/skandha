import { BigNumber, BigNumberish } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { getClient } from "../fixtures";

export async function setBalance(
  address: string,
  desiredBalance: BigNumberish = parseEther("1")
): Promise<void> {
  const provider = await getClient();
  await provider.send("anvil_setBalance", [
    address,
    BigNumber.from(desiredBalance).toHexString(),
  ]);
  await provider.send("evm_mine", []);
}
