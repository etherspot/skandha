import { BigNumber, constants } from "ethers";

export const AddressZero = constants.AddressZero;
export const BytesZero = "0x";

export const GasPriceMarkupOne = BigNumber.from(10000); // 100.00%

export const ECDSA_DUMMY_SIGNATURE =
  "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";

export const EIP7702_PREFIX = "0xef0100";

export const INITCODE_EIP7702_MARKER = "0x7702";
