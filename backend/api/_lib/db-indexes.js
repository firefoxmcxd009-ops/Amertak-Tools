const { getDb } = require('./db');

async function ensureIndexes() {
  try {
    const db = await getDb();

    await db.collection('users').createIndex({ email: 1 }, { unique: true, background: true });
    await db.collection('users').createIndex({ createdAt: -1 }, { background: true });

    await db.collection('images').createIndex({ userId: 1 }, { background: true });
    await db.collection('images').createIndex({ uploadedAt: -1 }, { background: true });

    await db.collection('shared_files').createIndex({ userId: 1 }, { background: true });
    await db.collection('shared_files').createIndex({ uploadedAt: -1 }, { background: true });
    await db.collection('shared_files').createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, background: true, partialFilterExpression: { expiresAt: { $type: 'date' } } }
    );

    console.log('Database indexes ensured');
  } catch (error) {
    console.warn('Could not create database indexes:', error.message);
  }
}

module.exports = { ensureIndexes };
