import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

export async function executeTransaction(
  instructions: TransactionInstruction[],
  connection: Connection,
  wallet: Keypair,
  maxRetries = 3
): Promise<string> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");

      const transaction = new Transaction({
        blockhash,
        lastValidBlockHeight,
      }).add(...instructions);

      transaction.sign(wallet);
      
      const signature = await connection.sendRawTransaction(
        transaction.serialize(), 
        { preflightCommitment: "confirmed" }
      );
      
      await connection.confirmTransaction(
        {
          blockhash,
          lastValidBlockHeight,
          signature,
        },
        "confirmed"
      );

      return signature;
      
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw error;
      }
      
      console.log(`Transaction failed (attempt ${attempt}/${maxRetries}), retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
  
  throw new Error("Transaction failed after all retries");
}

export async function batchExecuteTransactions<T>(
  items: T[],
  processor: (item: T) => Promise<TransactionInstruction[]>,
  connection: Connection,
  wallet: Keypair,
  batchSize = 2,
  concurrency = 4
): Promise<{ results: any[], errors: any[] }> {
  const results: any[] = [];
  const errors: any[] = [];
  const promises: Promise<any>[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    if (promises.length >= concurrency) {
      const completed = await Promise.race(promises);
      promises.splice(promises.findIndex(p => p === Promise.resolve(completed)), 1);
    }
    
    const batch = items.slice(i, i + batchSize);
    
    const batchPromise = (async () => {
      try {
        const instructions = await Promise.all(
          batch.map(item => processor(item))
        ).then(res => res.flat());
        
        const signature = await executeTransaction(instructions, connection, wallet);
        return { batch, signature, success: true };
      } catch (error) {
        return { batch, error, success: false };
      }
    })();
    
    batchPromise.then(result => {
      if (result.success) {
        results.push(result);
      } else {
        errors.push(result);
      }
    });
    
    promises.push(batchPromise);
  }
  
  await Promise.all(promises);
  return { results, errors };
}