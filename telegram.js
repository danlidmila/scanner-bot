const TelegramBot = require('node-telegram-bot-api');
const db = require('./db');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function startBot() {
  if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not set in .env');

  const bot = new TelegramBot(TOKEN, { polling: true });

  // ── /start ──────────────────────────────────────────────────────────────────
  bot.onText(/\/start/, (msg) => {
    const text = `
🤖 *Scanner Bot Online*

Monitor new token launches on Solana & Base chain.

*Commands:*
/watch \\<name\\> — Add a token name or symbol to your watchlist
/watchcontains \\<name\\> — Alert if token name *contains* this string
/list — View your current watchlist
/remove \\<name\\> — Remove from watchlist
/clear — Clear entire watchlist
/help — Show this message

*Example:*
\`/watch PEPE\` — exact match on name or symbol
\`/watchcontains PEPE\` — matches PEPEKING, PEPECOIN, etc.
    `.trim();

    bot.sendMessage(msg.chat.id, text, { parse_mode: 'MarkdownV2' });
  });

  // ── /help ───────────────────────────────────────────────────────────────────
  bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id,
      `*Commands:*\n/watch <name>\n/watchcontains <name>\n/list\n/remove <name>\n/clear`,
      { parse_mode: 'Markdown' }
    );
  });

  // ── /watch ──────────────────────────────────────────────────────────────────
  bot.onText(/\/watch (.+)/, (msg, match) => {
    const term = match[1].trim().toUpperCase();
    if (!term) return bot.sendMessage(msg.chat.id, '❌ Please provide a token name. E.g. /watch PEPE');

    const added = db.addWatch(term, 'exact');
    if (added) {
      bot.sendMessage(msg.chat.id, `✅ Watching for *${term}* (exact match)\nI'll ping you the moment it launches on Solana or Base.`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(msg.chat.id, `⚠️ *${term}* is already in your watchlist.`, { parse_mode: 'Markdown' });
    }
  });

  // ── /watchcontains ──────────────────────────────────────────────────────────
  bot.onText(/\/watchcontains (.+)/, (msg, match) => {
    const term = match[1].trim().toUpperCase();
    if (!term) return bot.sendMessage(msg.chat.id, '❌ Please provide a term. E.g. /watchcontains PEPE');

    const added = db.addWatch(term, 'contains');
    if (added) {
      bot.sendMessage(msg.chat.id, `✅ Watching for tokens containing *${term}*`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(msg.chat.id, `⚠️ *${term}* is already in your watchlist.`, { parse_mode: 'Markdown' });
    }
  });

  // ── /list ───────────────────────────────────────────────────────────────────
  bot.onText(/\/list/, (msg) => {
    const list = db.getWatchlist();
    if (list.length === 0) {
      return bot.sendMessage(msg.chat.id, '📋 Your watchlist is empty.\nUse /watch <name> to add tokens.');
    }

    const lines = list.map((entry, i) => {
      const icon = entry.match_type === 'contains' ? '🔍' : '🎯';
      const type = entry.match_type === 'contains' ? '(contains)' : '(exact)';
      return `${i + 1}. ${icon} *${entry.term}* ${type}`;
    });

    bot.sendMessage(msg.chat.id, `📋 *Watchlist (${list.length}):*\n\n${lines.join('\n')}`, { parse_mode: 'Markdown' });
  });

  // ── /remove ─────────────────────────────────────────────────────────────────
  bot.onText(/\/remove (.+)/, (msg, match) => {
    const term = match[1].trim();
    const removed = db.removeWatch(term);
    if (removed) {
      bot.sendMessage(msg.chat.id, `🗑 Removed *${term.toUpperCase()}* from watchlist.`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(msg.chat.id, `❌ *${term.toUpperCase()}* wasn't in your watchlist.`, { parse_mode: 'Markdown' });
    }
  });

  // ── /clear ──────────────────────────────────────────────────────────────────
  bot.onText(/\/clear/, (msg) => {
    db.clearWatchlist();
    bot.sendMessage(msg.chat.id, '🗑 Watchlist cleared.');
  });

  // ── Error handling ───────────────────────────────────────────────────────────
  bot.on('polling_error', (err) => {
    console.error('Telegram polling error:', err.message);
  });

  console.log(`Telegram bot started. Chat ID from env: ${CHAT_ID || '(not set — use /start to get yours)'}`);
  return bot;
}

/**
 * Send an alert to the configured chat ID
 */
async function sendAlert(bot, { chain, tokenName, tokenSymbol, pairAddress, dex, liquidity, matchedTerm }) {
  const chatId = CHAT_ID;
  if (!chatId) {
    console.warn('⚠️  TELEGRAM_CHAT_ID not set — cannot send alert');
    return;
  }

  const chainEmoji = chain === 'solana' ? '◎' : '🔵';
  const chainLabel = chain === 'solana' ? 'Solana' : 'Base';
  const dexScreenerBase = chain === 'solana'
    ? `https://dexscreener.com/solana/${pairAddress}`
    : `https://dexscreener.com/base/${pairAddress}`;

  const dextoolsBase = chain === 'solana'
    ? `https://www.dextools.io/app/en/solana/pair-explorer/${pairAddress}`
    : `https://www.dextools.io/app/en/base/pair-explorer/${pairAddress}`;

  const liqText = liquidity ? `\n💧 *Liquidity:* $${Number(liquidity).toLocaleString()}` : '';

  const message = `
🚨 *MATCH FOUND* — \`${matchedTerm}\`

${chainEmoji} *Chain:* ${chainLabel}
🏷 *Name:* ${tokenName}
⚡ *Symbol:* ${tokenSymbol}
🏦 *DEX:* ${dex}${liqText}
📋 \`${pairAddress}\`

🔗 [DexScreener](${dexScreenerBase}) | [DexTools](${dextoolsBase})
  `.trim();

  try {
    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    });
  } catch (err) {
    console.error('Failed to send Telegram alert:', err.message);
  }
}

module.exports = { startBot, sendAlert };
