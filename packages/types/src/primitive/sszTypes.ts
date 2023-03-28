import {
  ByteVectorType,
  UintNumberType,
  UintBigintType,
  BooleanType,
} from "@chainsafe/ssz";

export const Boolean = new BooleanType();
export const Byte = new UintNumberType(1);
export const Bytes4 = new ByteVectorType(4);
export const Bytes8 = new ByteVectorType(8);
export const Bytes20 = new ByteVectorType(20);
export const Bytes32 = new ByteVectorType(32);
export const Bytes48 = new ByteVectorType(48);
export const Bytes96 = new ByteVectorType(96);
export const Uint8 = new UintNumberType(1);
export const Uint16 = new UintNumberType(2);
export const Uint32 = new UintNumberType(4);
export const UintNum64 = new UintNumberType(8);
export const UintNumInf64 = new UintNumberType(8, { clipInfinity: true });
export const UintBn64 = new UintBigintType(8);
export const UintBn128 = new UintBigintType(16);
export const UintBn256 = new UintBigintType(32);

// Custom types, defined for type hinting and readability
export const Version = Bytes4;
export const Address = Bytes20;
export const Signature = Bytes96;
