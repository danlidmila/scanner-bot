require('dotenv').config();
const { startBot } = require('./telegram');
const { startScanners } = require('./scanner');
const db = require('./db');

async function main() {
  console.log('🚀 Starting Scanner Bot...');
  await db.init();
  console.log('✅ Database ready');
  const bot = startBot();
  console.log('✅ Telegram bot running');
  startScanners(bot);
  console.log('✅ Scanners started (Solana + Base)');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
