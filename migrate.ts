
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

const pgHost = process.env.PGHOST || "";
const isConnectionString = pgHost.startsWith("postgres://") || pgHost.startsWith("postgresql://");

let pgConfig: any;

if (isConnectionString) {
  pgConfig = {
    connectionString: pgHost,
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

    const tablesToDrop = ["vehicles", "service_history", "system_updates", "upcoming_services", "vehicle_images", "users"];
    for (const table of tablesToDrop) {
      await pgClient.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }

    await pgClient.query("CREATE TABLE IF NOT EXISTS vehicles (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, license_plate VARCHAR(50) NOT NULL, status TEXT CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active', next_service_date VARCHAR(50), next_service_odometer INT DEFAULT 0, current_odometer INT DEFAULT 0, image_url TEXT, engine_no VARCHAR(255), chassis_no VARCHAR(255), registration_date VARCHAR(50), insurance_expiry VARCHAR(50), insurance_policy_no VARCHAR(255), revenue_license_expiry VARCHAR(50), revenue_license_region VARCHAR(100), ownership VARCHAR(255), is_transferred BOOLEAN DEFAULT FALSE, is_deleted BOOLEAN DEFAULT FALSE)");

    await pgClient.query("CREATE TABLE IF NOT EXISTS service_history (id SERIAL PRIMARY KEY, vehicle_id INT, date VARCHAR(50) NOT NULL, odometer INT, title VARCHAR(255), description TEXT, type TEXT CHECK (type IN ('Full Service', 'Tire Rotation', 'Oil Change', 'Brake Overhaul', 'Battery Replacement')), cost DECIMAL(10, 2), parts TEXT, labor_cost DECIMAL(10, 2), is_deleted BOOLEAN DEFAULT FALSE)");

    await pgClient.query("CREATE TABLE IF NOT EXISTS system_updates (id SERIAL PRIMARY KEY, message TEXT NOT NULL, is_new BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, is_deleted BOOLEAN DEFAULT FALSE)");

    await pgClient.query("CREATE TABLE IF NOT EXISTS upcoming_services (id SERIAL PRIMARY KEY, vehicle_id INT NOT NULL, title VARCHAR(255) NOT NULL, description TEXT, due_date VARCHAR(50), due_odometer INT, priority TEXT CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium', status TEXT CHECK (status IN ('Pending', 'Completed')) DEFAULT 'Pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, is_deleted BOOLEAN DEFAULT FALSE)");

    await pgClient.query("CREATE TABLE IF NOT EXISTS vehicle_images (id SERIAL PRIMARY KEY, vehicle_id INT NOT NULL, topic VARCHAR(255) NOT NULL, description TEXT, image_url TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, is_deleted BOOLEAN DEFAULT FALSE)");

    await pgClient.query("CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, role TEXT CHECK (role IN ('admin', 'user')) DEFAULT 'user', profile_image_url TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, is_deleted BOOLEAN DEFAULT FALSE)");

    // 2. Migrate Data
    const tables = ["vehicles", "service_history", "system_updates", "upcoming_services", "vehicle_images", "users"];

    for (const table of tables) {
      console.log("Migrating table: " + table + "...");
      const [rows]: any = await mysqlConn.query("SELECT * FROM `" + table + "`");
      
      if (rows.length === 0) {
        console.log("Table " + table + " is empty.");
        continue;
      }

      const columns = Object.keys(rows[0]);
      const placeholders = columns.map((_, i) => "$" + (i + 1)).join(", ");
      const insertQuery = "INSERT INTO " + table + " (" + columns.join(", ") + ") VALUES (" + placeholders + ") ON CONFLICT DO NOTHING";

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
      console.log("Migrated " + rows.length + " rows from " + table + ".");
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
