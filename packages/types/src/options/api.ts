export type ApiOptions = {
  cors: string;
  address: string;
  port: number;
};

export const defaultApiOptions: ApiOptions = {
  cors: "*",
  address: "0.0.0.0",
  port: 14337,
};
