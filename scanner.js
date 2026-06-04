const db = require('./db');
const { sendAlert } = require('./telegram');
const { getLatestPairs } = require('./dexscreener');
const { getRecentBasePairs, getBaseTokenMetadata, getNewToken } = require('./base');
const { getRecentRaydiumPools, getTokenMetadata } = require('./solana');
const { startPumpFunScanner } = require('./pumpfun');

const SCAN_INTERVAL = parseInt(process.env.SCAN_INTERVAL || '4000', 10);
let lastBaseBlock = 0;

async function scanDexScreener(bot) {
  try {
    const pairs = await getLatestPairs(['solana', 'base']);
    for (const pair of pairs) {
      if (!pair.pairAddress || db.hasSeen(pair.pairAddress)) continue;
      const match = db.matchesWatchlist(pair.tokenName, pair.tokenSymbol);
      db.markSeen(pair.pairAddress, pair.chain, pair.tokenName, pair.tokenSymbol, !!match);
      if (match) {
        await sendAlert(bot, { ...pair, matchedTerm: match.term });
      }
    }
  } catch (err) {
    console.error('DexScreener scan error:', err.message);
  }
}

async function scanBase(bot) {
  try {
    const events = await getRecentBasePairs(30);
    for (const event of events) {
      if (db.hasSeen(event.pairAddress)) continue;
      if (event.blockNumber <= lastBaseBlock) continue;
      const newTokenAddress = getNewToken(event.token0Address, event.token1Address);
      const metadata = await getBaseTokenMetadata(newTokenAddress);
      db.markSeen(event.pairAddress, 'base', metadata.name, metadata.symbol, false);
      const match = db.matchesWatchlist(metadata.name, metadata.symbol);
      if (match) {
        await sendAlert(bot, {
          chain: 'base', tokenName: metadata.name, tokenSymbol: metadata.symbol,
          pairAddress: event.pairAddress, dex: event.dex, liquidity: null, matchedTerm: match.term,
        });
      }
      if (event.blockNumber > lastBaseBlock) lastBaseBlock = event.blockNumber;
    }
  } catch (err) {
    console.error('Base scan error:', err.message);
  }
}

async function scanSolana(bot) {
  if (!process.env.HELIUS_API_KEY) return;
  try {
    const pools = await getRecentRaydiumPools(10);
    for (const pool of pools) {
      if (!pool.tokenMint || db.hasSeen(pool.signature)) continue;
      db.markSeen(pool.signature, 'solana', '', '', false);
      const metadata = await getTokenMetadata(pool.tokenMint);
      if (!metadata) continue;
      const match = db.matchesWatchlist(metadata.name, metadata.symbol);
      if (match) {
        await sendAlert(bot, {
          chain: 'solana
