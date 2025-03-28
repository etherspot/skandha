import { Bundle } from "../../interfaces";
import { WalletClient } from "viem";

export type Relayer = WalletClient;

export interface IRelayingMode {
  isLocked(): boolean;
  sendBundle(bundle: Bundle): Promise<void>;
  getAvailableRelayersCount(): number;
  canSubmitBundle(): Promise<boolean>;
}
