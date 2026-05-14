import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    console.log('Columns in users table:');
    res.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();
