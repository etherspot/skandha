export type P2POptions = {
  host: string;
  port: number;
  bootEnrs: string[];
};

export const defaultP2POptions: P2POptions = {
  host: "127.0.0.1",
  port: 4337,
  bootEnrs: [],
};
