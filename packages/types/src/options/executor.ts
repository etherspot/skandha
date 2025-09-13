import { BundlingMode } from "../api/interfaces.js";

export type ExecutorOptions = {
  bundlingMode: BundlingMode;
};

export const defaultExecutorOptions: ExecutorOptions = {
  bundlingMode: "auto",
};
