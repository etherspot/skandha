export interface IApiOptions {
  address: string;
  port: number;
  cors: string;
  enableRequestLogging: boolean;
}

export const defaultApiOptions: IApiOptions = {
  address: "127.0.0.1",
  port: 14337,
  cors: "*",
  enableRequestLogging: false,
};
