'use strict';

require('dotenv/config');

const mongoose = require('mongoose');
const config = require('../config');
const { Document } = require('../models/Document');

function parseSizeToBytes(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;

  const match = value.trim().match(/^([\d.]+)\s*(B|KB|MB|GB)?$/i);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount < 0) return null;

  const unit = (match[2] || 'B').toUpperCase();
  const multipliers = {
    B: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };

  return Math.round(amount * (multipliers[unit] || 1));
}

async function main() {
  await mongoose.connect(config.db.uri);

  const documents = await Document.collection.find({ size: { $type: 'string' } }).toArray();
  let updated = 0;
  let skipped = 0;

  for (const doc of documents) {
    const bytes = parseSizeToBytes(doc.size);
    if (bytes == null) {
      skipped += 1;
      console.warn('[Migration] Skipped document with invalid size', {
        documentId: doc._id,
        size: doc.size,
      });
      continue;
    }

    await Document.collection.updateOne({ _id: doc._id }, { $set: { size: bytes } });
    updated += 1;
  }

  console.log(`[Migration] Document size migration complete. updated=${updated} skipped=${skipped}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('[Migration] Document size migration failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
