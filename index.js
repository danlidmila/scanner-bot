require('dotenv').config();
const { startBot } = require('./src/telegram');
const { startScanners } = require('./src/scanner');
const db = require('./src/db');

async function main() {
  console.log('🚀 Starting Scanner Bot...');

  // Init DB
  await db.init();
  console.log('✅ Database ready');

  // Start Telegram bot
  const bot = startBot();
  console.log('✅ Telegram bot running');

  // Start chain scanners
  startScanners(bot);
  console.log('✅ Scanners started (Solana + Base)');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
