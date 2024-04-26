export type ApiOptions = {
  cors: string;
  address: string;
  port: number;
  enableRequestLogging: boolean;
  websocket: boolean;
};

export const defaultApiOptions: ApiOptions = {
  cors: "*",
  address: "0.0.0.0",
  port: 14337,
  enableRequestLogging: false,
  websocket: true,
};
