import { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import { Ledger } from "../../contracts/managed/lottery/contract/index.cjs";

export type PrivateState = {
  secretKey: Uint8Array;
};

export const witnesses = {
  secretKey: ({
    privateState,
  }: WitnessContext<Ledger, PrivateState>): [PrivateState, Uint8Array] => {
    console.log(privateState);
    return [privateState, privateState.secretKey];
  },
};
