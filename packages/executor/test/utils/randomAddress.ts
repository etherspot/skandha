import { Wallet } from "ethers";

export function randomAddress(): Wallet {
  return Wallet.createRandom((Math.random() + 1).toString(36).substring(7));
}
