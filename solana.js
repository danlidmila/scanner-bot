const axios = require('axios');

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const HELIUS_API = `https://api.helius.xyz/v0`;

// Raydium AMM V4 program ID
const RAYDIUM_AMM_PROGRAM = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';

/**
 * Get recent Raydium pool creation transactions
 * Uses Helius enhanced transactions API
 */
async function getRecentRaydiumPools(limit = 20) {
  if (!HELIUS_API_KEY) {
    console.warn('HELIUS_API_KEY not set — Solana on-chain scanning disabled');
    return [];
  }

  try {
    const res = await axios.post(
      `${HELIUS_API}/addresses/${RAYDIUM_AMM_PROGRAM}/transactions?api-key=${HELIUS_API_KEY}`,
      { limit, type: 'INITIALIZE_MARKET' },
      { timeout: 10000 }
    );

    return (res.data || []).map(parseSolanaTransaction).filter(Boolean);
  } catch (err) {
    if (err.response?.status === 429) {
      // Rate limited — back off
      console.warn('Helius rate limited, backing off...');
    } else {
      console.error('Helius API error:', err.message);
    }
    return [];
  }
}

/**
 * Get token metadata using Helius DAS API
 */
async function getTokenMetadata(mintAddress) {
  if (!HELIUS_API_KEY) return null;

  try {
    const res = await axios.post(
      HELIUS_RPC,
      {
        jsonrpc: '2.0',
        id: 'get-asset',
        method: 'getAsset',
        params: { id: mintAddress },
      },
      { timeout: 8000 }
    );

    const asset = res.data?.result;
    if (!asset) return null;

    return {
      name: asset.content?.metadata?.name || '',
      symbol: asset.content?.metadata?.symbol || '',
      mintAddress,
    };
  } catch (err) {
    console.error('Helius metadata error:', err.message);
    return null;
  }
}

function parseSolanaTransaction(tx) {
  if (!tx) return null;
  try {
    // Extract the new token mint from the transaction accounts
    const accounts = tx.accountData || [];
    const tokenMint = accounts.find((a) => a.account && a.nativeBalanceChange < 0)?.account;

    return {
      signature: tx.signature,
      timestamp: tx.timestamp,
      tokenMint: tokenMint || null,
      chain: 'solana',
      dex: 'Raydium',
    };
  } catch {
    return null;
  }
}

module.exports = { getRecentRaydiumPools, getTokenMetadata };
