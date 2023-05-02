export type ApiOptions = {
  cors: string;
  address: string;
  port: number;
  enableRequestLogging: boolean;
};

export const defaultApiOptions: ApiOptions = {
  cors: "*",
  address: "127.0.0.1",
  port: 14337,
  enableRequestLogging: false,
};
