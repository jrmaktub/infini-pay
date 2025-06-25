
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { Liquidity, LiquidityPoolKeys, jsonInfo2PoolKeys, Percent, Token, TokenAmount } from '@raydium-io/raydium-sdk';

const SOLANA_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
const ICC_MINT = new PublicKey('14LEVoHXpN8simuS2LSUsUJbWyCkAUi6mvL9JLELbT3g');
const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112'); // Wrapped SOL

interface SwapResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export class RaydiumSwapService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(SOLANA_RPC_ENDPOINT, 'confirmed');
  }

  async getIccSolPoolInfo(): Promise<LiquidityPoolKeys | null> {
    try {
      // For demonstration, using a mock pool structure
      // In production, you would fetch this from Raydium's API or on-chain data
      const poolInfo = {
        id: new PublicKey('58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2'), // Example pool ID
        baseMint: ICC_MINT,
        quoteMint: SOL_MINT,
        lpMint: new PublicKey('2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk'),
        baseDecimals: 9,
        quoteDecimals: 9,
        lpDecimals: 9,
        version: 4 as 4,
        programId: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
        authority: new PublicKey('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1'),
        openOrders: new PublicKey('HRk9CMrpq7Jn9sh7mzxE8CChHG2dneX7p9vB2dmx9Zp'),
        targetOrders: new PublicKey('CZza3Ej4Mc58MnxWA385itCC9jCo3L1D7zc3LKy1bZMR'),
        baseVault: new PublicKey('38YjZczl6dKqw2KnkfgBYuPpMr4AQanDoTzaFHaUWgJd'),
        quoteVault: new PublicKey('42VNLs1PuGg4XpDWz7YRFzbBWfUAjEv3vKr8Tx5LPDS'),
        withdrawQueue: new PublicKey('G7xeGGLevkRwB5fgfxq8MkqQoJpm3qNgwgANKDsGJRz'),
        lpVault: new PublicKey('Awpt6N7ZYPBa4vG4BQNFhFxDj5w6r6yX8LHhBnF4bnE'),
        marketVersion: 3 as 3,
        marketProgramId: new PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'),
        marketId: new PublicKey('HWHvQhFmJB3NUcu1aihKmrKegfVxBEHzwVX6yZCKEsi1'),
        marketBids: new PublicKey('14ivtgssEBoBjuZJtSAPKYgpUK7DmnSwuPMqJoVTSgKJ'),
        marketAsks: new PublicKey('CEQdAFKdycHugujQg9k2wbmxjcpdYZyVLfV9WerTnafJ'),
        marketEventQueue: new PublicKey('H9dZt8kvz1Fe5FyRisb77KcYTaN8LEbuVAfJSnAaEABz'),
        marketBaseVault: new PublicKey('DQyrAcCrDXQ7NeoqGgDCZwBvWDcYmFCjSb9JtteuvPpz'),
        marketQuoteVault: new PublicKey('HLmqeL62xR1QoZ1HKKbXRrdN1p3phKpxRMb2VVopvBBz'),
        marketAuthority: new PublicKey('aCNJPrCaKu3TpJkGYjBGMn3LQPsKDaocBhSLsNfkbGHk'),
        lookupTableAccount: PublicKey.default,
      };

      return poolInfo;
    } catch (error) {
      console.error('Error fetching pool info:', error);
      return null;
    }
  }

  async swapIccToSol(
    wallet: any,
    amountIn: number,
    slippageTolerance: number = 1 // 1% slippage
  ): Promise<SwapResult> {
    try {
      if (!wallet.publicKey) {
        return { success: false, error: 'Wallet not connected' };
      }

      const poolKeys = await this.getIccSolPoolInfo();
      if (!poolKeys) {
        return { success: false, error: 'Could not fetch pool information' };
      }

      // Create token objects
      const iccToken = new Token(TOKEN_PROGRAM_ID, ICC_MINT, 9, 'ICC', 'Infinita Coin');
      const solToken = new Token(TOKEN_PROGRAM_ID, SOL_MINT, 9, 'SOL', 'Solana');

      // Calculate token amounts
      const tokenAmountIn = new TokenAmount(iccToken, amountIn * Math.pow(10, 9));
      
      // Get pool info for calculations
      const poolInfo = await Liquidity.fetchInfo({
        connection: this.connection,
        poolKeys,
      });

      // Calculate amount out
      const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
        poolKeys,
        poolInfo,
        amountIn: tokenAmountIn,
        currencyOut: solToken,
        slippage: new Percent(slippageTolerance, 100),
      });

      console.log('Swap calculation:', {
        amountIn: tokenAmountIn.toFixed(),
        amountOut: amountOut.toFixed(),
        minAmountOut: minAmountOut.toFixed(),
      });

      // Get associated token addresses
      const userIccTokenAccount = await getAssociatedTokenAddress(
        ICC_MINT,
        wallet.publicKey
      );

      const userSolTokenAccount = await getAssociatedTokenAddress(
        SOL_MINT,
        wallet.publicKey
      );

      // Check if token accounts exist
      const accounts = await this.connection.getMultipleAccountsInfo([
        userIccTokenAccount,
        userSolTokenAccount,
      ]);

      const instructions = [];

      // Create SOL token account if it doesn't exist
      if (!accounts[1]) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            userSolTokenAccount,
            wallet.publicKey,
            SOL_MINT
          )
        );
      }

      // Create swap instruction
      const swapInstruction = await Liquidity.makeSwapInstructionSimple({
        connection: this.connection,
        poolKeys,
        userKeys: {
          tokenAccounts: [
            { pubkey: userIccTokenAccount, accountInfo: null, programId: TOKEN_PROGRAM_ID },
            { pubkey: userSolTokenAccount, accountInfo: null, programId: TOKEN_PROGRAM_ID }
          ],
          owner: wallet.publicKey,
        },
        amountIn: tokenAmountIn.raw,
        amountOut: minAmountOut.raw,
        fixedSide: 'in',
        makeTxVersion: 0,
      });

      instructions.push(...swapInstruction.innerTransactions[0].instructions);

      // Create and send transaction
      const transaction = new Transaction().add(...instructions);
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = wallet.publicKey;

      // Sign and send transaction
      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize());

      // Confirm transaction
      await this.connection.confirmTransaction(signature, 'confirmed');

      console.log('Swap successful:', signature);
      return { success: true, signature };

    } catch (error) {
      console.error('Swap failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  async getTokenBalance(mint: PublicKey, owner: PublicKey): Promise<number> {
    try {
      const tokenAccount = await getAssociatedTokenAddress(mint, owner);
      const accountInfo = await this.connection.getTokenAccountBalance(tokenAccount);
      return accountInfo.value.uiAmount || 0;
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return 0;
    }
  }
}

export const raydiumSwapService = new RaydiumSwapService();
