import { Transaction } from "@midnight-ntwrk/ledger";
import {
  findDeployedContract,
  FoundContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import {
  getLedgerNetworkId,
  getZswapNetworkId,
  NetworkId,
  setNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";
import { createBalancedTx } from "@midnight-ntwrk/midnight-js-types";
import { WalletBuilder } from "@midnight-ntwrk/wallet";
import { Transaction as ZswapTransaction } from "@midnight-ntwrk/zswap";
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline/promises";
import * as Rx from "rxjs";
import { WebSocket } from "ws";
import {
  claimThePrize,
  getWinnerNumber,
  placeABet,
  setWinnerNumber,
} from "./operations.js";
import { MidnightProviders } from "./providers/midnight-providers.js";
import { EnvironmentManager } from "./utils/environment.js";

// Fix WebSocket for Node.js environment
// @ts-ignore
globalThis.WebSocket = WebSocket;

// Configure for Midnight Testnet
setNetworkId(NetworkId.TestNet);

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("🌙 Lottery CLI\n");

  try {
    // Validate environment
    EnvironmentManager.validateEnvironment();

    // Check for deployment file
    if (!fs.existsSync("deployment.json")) {
      console.error("❌ No deployment.json found! Run npm run deploy first.");
      process.exit(1);
    }

    const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf-8"));
    console.log(`Contract: ${deployment.contractAddress}\n`);

    const networkConfig = EnvironmentManager.getNetworkConfig();
    const contractName =
      deployment.contractName || process.env.CONTRACT_NAME || "hello-world";
    const walletSeed = process.env.WALLET_SEED!;

    console.log("Connecting to Midnight network...");

    // Build wallet
    const wallet = await WalletBuilder.build(
      networkConfig.indexer,
      networkConfig.indexerWS,
      networkConfig.proofServer,
      networkConfig.node,
      walletSeed,
      getZswapNetworkId(),
      "info"
    );

    wallet.start();
    // Wait for sync
    await Rx.firstValueFrom(
      wallet.state().pipe(Rx.filter((s) => s.syncProgress?.synced === true))
    );

    // Load contract
    const contractPath = path.join(process.cwd(), "contracts");
    const contractModulePath = path.join(
      contractPath,
      "managed",
      contractName,
      "contract",
      "index.cjs"
    );

    const Lottery = await import(contractModulePath);
    const contractInstance = new Lottery.Contract({});

    // Create wallet provider
    const walletState = await Rx.firstValueFrom(wallet.state());

    const walletProvider = {
      coinPublicKey: walletState.coinPublicKey,
      encryptionPublicKey: walletState.encryptionPublicKey,
      balanceTx(tx: any, newCoins: any) {
        return wallet
          .balanceTransaction(
            ZswapTransaction.deserialize(
              tx.serialize(getLedgerNetworkId()),
              getZswapNetworkId()
            ),
            newCoins
          )
          .then((tx) => wallet.proveTransaction(tx))
          .then((zswapTx) =>
            Transaction.deserialize(
              zswapTx.serialize(getZswapNetworkId()),
              getLedgerNetworkId()
            )
          )
          .then(createBalancedTx);
      },
      submitTx(tx: any) {
        return wallet.submitTransaction(tx);
      },
    };

    // Configure providers
    const providers = MidnightProviders.create({
      contractName,
      walletProvider,
      networkConfig,
    });

    // Connect to contract
    const deployed: FoundContract<any> = await findDeployedContract(providers, {
      contractAddress: deployment.contractAddress,
      contract: contractInstance,
      privateStateId: "helloWorldState",
      initialPrivateState: {},
    });

    console.log("✅ Connected to contract\n");

    let running = true;
    while (running) {
      console.log("--- Menu ---");
      console.log("1. Set winner number (admin only)");
      console.log("2. Read winner number");
      console.log("3. Place a bet");
      console.log("4. Claim the prize");
      console.log("5. Exit");

      const choice = await rl.question("\nYour choice: ");

      switch (choice) {
        case "1":
          await setWinnerNumber(rl, deployed);
          break;
        case "2":
          await getWinnerNumber(providers, deployment, Lottery);
          break;
        case "3":
          await placeABet(rl, deployed);
          break;
        case "4":
          await claimThePrize(deployed);
          break;
        case "5":
          running = false;
          console.log("\n👋 Goodbye!");
          break;

        default:
          console.log("❌ Invalid choice. Please enter 1, 2, 3, 4, or 5.\n");
      }
    }

    // Clean up
    await wallet.close();
  } catch (error) {
    console.error("\n❌ Error:", error);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
