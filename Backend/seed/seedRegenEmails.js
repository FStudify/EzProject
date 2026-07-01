'use strict';

/**
 * ============================================================
 * Regen Emails — Cap nhat gmail ngau nhien cho 100 user
 * Run: node seed/seedRegenEmails.js
 * ============================================================
 */

require('dotenv/config');
const mongoose = require('mongoose');
const User = require('../models/User');

// ── DIACRITICS REMOVER ──────────────────────────────────────────────────────

const DIACRITICS_MAP = {
  à: 'a', á: 'a', ả: 'a', ã: 'a', ạ: 'a', ă: 'a', ắ: 'a', ằ: 'a', ẳ: 'a', ẵ: 'a', ặ: 'a',
  à: 'a', á: 'a', â: 'a', ầ: 'a', ấ: 'a', ậ: 'a', ẩ: 'a', ẫ: 'a',
  è: 'e', é: 'e', ẻ: 'e', ẽ: 'e', ẹ: 'e', ê: 'e', ề: 'e', ế: 'e', ể: 'e', ễ: 'e', ệ: 'e',
  ì: 'i', í: 'i', ỉ: 'i', ĩ: 'i', ị: 'i',
  ò: 'o', ó: 'o', ỏ: 'o', õ: 'o', ọ: 'o', ô: 'o', ồ: 'o', ố: 'o', ổ: 'o', ỗ: 'o', ộ: 'o',
  ơ: 'o', ờ: 'o', ớ: 'o', ở: 'o', ỡ: 'o', ợ: 'o',
  ù: 'u', ú: 'u', ủ: 'u', ũ: 'u', ụ: 'u', ư: 'u', ừ: 'u', ứ: 'u', ử: 'u', ữ: 'u', ự: 'u',
  ỳ: 'y', ý: 'y', ỷ: 'y', ỹ: 'y', ỵ: 'y',
  đ: 'd',
  À: 'a', Á: 'a', Ả: 'a', Ã: 'a', Ạ: 'a', Ă: 'a', Ắ: 'a', Ằ: 'a', Ẳ: 'a', Ẵ: 'a', Ặ: 'a',
  Â: 'a', Ầ: 'a', Ấ: 'a', Ẩ: 'a', Ẫ: 'a', Ậ: 'a',
  È: 'e', É: 'e', Ẻ: 'e', Ẽ: 'e', Ẹ: 'e', Ê: 'e', Ề: 'e', Ế: 'e', Ể: 'e', Ễ: 'e', Ệ: 'e',
  Ì: 'i', Í: 'i', Ỉ: 'i', Ĩ: 'i', Ị: 'i',
  Ô: 'o', Ồ: 'o', Ố: 'o', Ổ: 'o', Ỗ: 'o', Ộ: 'o',
  Ơ: 'o', Ờ: 'o', Ớ: 'o', Ở: 'o', Ỡ: 'o', Ợ: 'o',
  Ù: 'u', Ú: 'u', Ủ: 'u', Ũ: 'u', Ụ: 'u', Ư: 'u', Ừ: 'u', Ứ: 'u', Ử: 'u', Ữ: 'u', Ự: 'u',
  Ỳ: 'y', Ý: 'y', Ỷ: 'y', Ỹ: 'y', Ỵ: 'y', Đ: 'd',
};

