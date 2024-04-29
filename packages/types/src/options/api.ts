export type ApiOptions = {
  cors: string;
  address: string;
  port: number;
  enableRequestLogging: boolean;
  ws: boolean;
  wsPort: number;
};

export const defaultApiOptions: ApiOptions = {
  cors: "*",
  address: "0.0.0.0",
  port: 14337,
  enableRequestLogging: false,
  ws: true,
  wsPort: 14337,
};
