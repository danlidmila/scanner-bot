const axios = require('axios');

async function getLatestPairs(chainIds = ['solana', 'base']) {
  const results = [];
  for (const chain of chainIds) {
    try {
      const res = await axios.get('https://api.dexscreener.com/latest/dex/search?q=new', { timeout: 8000 });
      const pairs = res.data?.pairs || [];
      for (const pair of pairs) {
        if (pair.chainId && pair.chainId.toLowerCase() !== chain.toLowerCase()) continue;
        results.push({
          pairAddress: pair.pairAddress || '',
          chain: chain.toLowerCase(),
          dex: pair.dexId || 'unknown',
          tokenName: pair.baseToken?.name || '',
          tokenSymbol: pair.baseToken?.symbol || '',
          tokenAddress: pair.baseToken?.address || '',
          liquidity: pair.liquidity?.usd || null,
          priceUsd: pair.priceUsd || null,
          createdAt: pair.pairCreatedAt || null,
        });
      }
    } catch (err) {
      console.error('DexScreener fetch error [' + chain + ']:', err.message);
    }
  }
  return results;
}

module.exports = { getLatestPairs };
