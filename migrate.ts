
import mysql from "mysql2/promise";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

// Bypass SSL verification for migration
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const mysqlConfig: any = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: parseInt(process.env.MYSQL_PORT || "3306"),
  ssl: process.env.MYSQL_SSL === "false" ? false : { rejectUnauthorized: false },
};

const pgUrl = process.env.DATABASE_URL || process.env.PGHOST || "";
const isConnectionString = pgUrl.startsWith("postgres://") || pgUrl.startsWith("postgresql://");
const TABLE_PREFIX = "v_";

let pgConfig: any;

if (isConnectionString) {
  pgConfig = {
    connectionString: pgUrl,
    ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
  };
} else {
  pgConfig = {
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: parseInt(process.env.PGPORT || "5432"),
    ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
  };
}

async function migrate() {
  console.log("Starting migration from MySQL to PostgreSQL...");
  console.log("Using Table Prefix:", TABLE_PREFIX);

  let mysqlConn;
  let pgClient;

  try {
    mysqlConn = await mysql.createConnection(mysqlConfig);
    console.log("Connected to MySQL.");

    pgClient = new pg.Client(pgConfig);
    await pgClient.connect();
    console.log("Connected to PostgreSQL.");

    // 1. Create Tables in PostgreSQL
    console.log("Creating tables in PostgreSQL...");

    const appTables = ["vehicles", "service_history", "system_updates", "upcoming_services", "vehicle_images"];
    const commonTables = ["users"];
    
    // Create Tables with prefix
    await pgClient.query(`CREATE TABLE IF NOT EXISTS ${TABLE_PREFIX}vehicles (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, license_plate VARCHAR(50) NOT NULL, status TEXT CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active', next_service_date VARCHAR(50), next_service_odometer INT DEFAULT 0, current_odometer INT DEFAULT 0, image_url TEXT, engine_no VARCHAR(255), chassis_no VARCHAR(255), registration_date VARCHAR(50), insurance_expiry VARCHAR(50), insurance_policy_no VARCHAR(255), revenue_license_expiry VARCHAR(50), revenue_license_region VARCHAR(100), ownership VARCHAR(255), is_transferred BOOLEAN DEFAULT FALSE, is_deleted BOOLEAN DEFAULT FALSE)`);

    await pgClient.query(`CREATE TABLE IF NOT EXISTS ${TABLE_PREFIX}service_history (id SERIAL PRIMARY KEY, vehicle_id INT, date VARCHAR(50) NOT NULL, odometer INT, title VARCHAR(255), description TEXT, type TEXT CHECK (type IN ('Full Service', 'Tire Rotation', 'Oil Change', 'Brake Overhaul', 'Battery Replacement')), cost DECIMAL(10, 2), parts TEXT, labor_cost DECIMAL(10, 2), is_deleted BOOLEAN DEFAULT FALSE)`);

    await pgClient.query(`CREATE TABLE IF NOT EXISTS ${TABLE_PREFIX}system_updates (id SERIAL PRIMARY KEY, message TEXT NOT NULL, is_new BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, is_deleted BOOLEAN DEFAULT FALSE)`);

    await pgClient.query(`CREATE TABLE IF NOT EXISTS ${TABLE_PREFIX}upcoming_services (id SERIAL PRIMARY KEY, vehicle_id INT NOT NULL, title VARCHAR(255) NOT NULL, description TEXT, due_date VARCHAR(50), due_odometer INT, priority TEXT CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium', status TEXT CHECK (status IN ('Pending', 'Completed')) DEFAULT 'Pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, is_deleted BOOLEAN DEFAULT FALSE)`);

    await pgClient.query(`CREATE TABLE IF NOT EXISTS ${TABLE_PREFIX}vehicle_images (id SERIAL PRIMARY KEY, vehicle_id INT NOT NULL, topic VARCHAR(255) NOT NULL, description TEXT, image_url TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, is_deleted BOOLEAN DEFAULT FALSE)`);

    // Users table - Common table, check and add missing columns if it exists
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user'
      )
    `);

    // Add missing columns to existing users table (same logic as server.ts)
    const columnsToAdd = [
      { name: 'id', type: 'SERIAL' },
      { name: 'email', type: 'VARCHAR(255) UNIQUE' },
      { name: 'profile_image_url', type: 'TEXT' },
      { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'is_deleted', type: 'BOOLEAN DEFAULT FALSE' }
    ];

    for (const col of columnsToAdd) {
      try {
        const { rows: colExists } = await pgClient.query(`
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = $1
        `, [col.name]);

        if (colExists.length === 0) {
          await pgClient.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        }
      } catch (err) {
        console.log(`Note: Could not add column ${col.name} to users:`, err instanceof Error ? err.message : err);
      }
    }

    // 2. Migrate Data
    const allTables = [...appTables, ...commonTables];

    for (const table of allTables) {
      const destTable = appTables.includes(table) ? `${TABLE_PREFIX}${table}` : table;
      console.log(`Migrating table: ${table} -> ${destTable}...`);
      
      const [rows]: any = await mysqlConn.query("SELECT * FROM `" + table + "`");
      
      if (rows.length === 0) {
        console.log("Table " + table + " is empty.");
        continue;
      }

      const columns = Object.keys(rows[0]);
      const placeholders = columns.map((_, i) => "$" + (i + 1)).join(", ");
      const insertQuery = "INSERT INTO " + destTable + " (" + columns.join(", ") + ") VALUES (" + placeholders + ") ON CONFLICT DO NOTHING";

      for (const row of rows) {
        const values = columns.map(col => {
          const val = row[col];
          // Convert MySQL boolean (0/1) to PostgreSQL boolean
          if (typeof val === "number" && (col.startsWith("is_") || col === "is_new")) {
            return val === 1;
          }
          return val;
        });
        await pgClient.query(insertQuery, values);
      }
      console.log("Migrated " + rows.length + " rows to " + destTable + ".");
    }

    console.log("Migration completed successfully!");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    if (mysqlConn) await mysqlConn.end();
    if (pgClient) await pgClient.end();
  }
}

migrate();
