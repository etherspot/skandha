import {
  Account,
  Address,
  Chain,
  concat,
  encodeAbiParameters,
  Hex,
  hexToBytes,
  PublicClient,
  Transport,
  WalletClient,
  zeroAddress
} from "viem";
import { NetworkConfig } from "../../../interfaces";
import { IPaymasterService } from "./base";
import { Logger } from "@skandha/types/lib";
import { UserOperation } from "@skandha/types/lib/contracts/UserOperation";
import { _abi as MultiTokenPaymasterAbi } from "@skandha/types/lib/contracts/EPv7/core/MultiTokenPaymaster"
import { _abi as ChainLinkOracleAbi } from "@skandha/types/lib/contracts/EPv7/core/ChainlinkOracle"
import { packUint, packUserOp } from "../../EntryPointService/utils";
import { ECDSA_DUMMY_SIGNATURE } from "@skandha/params/lib";
import { Config } from "../../../config";

export class PaymasterService implements IPaymasterService {
  private signer: WalletClient<Transport, Chain | undefined, Account> | null
  constructor(
    private networkConfig: NetworkConfig,
    private publicClient: PublicClient,
    private config: Config,
    private logger: Logger
  ) {
    this.signer = config.getPaymasterSigner();
  }

  async getLatestPrice(oracle: Address) {
    return this.publicClient.readContract({
      address: oracle,
      abi: ChainLinkOracleAbi,
      functionName: "latestAnswer",
      args: []
    });
  }

  async getHash(
    userOp: UserOperation,
    validUntil: number,
    validAfter: number,
    token: Address,
    ethPrice: bigint,
    tokenPrice: bigint
  ): Promise<Hex> {
    const packedUserOp = packUserOp(userOp);
    
    const hash = await this.publicClient.readContract({
      address: userOp.paymaster!,
      abi: MultiTokenPaymasterAbi,
      functionName: "getHash",
      args: [
        {...packedUserOp},
        0,
        validUntil,
        validAfter,
        token,
        zeroAddress,
        BigInt(1e8) * ethPrice / tokenPrice,
        1e6
      ]
    });

    return hash;
  }

  async getPaymasterData(
    userOp: UserOperation,
    validUntil: number,
    validAfter: number,
    token: Address
  ) {
    const oracle = this.networkConfig.supportedPaymasterTokens[token];

    const [ethPrice, tokenPrice] = await Promise.all([
      this.getLatestPrice(this.networkConfig.ethOracleAddress as Address),
      this.getLatestPrice(oracle),
    ]);

    const hash = await this.getHash(
      userOp,
      validUntil,
      validAfter,
      token,
      ethPrice,
      tokenPrice
    );

    const sig = await this.signer!.signMessage({ message: { raw: hexToBytes(hash) } });

    return concat([
      '0x00',
      encodeAbiParameters(
        [
          {type: 'uint48'},
          {type: 'uint48'},
          {type: 'address'},
          {type: 'address'},
          {type: 'uintt256'},
          {type: 'uint32'} 
        ],
        [
          validUntil,
          validAfter,
          token,
          zeroAddress,
          (BigInt(1e8) * ethPrice) / tokenPrice,
          1e6
        ]
      ),
      sig
    ])    
  }

  getPaymasterDataForEstimation(
    validUntil: number,
    validAfter: number,
    token: Address,
  ) {
    return concat([
      '0x00',
      encodeAbiParameters(
        [
          {type: 'uint48'},
          {type: 'uint48'},
          {type: 'address'},
          {type: 'address'},
          {type: 'uintt256'},
          {type: 'uint32'} 
        ],
        [
          validUntil,
          validAfter,
          token,
          zeroAddress,
          BigInt(1e8),
          1e6
        ]
      ),
      ECDSA_DUMMY_SIGNATURE
    ])
  }

  packPaymasterData(
    paymaster: Address,
    paymasterVerificationGasLimit: bigint,
    postOpGasLimit: bigint,
    paymasterData?: Hex
  ): Hex {
    return concat([
      paymaster as Hex,
      packUint(paymasterVerificationGasLimit, postOpGasLimit),
      (paymasterData ?? '0x') as Hex
    ])
  }
}