function toSlug(str) {
  return str
    .split('')
    .map((ch) => DIACRITICS_MAP[ch] ?? ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// ── HELPERS ─────────────────────────────────────────────────────────────────

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }

// ── EMAIL TEMPLATES ─────────────────────────────────────────────────────────

const NICKS_CASUAL = [
  'cute', 'kute', 'cuti', 'pro', 'z', 'hot', 'cool', 'vip', 'star', 'meo',
  'ngoc', 'bach', 'khoi', 'huy', 'fun', 'happy', 'smile', 'sun', 'moon', 'fire',
  'ice', 'blitz', 'storm', 'shadow', 'ninja', 'king', 'ace', 'boss', 'god', 'hero',
  'queen', 'bunny', 'panda', 'cat', 'dog', 'lion', 'wolf', 'bear', 'fox', 'angel',
  'devil', 'blaze', 'nova', 'cyber', 'pixel', 'void', 'zero', 'sigma', 'omega',
  'alpha', 'prime', 'ultra', 'mega', 'super', 'joker', 'badboy', 'goodboy', 'hater',
  'lover', 'fighter', 'hunter', 'ghost', 'spirit', 'phoenix', 'dragon', 'tiger', 'shark',
  'beat', 'flow', 'wave', 'rain', 'snow', 'wind', 'sky', 'dream', 'soul', 'glitch',
  'kpop', 'vpop', 'game', 'gaming', 'stream', 'live', 'edit', 'dev', 'it', 'code',
];

const NICKS_FORMAL = [
  'dev', 'pro', 'tech', 'it', 'work', 'job', 'boss', 'me', 'guru', 'admin',
];

const NICKS_WORK = [
  'dev', 'design', 'marketing', 'data', 'it', 'media', 'content', 'sale', 'test',
  'analyst', 'engineer', 'leader', 'tech', 'coder', 'hr', 'qa', 'pm', 'product',
  'growth', 'ux', 'ui', 'frontend', 'backend', 'mobile', 'cloud', 'ai', 'seo',
  'ads', 'creative', 'strategy', 'coach', 'support', 'ops', 'ecom', 'social',
  'pr', 'writer', 'editor', 'video', 'photo', 'graphic', 'manage', 'consult',
];

const SEPARATORS = ['', '.', '_', '-'];

// ── EMAIL GENERATORS ────────────────────────────────────────────────────────

function genEmailFormal(s) {
  const sep = pick(SEPARATORS);
  const n1 = pick(NICKS_FORMAL);
  const n2 = pick(NICKS_FORMAL);
  const roll = rand(1, 100);

  if (roll <= 20) return `${s}${sep}${rand(10, 99)}@gmail.com`;
  if (roll <= 40) return `${s}${sep}${n1}@gmail.com`;
  if (roll <= 60) return `${s}${sep}${n1}${rand(1, 9)}@gmail.com`;
  if (roll <= 75) return `${n1}${sep}${s}@gmail.com`;
  if (roll <= 85) return `${n1}${sep}${n2}@gmail.com`;
  return `${s}${sep}${n1}${n2}@gmail.com`;
}

function genEmailCasual(s) {
  const sep = pick(SEPARATORS);
  const n = pick(NICKS_CASUAL);
  const roll = rand(1, 100);

  if (roll <= 15) return `${n}${rand(1, 99)}@gmail.com`;
  if (roll <= 30) return `${s}${sep}${n}@gmail.com`;
  if (roll <= 45) return `${n}${sep}${s}@gmail.com`;
  if (roll <= 60) return `${s}${sep}${n}${rand(0, 9)}@gmail.com`;
  if (roll <= 72) return `${s}${rand(10, 99)}${n}@gmail.com`;
  if (roll <= 82) return `${n}${sep}${s}${rand(1, 9)}@gmail.com`;
  if (roll <= 90) return `${s}${sep}${n}${sep}${rand(1, 9)}@gmail.com`;
  return `${n}${rand(10, 99)}${s}@gmail.com`;
}

function genEmailWork(s) {
  const sep = pick(SEPARATORS);
  const r = pick(NICKS_WORK);
  const roll = rand(1, 100);

  if (roll <= 20) return `${r}${sep}${s}@gmail.com`;
  if (roll <= 40) return `${s}${sep}${r}@gmail.com`;
  if (roll <= 55) return `${r}${sep}${s}${rand(1, 9)}@gmail.com`;
  if (roll <= 68) return `${s}${rand(10, 99)}${r}@gmail.com`;
  if (roll <= 80) return `${r}${rand(10, 99)}${s}@gmail.com`;
  if (roll <= 90) return `${r}${sep}${s}${sep}${rand(1, 9)}@gmail.com`;
  return `${r}${sep}${rand(10, 99)}${s}@gmail.com`;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ezproject');
  console.log('[MongoDB] Connected');

  const users = await User.find({ role: 'CUSTOMER' }).lean();
  if (users.length === 0) { console.error('No CUSTOMER users found.'); process.exit(1); }

  console.log(`\n[Email] Regenerating emails for ${users.length} users...`);

  const seenEmails = new Set();
  const seenUsernames = new Set();
  const slugToName = {};

  const bulkOps = users.map((user) => {
    // Build slug versions of each name part
    const parts = user.fullName.trim().split(/\s+/);
    const lastName = toSlug(parts[parts.length - 1] || '');
    const firstName = toSlug(parts[0] || '');
    const midName = parts.length > 2 ? toSlug(parts[1] || '') : '';

    // Create lookup keys for this user
    const slugFull = toSlug(user.fullName);
    const slugBase = `${firstName}${midName}${lastName}`; // nguyennamvietson
    const slugShort = `${firstName}${lastName}`;           // nguyenbao

    // Pick style: 35% formal, 35% casual, 30% work
    const roll = Math.random();
    let email;
    let username;

    if (roll < 0.35) {
      // ── FORMAL: nguyennamvietson, nam.dev5, mr.viet
      const templates = [
        `${firstName}${midName}${lastName}`,
        `${firstName}${lastName}`,
        `${firstName}${midName[0] || ''}${lastName}`,
        `${midName}${lastName}`,
        `${lastName}${firstName[0]}`,
        `mr${firstName[0]}${lastName}`,
      ];
      email = genEmailFormal(pick(templates));
      username = `${firstName}${pick(NICKS_FORMAL)}${rand(1, 9)}`;
    } else if (roll < 0.70) {
      // ── CASUAL: cutekhanh99, namkpop8, god47
      const templates = [
        `${firstName}${pick(NICKS_CASUAL)}`,
        `${lastName}${pick(NICKS_CASUAL)}`,
        `${midName}${pick(NICKS_CASUAL)}`,
        `${firstName}${midName[0] || ''}${pick(NICKS_CASUAL)}`,
      ];
      email = genEmailCasual(pick(templates));
      username = `${firstName}${pick(NICKS_CASUAL)}${rand(0, 99)}`;
    } else {
      // ── WORK: nam.dev5, devnam04, nam.data
      const templates = [
        `${firstName}${pick(NICKS_WORK)}`,
        `${lastName}${pick(NICKS_WORK)}`,
        `${midName}${pick(NICKS_WORK)}`,
        `${firstName}${midName[0] || ''}${pick(NICKS_WORK)}`,
      ];
      email = genEmailWork(pick(templates));
      username = `${firstName}${pick(NICKS_WORK)}${rand(1, 9)}`;
    }

    // ── Ensure uniqueness ───────────────────────────────────────────────
    let attempt = 0;
    while (seenEmails.has(email.toLowerCase()) && attempt < 50) {
      const base = email.split('@')[0];
      email = `${base}${rand(10, 99)}@gmail.com`;
      attempt++;
    }
    while (seenUsernames.has(username.toLowerCase()) && attempt < 50) {
      username = `${username}${rand(10, 99)}`;
      attempt++;
    }

    seenEmails.add(email.toLowerCase());
    seenUsernames.add(username.toLowerCase());
    slugToName[user._id.toString()] = { email, username, style: roll < 0.35 ? '📋' : roll < 0.70 ? '😎' : '💼' };

    return {
      updateOne: {
        filter: { _id: user._id },
        update: { $set: { email: email.toLowerCase(), username: username.toLowerCase() } },
      },
    };
  });

  const result = await User.bulkWrite(bulkOps);
  console.log(`[Email] ✓ Updated ${result.modifiedCount} users`);

  // ── Show sample ─────────────────────────────────────────────────────────
  console.log('\n[Email] Sample (first 20):');
  const sample = await User.find({ role: 'CUSTOMER' }).limit(20).lean();
  sample.forEach((u) => {
    const info = slugToName[u._id.toString()] || { style: '❓', email: u.email, username: u.username };
    console.log(`  ${info.style} ${u.fullName.padEnd(24)} → ${info.email.padEnd(38)} | ${info.username}`);
  });

  console.log('\n[Done]\n');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
