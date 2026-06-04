const TelegramBot = require('node-telegram-bot-api');
const db = require('./db');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function startBot() {
  if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not set in .env');

  const bot = new TelegramBot(TOKEN, { polling: true });

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id,
      '🤖 Scanner Bot Online\n\nCommands:\n/watch PEPE - exact match\n/watchcontains PEPE - partial match\n/list - view watchlist\n/remove PEPE - remove token\n/clear - clear all\n\nExample: /watch PEPE'
    );
  });

  bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id,
      'Commands:\n/watch <name>\n/watchcontains <name>\n/list\n/remove <name>\n/clear'
    );
  });

  bot.onText(/\/watch (.+)/, (msg, match) => {
    const term = match[1].trim().toUpperCase();
    if (!term) return bot.sendMessage(msg.chat.id, 'Please provide a token name. E.g. /watch PEPE');
    const added = db.addWatch(term, 'exact');
    if (added) {
      bot.sendMessage(msg.chat.id, '✅ Watching for ' + term + ' (exact match)\nI will ping you the moment it launches on Solana or Base.');
    } else {
      bot.sendMessage(msg.chat.id, '⚠️ ' + term + ' is already in your watchlist.');
    }
  });

  bot.onText(/\/watchcontains (.+)/, (msg, match) => {
    const term = match[1].trim().toUpperCase();
    if (!term) return bot.sendMessage(msg.chat.id, 'Please provide a term. E.g. /watchcontains PEPE');
    const added = db.addWatch(term, 'contains');
    if (added) {
      bot.sendMessage(msg.chat.id, '✅ Watching for tokens containing ' + term);
    } else {
      bot.sendMessage(msg.chat.id, '⚠️ ' + term + ' is already in your watchlist.');
    }
  });

  bot.onText(/\/list/, (msg) => {
    const list = db.getWatchlist();
    if (list.length === 0) {
      return bot.sendMessage(msg.chat.id, '📋 Your watchlist is empty.\nUse /watch <name> to add tokens.');
    }
    const lines = list.map((entry, i) => {
      const icon = entry.match_type === 'contains' ? '🔍' : '🎯';
      return (i + 1) + '. ' + icon + ' ' + entry.term + ' (' + entry.match_type + ')';
    });
    bot.sendMessage(msg.chat.id, '📋 Watchlist (' + list.length + '):\n\n' + lines.join('\n'));
  });

  bot.onText(/\/remove (.+)/, (msg, match) => {
    const term = match[1].trim();
    const removed = db.removeWatch(term);
    if (removed) {
      bot.sendMessage(msg.chat.id, '🗑 Removed ' + term.toUpperCase() + ' from watchlist.');
    } else {
      bot.sendMessage(msg.chat.id, '❌ ' + term.toUpperCase() + ' was not in your watchlist.');
    }
  });

  bot.onText(/\/clear/, (msg) => {
    db.clearWatchlist();
    bot.sendMessage(msg.chat.id, '🗑 Watchlist cleared.');
  });

  bot.on('polling_error', (err) => {
    console.error('Telegram polling error:', err.message);
  });

  console.log('Telegram bot started. Chat ID from env: ' + (CHAT_ID || '(not set)'));
  return bot;
}

async function sendAlert(bot, { chain, tokenName, tokenSymbol, pairAddress, dex, liquidity, matchedTerm }) {
  const chatId = CHAT_ID;
  if (!chatId) { console.warn('TELEGRAM_CHAT_ID not set'); return; }

  const chainEmoji = chain === 'solana' ? '◎' : '🔵';
  const chainLabel = chain === 'solana' ? 'Solana' : 'Base';
  const liqText = liquidity ? '\n💧 Liquidity: $' + Number(liquidity).toLocaleString() : '';
  const dexScreenerLink = chain === 'solana'
    ? 'https://dexscreener.com/solana/' + pairAddress
    : 'https://dexscreener.com/base/' + pairAddress;

  const message = '🚨 MATCH FOUND: ' + matchedTerm + '\n\n' +
    chainEmoji + ' Chain: ' + chainLabel + '\n' +
    '🏷 Name: ' + tokenName + '\n' +
    '⚡ Symbol: ' + tokenSymbol + '\n' +
    '🏦 DEX: ' + dex + liqText + '\n' +
    '📋 ' + pairAddress + '\n\n' +
    '🔗 ' + dexScreenerLink;

  try {
    await bot.sendMessage(chatId, message);
  } catch (err) {
    console.error('Failed to send alert:', err.message);
  }
}

module.exports = { startBot, sendAlert };
