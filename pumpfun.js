const WebSocket = require('ws');
const db = require('./db');
const { sendAlert } = require('./telegram');

const PUMPFUN_WS = 'wss://pumpportal.fun/api/data';
let ws;
let reconnectTimeout;

function startPumpFunScanner(bot) {
  connect(bot);
}

function connect(bot) {
  console.log('Connecting to PumpFun WebSocket...');
  ws = new WebSocket(PUMPFUN_WS);

  ws.on('open', () => {
    console.log('✅ PumpFun WebSocket connected');
    ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
  });

  ws.on('message', async (data) => {
    try {
      const event = JSON.parse(data.toString());
      if (event.txType === 'create') {
        const tokenName = event.name || '';
        const tokenSymbol = event.symbol || '';
        const mint = event.mint || '';
        if (!mint || db.hasSeen('pumpfun_' + mint)) return;
        db.markSeen('pumpfun_' + mint, 'solana', tokenName, tokenSymbol, false);
        const match = db.matchesWatchlist(tokenName, tokenSymbol);
        if (match) {
          console.log('🚨 MATCH [PumpFun]: ' + tokenName + ' (' + tokenSymbol + ')');
          await sendAlert(bot, {
            chain: 'solana',
            tokenName: tokenName,
            tokenSymbol: tokenSymbol,
            pairAddress: mint,
            dex: 'PumpFun',
            liquidity: event.initialBuy || null,
            matchedTerm: match.term,
          });
        }
      }
    } catch (err) {}
  });

  ws.on('close', () => {
    console.warn('PumpFun disconnected — reconnecting in 5s...');
    clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => connect(bot), 5000);
  });

  ws.on('error', (err) => {
    console.error('PumpFun error:', err.message);
    ws.terminate();
  });
}

module.exports = { startPumpFunScanner };
