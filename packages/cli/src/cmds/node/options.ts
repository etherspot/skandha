import { homedir } from "node:os";

const __dirname = process.cwd();

export interface INodeArgs {
  peerStoreDir: string;
}

export const nodeOptions = {
  peerStoreDir: {
    description: "Location of the directory where peers are stored",
    type: "string",
    default: `${homedir()}/.skandha/db/p2p/`,
  },
};
