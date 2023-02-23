export interface IApiOptions {
  address: string;
  port: number;
  cors: string;
}

export const defaultApiOptions = {
  address: "127.0.0.1",
  port: 14337,
  cors: "*",
};
