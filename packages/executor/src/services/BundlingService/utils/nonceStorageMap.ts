import { BigNumber, BigNumberish, ethers } from "ethers";
import { Bundle, StorageMap } from "../../../interfaces";
import { mergeStorageMap } from "../../../utils/mergeStorageMap";

const EP6_NONCE_SLOT = 1;

export function getNonceStorageMap(
  account: string,
  nonce: BigNumberish
): [string, string] {
  const abiCoder = new ethers.utils.AbiCoder();
  const key = BigNumber.from(nonce).shr(64);
  let seq = BigNumber.from(nonce).shl(192).shr(192)._hex;
  seq = ethers.utils.hexZeroPad(seq, 32);
  const keyLevelEncoded = abiCoder.encode(
    ["address", "uint256"],
    [account, EP6_NONCE_SLOT]
  );
  const nonceLevelEncoded = abiCoder.encode(["uint192"], [key]);
  const slot = ethers.utils.keccak256(
    ethers.utils.concat([
      nonceLevelEncoded,
      ethers.utils.keccak256(keyLevelEncoded),
    ])
  );
  return [slot, seq];
}

export function getNonceStorageMapForBundle(bundle: Bundle): StorageMap {
  if (bundle.entries.length == 0) return bundle.storageMap;
  const storageMap = { ...bundle.storageMap }; // cloning
  const entryPoint = bundle.entries[0].entryPoint.toLowerCase();
  for (const entry of bundle.entries) {
    const { userOp } = entry;
    const nonceCheck = getNonceStorageMap(userOp.sender, userOp.nonce);
    mergeStorageMap(storageMap, {
      [entryPoint]: {
        [nonceCheck[0]]: nonceCheck[1].toString(),
      },
    });
  }
  return storageMap;
}
