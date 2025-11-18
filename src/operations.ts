import { encodeTokenType, nativeToken } from "@midnight-ntwrk/ledger";
import { FoundContract } from "@midnight-ntwrk/midnight-js-contracts";
import * as readline from "readline/promises";
import { MidnightProviders } from "./providers/midnight-providers";

export type ProvidersType = ReturnType<typeof MidnightProviders.create>;

export const setWinnerNumber = async (
  rl: readline.Interface,
  deployed: FoundContract<any>
) => {
  console.log("\nStoring winner number...");
  const winnerNumber = await rl.question("Enter the winner number: ");
  try {
    const tx = await (deployed.callTx as any).setWinner(BigInt(winnerNumber));
    console.log("✅ Success!");
    console.log(`Winner number: "${winnerNumber}"`);
    console.log(`Transaction ID: ${tx.public.txId}`);
    console.log(`Block height: ${tx.public.blockHeight}\n`);
  } catch (error) {
    console.error("❌ Failed to store winner number:", error);
  }
};

export const getWinnerNumber = async (
  providers: ProvidersType,
  deployment: any,
  Lottery: any
) => {
  console.log("\nReading winner number from blockchain...");
  try {
    const state = await providers.publicDataProvider.queryContractState(
      deployment.contractAddress
    );
    if (state) {
      const ledger = Lottery.ledger(state.data);
      console.log(`📋 The winner number is: "${ledger.winnerNumber}"\n`);
    } else {
      console.log("📋 No winner number found\n");
    }
  } catch (error) {
    console.error("❌ Failed to read winner number:", error);
  }
};

export const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

export const placeABet = async (
  rl: readline.Interface,
  deployed: FoundContract<any>
) => {
  console.log("\nPlacing a bet...");

  const userNumber = await rl.question("Enter your number: ");
  try {
    const coinInfo = {
      color: encodeTokenType(nativeToken()),
      nonce: randomBytes(32),
      value: BigInt(1000),
    };
    const secretKey = randomBytes(32);
    const tx = await (deployed.callTx as any).placeBet(
      BigInt(userNumber),
      coinInfo,
      secretKey
    );
    console.log("✅ Success!");
    console.log(`Your number is: "${userNumber}"`);
    console.log(`Transaction ID: ${tx.public.txId}`);
    console.log(`Block height: ${tx.public.blockHeight}\n`);
  } catch (error) {
    console.error("❌ Failed to place a new bet:", error);
  }
};

export const claimThePrize = async (deployed: FoundContract<any>) => {
  console.log("\nClaiming the prize...");

  try {
    const tx = await (deployed.callTx as any).claimPrize();
    console.log("✅ Success!");
    console.log(`Transaction ID: ${tx.public.txId}`);
    console.log(`Block height: ${tx.public.blockHeight}\n`);
  } catch (error) {
    console.error("❌ Failed to claim the prize:", error);
  }
};
