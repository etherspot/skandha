export type P2POptions = {
  host: string;
  port: number;
  enrHost: string;
  enrPort: number;
  bootEnrs: string[];
  retainPeerId: boolean;
  enrSeq: number;
};

export const defaultP2POptions: P2POptions = {
  host: "0.0.0.0",
  port: 4337,
  enrHost: "127.0.0.1",
  enrPort: 4337,
  bootEnrs: [],
  retainPeerId: true,
  enrSeq: 0,
};
