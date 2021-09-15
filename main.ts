import {
  Connection,
  clusterApiUrl,
  PublicKey,
  Cluster,
  Account,
  Transaction,
} from "@solana/web3.js";
import {
  isValidPublicKey,
  transferToken,
  findAssociatedTokenAddress,
  createAssociatedTokenAccount,
  TOKEN_ACCOUNT_LAYOUT,
} from "./utils";

const connection = new Connection(clusterApiUrl("mainnet-beta"));
const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// private key
const WALLET = new Account([]);
const OWNER = WALLET.publicKey;

const addresses: { [addr: string]: number } = {
"address":15,
"DavaKBkUKHCyB2TTbReQCWmpGn7igQ6vMKJz7stEtD1q":15
};

async function main() {
  for (const [addr, amount] of Object.entries(addresses)) {
    console.log(`${addr}: ${amount}`);

    let destinationAddress;
    let destinationOwner;

    const address = new PublicKey(addr);
    const addressInfo = await connection.getAccountInfo(address);

    if (!addressInfo || addressInfo.data.length === 0) {
      destinationOwner = address;
      destinationAddress = await findAssociatedTokenAddress(
        destinationOwner,
        USDC
      );
    } else if (addressInfo.data.length === TOKEN_ACCOUNT_LAYOUT.span) {
      const { mint, owner } = TOKEN_ACCOUNT_LAYOUT.decode(addressInfo.data);

      if (!USDC.equals(mint)) {
        throw new Error(`invalid address: ${addr} is not USDC token account`);
      }

      destinationAddress = address;
      destinationOwner = owner;
    } else {
      throw new Error(`invalid address: ${addr}`);
    }

    const recentBlockhash = await connection.getRecentBlockhash();

    const transaction = new Transaction({
      recentBlockhash: recentBlockhash.blockhash,
    });

    const tokenAccountInfo = await connection.getAccountInfo(
      destinationAddress
    );
    if (!tokenAccountInfo) {
      transaction.add(
        await createAssociatedTokenAccount(OWNER, USDC, destinationOwner)
      );
    }

    const source = await findAssociatedTokenAddress(OWNER, USDC);
    transaction.add(
      transferToken({
        source,
        dest: destinationAddress,
        amount: amount * 10 ** 6,
        owner: OWNER,
      })
    );
    transaction.sign(WALLET);

    const txid = await connection.sendTransaction(transaction, [WALLET], {
      skipPreflight: false,
    });
    console.log(`${addr}, ${amount} USDC, txid: ${txid}`);
  }
}

main();
