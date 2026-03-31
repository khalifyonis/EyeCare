import 'dotenv/config';
import pg from 'pg';

const getConnForDb = (dbName) => {
  const base = process.env.DATABASE_URL;
  if (!base) return { database: dbName };

  const url = new URL(base);
  if (dbName) url.pathname = `/${dbName}`;
  return { connectionString: url.toString() };
};

const tryQuery = async (client, sql, params = []) => {
  try {
    return await client.query(sql, params);
  } catch {
    return null;
  }
};

const connectAny = async () => {
  const targets = [undefined, 'postgres', 'template1'];
  for (const database of targets) {
    const opts = database ? getConnForDb(database) : getConnForDb(undefined);
    const client = new pg.Client(opts);
    try {
      await client.connect();
      return client;
    } catch {
      try {
        await client.end();
      } catch {
        // ignore
      }
    }
  }
  throw new Error(
    'Could not connect to Postgres with default settings. Set DATABASE_URL (or PGHOST/PGUSER/PGPASSWORD/PGDATABASE) and retry.'
  );
};

const summarize = (rows) =>
  rows.map((r) => ({
    username: r.username,
    email: r.email,
    created_at: r.created_at,
  }));

const main = async () => {
  const adminClient = await connectAny();

  const dbsRes = await adminClient.query(
    "select datname from pg_database where datistemplate=false order by datname"
  );
  const dbs = dbsRes.rows.map((r) => r.datname);

  const results = [];

  for (const dbName of dbs) {
    const c = new pg.Client(getConnForDb(dbName));
    try {
      await c.connect();

      const regRes = await tryQuery(c, "select to_regclass('public.users') as t");
      const reg = regRes?.rows?.[0]?.t;
      if (!reg) continue;

      const countRes = await c.query('select count(*)::int as c from public.users');
      const count = countRes.rows?.[0]?.c ?? 0;

      const sampleRes = await tryQuery(
        c,
        'select username, email, created_at from public.users order by created_at asc limit 8'
      );

      results.push({
        dbName,
        count,
        sample: sampleRes?.rows ? summarize(sampleRes.rows) : [],
      });
    } catch {
      // ignore DBs we cannot access
    } finally {
      try {
        await c.end();
      } catch {
        // ignore
      }
    }
  }

  try {
    await adminClient.end();
  } catch {
    // ignore
  }

  console.log(JSON.stringify(results, null, 2));
};

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
