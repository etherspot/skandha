import { WalletClient } from "viem";
import { Bundle } from "../../interfaces.js";

export type Relayer = WalletClient;

export interface IRelayingMode {
  isLocked(): boolean;
  sendBundle(bundle: Bundle): Promise<void>;
  getAvailableRelayersCount(): number;
  canSubmitBundle(): Promise<boolean>;
}
