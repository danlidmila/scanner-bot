const { ethers } = require('ethers');

const BASE_RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

// Uniswap V2 factory on Base
const UNISWAP_V2_FACTORY = '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6';

// BaseSwap factory (popular on Base)
const BASESWAP_FACTORY = '0xFDa619b6d20975be80A10332cD39b9a4b0FAa8BB';

const PAIR_CREATED_ABI = [
  'event PairCreated(address indexed token0, address indexed token1, address pair, uint)',
];

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
];

let provider;

function getProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(BASE_RPC);
  }
  return provider;
}

/**
 * Scan recent blocks for PairCreated events on Base
 */
async function getRecentBasePairs(blocksBack = 50) {
  try {
    const p = getProvider();
    const currentBlock = await p.getBlockNumber();
    const fromBlock = currentBlock - blocksBack;

    const results = [];

    for (const [factoryAddress, dexName] of [
      [UNISWAP_V2_FACTORY, 'Uniswap V2'],
      [BASESWAP_FACTORY, 'BaseSwap'],
    ]) {
      const contract = new ethers.Contract(factoryAddress, PAIR_CREATED_ABI, p);

      let events;
      try {
        events = await contract.queryFilter('PairCreated', fromBlock, currentBlock);
      } catch {
        continue;
      }

      for (const event of events) {
        const { token0, token1, pair } = event.args;
        results.push({
          pairAddress: pair,
          token0Address: token0,
          token1Address: token1,
          chain: 'base',
          dex: dexName,
          blockNumber: event.blockNumber,
        });
      }
    }

    return results;
  } catch (err) {
    console.error('Base scan error:', err.message);
    return [];
  }
}

/**
 * Fetch ERC-20 name and symbol for a token address
 */
async function getBaseTokenMetadata(tokenAddress) {
  try {
    const p = getProvider();
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, p);

    const [name, symbol] = await Promise.all([
      contract.name().catch(() => ''),
      contract.symbol().catch(() => ''),
    ]);

    return { name, symbol, address: tokenAddress };
  } catch (err) {
    console.error('ERC-20 metadata error:', err.message);
    return { name: '', symbol: '', address: tokenAddress };
  }
}

/**
 * Given a pair event, determine which token is the "new" one
 * (not WETH / stablecoin)
 */
const KNOWN_QUOTE_TOKENS = new Set([
  '0x4200000000000000000000000000000000000006', // WETH on Base
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
  '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // DAI on Base
]);

function getNewToken(token0, token1) {
  if (KNOWN_QUOTE_TOKENS.has(token0.toLowerCase())) return token1;
  if (KNOWN_QUOTE_TOKENS.has(token1.toLowerCase())) return token0;
  return token0; // default to token0 if neither is a known quote
}

module.exports = { getRecentBasePairs, getBaseTokenMetadata, getNewToken };
