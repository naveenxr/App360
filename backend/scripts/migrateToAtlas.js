/**
 * Non-destructive, idempotent MongoDB -> MongoDB Atlas migration utility.
 * Uses natural unique keys with $setOnInsert so existing Atlas documents are never
 * dropped or overwritten, and remaps user roleIds cleanly if Atlas roles already exist
 * under different ObjectIds.
 *
 * Usage:
 *   $env:TARGET_MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>/app360?retryWrites=true&w=majority"
 *   node scripts/migrateToAtlas.js
 */
const { MongoClient } = require('mongoose').mongo;

const SOURCE_URI = process.env.SOURCE_MONGODB_URI || 'mongodb://127.0.0.1:27017/app360';
const TARGET_URI = (process.env.TARGET_MONGODB_URI || process.argv[2] || '').trim();
const BATCH_SIZE = 500;

const maskUri = (uri) => {
  try {
    return uri.replace(/\/\/(.*?)@/, '//***:***@');
  } catch {
    return '***';
  }
};

const getFilterForCollection = (name, doc) => {
  switch (name) {
    case 'roles':
      return { name: doc.name };
    case 'users':
      return { email: doc.email };
    case 'sites':
      return { siteId: doc.siteId };
    case 'devices':
      return { deviceId: doc.deviceId };
    case 'events':
      return { eventId: doc.eventId };
    case 'alarms':
      return { sourceId: doc.sourceId, externalAlarmId: doc.externalAlarmId };
    default:
      return { _id: doc._id };
  }
};

async function copyIndexes(srcCol, dstCol, name) {
  const indexes = await srcCol.indexes();
  for (const idx of indexes) {
    if (idx.name === '_id_') continue;
    const { key, ...opts } = idx;
    delete opts.v;
    delete opts.ns;
    try {
      await dstCol.createIndex(key, opts);
    } catch (idxErr) {
      if (idxErr.codeName !== 'IndexOptionsConflict' && idxErr.codeName !== 'IndexKeySpecsConflict') {
        console.warn(`   ⚠️ Index [${idx.name}] on [${name}]: ${idxErr.message}`);
      }
    }
  }
}

async function migrate() {
  if (!TARGET_URI) {
    console.error('❌ TARGET_MONGODB_URI is required.');
    process.exit(1);
  }

  if (/127\.0\.0\.1|localhost/i.test(TARGET_URI) && !process.env.ALLOW_LOCAL_TARGET) {
    console.error('❌ Refusing to migrate: TARGET_MONGODB_URI points to localhost/127.0.0.1.');
    process.exit(1);
  }

  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI, { serverSelectionTimeoutMS: 10000 });

  try {
    console.log(`🔌 Connecting to source: ${maskUri(SOURCE_URI)}`);
    await sourceClient.connect();

    console.log(`☁️  Connecting to target Atlas: ${maskUri(TARGET_URI)}`);
    await targetClient.connect();

    const sourceDb = sourceClient.db();
    const targetDb = targetClient.db();

    const available = (await sourceDb.listCollections().toArray())
      .map((c) => c.name)
      .filter((n) => !n.startsWith('system.'));

    // Migrate roles first so we can map local roleIds -> Atlas roleIds accurately
    const preferredOrder = ['roles', 'users', 'sites', 'devices', 'rawalarmpayloads', 'alarms', 'events', 'ingestionlogs', 'auditlogs'];
    const orderedNames = [
      ...preferredOrder.filter((n) => available.includes(n)),
      ...available.filter((n) => !preferredOrder.includes(n))
    ];

    console.log(`📦 Migrating ${orderedNames.length} collections from [${sourceDb.databaseName}]...\n`);

    const roleIdMap = new Map();

    for (const name of orderedNames) {
      const srcCol = sourceDb.collection(name);
      const dstCol = targetDb.collection(name);

      // Before migrating users, build localRoleId -> targetRoleId map by role name
      if (name === 'users') {
        const srcRoles = await sourceDb.collection('roles').find({}).toArray();
        const dstRoles = await targetDb.collection('roles').find({}).toArray();
        const dstByName = new Map(dstRoles.map((r) => [r.name, r._id]));
        for (const r of srcRoles) {
          const targetId = dstByName.get(r.name);
          if (targetId) {
            roleIdMap.set(r._id.toString(), targetId);
          }
        }
      }

      const total = await srcCol.countDocuments();
      let insertedCount = 0;
      let matchedExistingCount = 0;

      if (total > 0) {
        const cursor = srcCol.find({});
        let batch = [];

        const flushBatch = async (docs) => {
          if (docs.length === 0) return;
          const ops = docs.map((rawDoc) => {
            const doc = { ...rawDoc };
            if (name === 'users' && doc.roleId) {
              const mappedRoleId = roleIdMap.get(doc.roleId.toString());
              if (mappedRoleId) {
                doc.roleId = mappedRoleId;
              }
            }
            return {
              updateOne: {
                filter: getFilterForCollection(name, doc),
                update: { $setOnInsert: doc },
                upsert: true
              }
            };
          });
          const res = await dstCol.bulkWrite(ops, { ordered: false });
          insertedCount += res.upsertedCount || 0;
          matchedExistingCount += res.matchedCount || 0;
        };

        while (await cursor.hasNext()) {
          batch.push(await cursor.next());
          if (batch.length >= BATCH_SIZE) {
            await flushBatch(batch);
            batch = [];
          }
        }
        await flushBatch(batch);
      }

      await copyIndexes(srcCol, dstCol, name);

      const targetTotal = await dstCol.countDocuments();
      console.log(
        `✅ ${name.padEnd(20)} | source: ${String(total).padStart(5)} | inserted: ${String(insertedCount).padStart(5)} | skipped existing: ${String(matchedExistingCount).padStart(5)} | target total: ${targetTotal}`
      );
    }

    console.log('\n🎉 Non-destructive Atlas migration completed.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

migrate();
