export interface IApiOptions {
  enabled: boolean;
  api: string[];
  address: string;
  port: number;
  cors: string;
}

export const defaultApiOptions = {
  enabled: true,
  api: ["api"],
  address: "127.0.0.1",
  port: 14337,
  cors: "*",
};
