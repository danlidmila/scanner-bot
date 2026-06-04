const axios = require('axios');

const BASE_URL = 'https://api.dexscreener.com';

/**
 * Fetch the latest token pairs from DexScreener
 * Returns an array of normalised pair objects
 */
async function getLatestPairs(chainIds = ['solana', 'base']) {
  const results = [];

  for (const chain of chainIds) {
    try {
      // DexScreener /latest/dex/tokens endpoint returns recently active pairs
      const url = `${BASE_URL}/latest/dex/pairs/${chain}`;
      const res = await axios.get(url, { timeout: 8000 });

      const pairs = res.data?.pairs || [];
      for (const pair of pairs) {
        results.push(normalisePair(pair, chain));
      }
    } catch (err) {
      console.error(`DexScreener fetch error [${chain}]:`, err.message);
    }
  }

  return results;
}

/**
 * Search DexScreener by token name or symbol
 * Used to double-check a token after a match
 */
async function searchToken(query) {
  try {
    const res = await axios.get(`${BASE_URL}/latest/dex/search?q=${encodeURIComponent(query)}`, {
      timeout: 8000,
    });
    return (res.data?.pairs || []).map((p) => normalisePair(p));
  } catch (err) {
    console.error('DexScreener search error:', err.message);
    return [];
  }
}

/**
 * Fetch pairs for a specific token address
 */
async function getPairsByToken(tokenAddress, chain) {
  try {
    const res = await axios.get(`${BASE_URL}/latest/dex/tokens/${tokenAddress}`, {
      timeout: 8000,
    });
    return (res.data?.pairs || []).map((p) => normalisePair(p, chain));
  } catch (err) {
    console.error('DexScreener token lookup error:', err.message);
    return [];
  }
}

function normalisePair(pair, chainOverride) {
  const chain = chainOverride || pair.chainId || 'unknown';
  return {
    pairAddress: pair.pairAddress || '',
    chain: chain.toLowerCase(),
    dex: pair.dexId || 'unknown',
    tokenName: pair.baseToken?.name || '',
    tokenSymbol: pair.baseToken?.symbol || '',
    tokenAddress: pair.baseToken?.address || '',
    liquidity: pair.liquidity?.usd || null,
    priceUsd: pair.priceUsd || null,
    createdAt: pair.pairCreatedAt || null,
    fdv: pair.fdv || null,
    url: pair.url || null,
  };
}

module.exports = { getLatestPairs, searchToken, getPairsByToken };
