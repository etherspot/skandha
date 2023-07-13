import { BundlingMode } from "../api/interfaces";

export type ExecutorOptions = {
  bundlingMode: BundlingMode;
};

export const defaultExecutorOptions: ExecutorOptions = {
  bundlingMode: "auto",
};
