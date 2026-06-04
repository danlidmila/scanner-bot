# 🔍 Scanner Bot — Solana + Base Chain

Monitors new token pair launches on Solana and Base chain. Sends a Telegram alert the moment a token matching your watchlist is deployed.

---

## Features

- ✅ Scans **Solana** (Raydium) and **Base** (Uniswap V2, BaseSwap)
- ✅ **DexScreener polling** — works with zero API keys
- ✅ **Base on-chain listener** — detects pairs before DexScreener indexes them
- ✅ **Solana on-chain** via Helius (optional but faster)
- ✅ **Exact** and **contains** match modes
- ✅ Persistent watchlist via SQLite (survives restarts)
- ✅ Dedup — never double-alerts on the same pair

---

## Setup

### 1. Prerequisites

- Node.js v18+
- A Telegram account

### 2. Create your Telegram bot

1. Open Telegram, search for **@BotFather**
2. Send `/newbot`, follow the prompts
3. Copy your **bot token**
4. Start a chat with your new bot, then visit:
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
   Send a message to the bot, then look for `"chat":{"id":XXXXXXX}` — that's your chat ID

### 3. Get API keys (optional but recommended)

- **Helius** (Solana): Free at [helius.dev](https://helius.dev) — enables on-chain Solana scanning
- **Alchemy** (Base): Free at [alchemy.com](https://alchemy.com) — more reliable than public RPC

### 4. Configure

```bash
cp .env.example .env
```

Edit `.env`:

```env
TELEGRAM_BOT_TOKEN=7123456789:AAF...
TELEGRAM_CHAT_ID=123456789
HELIUS_API_KEY=your_helius_key        # optional
BASE_RPC_URL=https://mainnet.base.org # or Alchemy URL
SCAN_INTERVAL=4000                    # ms between scans
```

### 5. Install & run

```bash
npm install
npm start
```

---

## Bot Commands

| Command | Description |
|---|---|
| `/watch PEPE` | Alert when a token named exactly PEPE launches |
| `/watchcontains PEPE` | Alert when any token with PEPE in the name launches (e.g. PEPEKING) |
| `/list` | View your watchlist |
| `/remove PEPE` | Remove from watchlist |
| `/clear` | Clear entire watchlist |

---

## Alert Format

```
🚨 MATCH FOUND — PEPE

◎ Chain: Solana
🏷 Name: Pepe Coin
⚡ Symbol: PEPE
🏦 DEX: Raydium
💧 Liquidity: $12,500

📋 <contract_address>

🔗 DexScreener | DexTools
```

---

## Hosting (keep it running 24/7)

### Option A — Railway (easiest, free tier)
1. Push to GitHub
2. Connect repo on [railway.app](https://railway.app)
3. Add env variables in the Railway dashboard
4. Deploy

### Option B — VPS (most reliable)
```bash
# Install pm2 for process management
npm install -g pm2

# Start bot
pm2 start index.js --name scanner-bot

# Auto-restart on reboot
pm2 startup
pm2 save
```

Cheapest options: **Hetzner CX11** (~€4/mo) or **DigitalOcean Droplet** (~$6/mo)

---

## Architecture

```
index.js
├── src/telegram.js      — Bot commands + alert sender
├── src/scanner.js       — Main scan loop (runs all scanners)
├── src/dexscreener.js   — DexScreener API polling (primary)
├── src/base.js          — Base chain on-chain via ethers.js
├── src/solana.js        — Solana on-chain via Helius
└── src/db.js            — SQLite watchlist + seen pairs
```

---

## Scan methods

| Method | Chains | Latency | Requires |
|---|---|---|---|
| DexScreener polling | Solana + Base | ~30-60s after launch | Nothing |
| Base on-chain | Base | ~5-15s after block | Public RPC |
| Solana on-chain | Solana | ~5-20s after tx | Helius API key |

For the fastest alerts, use all three methods together.
