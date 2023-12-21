import { BigNumber } from "ethers";
import { getWallet } from "../fixtures";
import { parseEther } from "ethers/lib/utils";

export async function topUpAccount(address: string, amount?: BigNumber): Promise<void> {
  const wallet = await getWallet();
  (await wallet.sendTransaction({
    to: address,
    value: amount ? amount.toBigInt() : parseEther('0.5')
  })).wait(2);
}
