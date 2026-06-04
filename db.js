const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'watchlist.db');

let db;

function init() {
  const fs = require('fs');
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term TEXT NOT NULL COLLATE NOCASE,
      match_type TEXT NOT NULL DEFAULT 'exact',
      added_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_term ON watchlist(term COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS seen_pairs (
      pair_address TEXT PRIMARY KEY,
      chain TEXT NOT NULL,
      token_name TEXT,
      token_symbol TEXT,
      alerted INTEGER NOT NULL DEFAULT 0,
      seen_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
  `);

  return Promise.resolve();
}

function addWatch(term, matchType = 'exact') {
  try {
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO watchlist (term, match_type) VALUES (?, ?)`
    );
    const result = stmt.run(term.toUpperCase().trim(), matchType);
    return result.changes > 0;
  } catch {
    return false;
  }
}

function removeWatch(term) {
  const stmt = db.prepare(`DELETE FROM watchlist WHERE term = ? COLLATE NOCASE`);
  const result = stmt.run(term.trim());
  return result.changes > 0;
}

function getWatchlist() {
  return db.prepare(`SELECT * FROM watchlist ORDER BY added_at DESC`).all();
}

function matchesWatchlist(name, symbol) {
  const watchlist = getWatchlist();
  const nameUpper = (name || '').toUpperCase();
  const symbolUpper = (symbol || '').toUpperCase();

  for (const entry of watchlist) {
    const term = entry.term.toUpperCase();

    if (entry.match_type === 'exact') {
      if (nameUpper === term || symbolUpper === term) return entry;
    } else if (entry.match_type === 'contains') {
      if (nameUpper.includes(term) || symbolUpper.includes(term)) return entry;
    }
  }
  return null;
}

function hasSeen(pairAddress) {
  const row = db.prepare(`SELECT 1 FROM seen_pairs WHERE pair_address = ?`).get(pairAddress);
  return !!row;
}

function markSeen(pairAddress, chain, tokenName, tokenSymbol, alerted = false) {
  db.prepare(`
    INSERT OR IGNORE INTO seen_pairs (pair_address, chain, token_name, token_symbol, alerted)
    VALUES (?, ?, ?, ?, ?)
  `).run(pairAddress, chain, tokenName, tokenSymbol, alerted ? 1 : 0);
}

function clearWatchlist() {
  db.prepare(`DELETE FROM watchlist`).run();
}

module.exports = {
  init,
  addWatch,
  removeWatch,
  getWatchlist,
  matchesWatchlist,
  hasSeen,
  markSeen,
  clearWatchlist,
};
