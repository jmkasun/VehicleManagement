console.log("Server.ts: Starting execution");
import express from "express";
import path from "path";
import dotenv from "dotenv";

import pg from "pg";
const { Pool } = pg;

console.log("Server.ts: Base imports completed");

try {
  dotenv.config();
} catch (e) {
  console.error("Error loading .env file:", e);
}

// Bypass SSL verification for database connections (Aiven/Managed DBs)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = 3000;

// Table Prefix for app-specific tables
const TABLE_PREFIX = "v_";

// Table names with prefix
const T_VEHICLES = `${TABLE_PREFIX}vehicles`;
const T_SERVICE_HISTORY = `${TABLE_PREFIX}service_history`;
const T_SYSTEM_UPDATES = `${TABLE_PREFIX}system_updates`;
const T_UPCOMING_SERVICES = `${TABLE_PREFIX}upcoming_services`;
const T_VEHICLE_IMAGES = `${TABLE_PREFIX}vehicle_images`;
const T_USERS = `users`; // Common table, no prefix

// Simple ping route for Vercel health checks - MOVED TO TOP
app.get("/api/ping", (req, res) => {
  console.log("Ping request received");
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL
  });
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// PostgreSQL Connection Pool
let pool: pg.Pool | null = null;
let lastInitError: string | null = null;
let isInitializing = false;
let isInitialized = false;

async function getPool() {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL || process.env.PGHOST || "";
    const isConnectionString = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");
    
    console.log("Initializing database pool with host:", isConnectionString ? "CONNECTION_STRING" : dbUrl);
    
    let config: any;
    
    if (isConnectionString) {
      config = {
        connectionString: dbUrl,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };
    } else {
      config = {
        host: process.env.PGHOST,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        port: parseInt(process.env.PGPORT || "5432"),
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      };
    }

    // SSL Configuration - Aiven and many other managed DBs require SSL
    // We default to SSL if not explicitly disabled or if it's a known managed host
    const useSsl = process.env.PGSSL !== 'false' && 
                   (process.env.PGSSL === 'true' || 
                    dbUrl.includes('aivencloud.com') || 
                    dbUrl.includes('amazonaws.com') ||
                    dbUrl.includes('elephantsql.com') ||
                    isConnectionString);

    if (useSsl) {
      config.ssl = {
        rejectUnauthorized: false,
      };
      console.log("SSL enabled for database connection (rejectUnauthorized: false)");
    } else {
      console.log("SSL disabled for database connection");
    }

    console.log("Database config check:", {
      isConnectionString,
      host: !!(isConnectionString ? config.connectionString : config.host),
      user: !!(isConnectionString ? true : config.user),
      password: !!(isConnectionString ? true : config.password),
      database: !!(isConnectionString ? true : config.database),
      port: isConnectionString ? "from string" : config.port,
      ssl: !!config.ssl,
      sslEnv: process.env.PGSSL,
      nodeTlsRejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED
    });

    if (!isConnectionString) {
      const missing = [];
      if (!config.host) missing.push("PGHOST");
      if (!config.user) missing.push("PGUSER");
      if (!config.password) missing.push("PGPASSWORD");
      if (!config.database) missing.push("PGDATABASE");

      if (missing.length > 0) {
        const msg = `PostgreSQL configuration is incomplete. Missing: ${missing.join(", ")}. API routes will fail.`;
        console.warn(msg);
        lastInitError = msg;
        return null;
      }
    } else if (!config.connectionString) {
      const msg = "PostgreSQL connection string is empty. API routes will fail.";
      console.warn(msg);
      lastInitError = msg;
      return null;
    }

    pool = new Pool(config);
  }
  return pool;
}

async function startKeepAlive() {
  if ((global as any).keepAliveStarted) return;
  (global as any).keepAliveStarted = true;

  console.log("Database keep-alive task started (every 1 hour)");
  
  // Initial ping
  try {
    const dbPool = await getPool();
    if (dbPool) {
      await dbPool.query("SELECT 1");
      console.log("Initial keep-alive ping successful");
    }
  } catch (e) {
    console.error("Initial keep-alive ping failed:", e);
  }

  setInterval(async () => {
    try {
      const dbPool = await getPool();
      if (dbPool) {
        const { rows }: any = await dbPool.query("SELECT 1 as ping");
        console.log(`[${new Date().toISOString()}] Database keep-alive ping:`, rows[0]?.ping === 1 ? "SUCCESS" : "FAILED");
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Database keep-alive ping ERROR:`, error);
    }
  }, 3600000); // Every 1 hour
}

async function initDb() {
  if (isInitialized) return;
  if (isInitializing) return;

  isInitializing = true;
  console.log("Initializing database...");
  const dbPool = await getPool();
  if (!dbPool) {
    console.error("Database initialization failed: Pool not created.");
    isInitializing = false;
    return;
  }

  try {
    // Test connection
    await dbPool.query("SELECT 1");
    console.log("Database connection test successful.");

    // Cleanup: Drop old tables without prefix if they exist (as requested by user)
    const oldTables = ["vehicles", "service_history", "system_updates", "upcoming_services", "vehicle_images"];
    for (const table of oldTables) {
      try {
        // Only drop if it's not the same as the new prefixed table name
        if (table !== T_VEHICLES && table !== T_SERVICE_HISTORY && table !== T_SYSTEM_UPDATES && 
            table !== T_UPCOMING_SERVICES && table !== T_VEHICLE_IMAGES) {
          console.log(`Cleaning up old table '${table}'...`);
          await dbPool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        }
      } catch (err) {
        console.log(`Note: Could not drop old table ${table}:`, err instanceof Error ? err.message : err);
      }
    }

    console.log(`Creating '${T_VEHICLES}' table...`);
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${T_VEHICLES} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        license_plate VARCHAR(50) NOT NULL,
        status TEXT CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active',
        next_service_date VARCHAR(50),
        next_service_odometer INT DEFAULT 0,
        current_odometer INT DEFAULT 0,
        image_url TEXT,
        engine_no VARCHAR(255),
        chassis_no VARCHAR(255),
        registration_date VARCHAR(50),
        insurance_expiry VARCHAR(50),
        insurance_policy_no VARCHAR(255),
        revenue_license_expiry VARCHAR(50),
        revenue_license_region VARCHAR(100),
        ownership VARCHAR(255),
        is_transferred BOOLEAN DEFAULT FALSE,
        is_deleted BOOLEAN DEFAULT FALSE
      )
    `);

    console.log(`Creating '${T_SERVICE_HISTORY}' table...`);
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${T_SERVICE_HISTORY} (
        id SERIAL PRIMARY KEY,
        vehicle_id INT,
        date VARCHAR(50) NOT NULL,
        odometer INT,
        title VARCHAR(255),
        description TEXT,
        type TEXT CHECK (type IN ('Full Service', 'Tire Rotation', 'Oil Change', 'Brake Overhaul', 'Battery Replacement')),
        cost DECIMAL(10, 2),
        parts TEXT,
        labor_cost DECIMAL(10, 2),
        is_deleted BOOLEAN DEFAULT FALSE
      )
    `);

    console.log(`Creating '${T_SYSTEM_UPDATES}' table...`);
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${T_SYSTEM_UPDATES} (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        is_new BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT FALSE
      )
    `);

    console.log(`Creating '${T_UPCOMING_SERVICES}' table...`);
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${T_UPCOMING_SERVICES} (
        id SERIAL PRIMARY KEY,
        vehicle_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date VARCHAR(50),
        due_odometer INT,
        priority TEXT CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
        status TEXT CHECK (status IN ('Pending', 'Completed')) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT FALSE
      )
    `);

    console.log(`Creating '${T_VEHICLE_IMAGES}' table...`);
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${T_VEHICLE_IMAGES} (
        id SERIAL PRIMARY KEY,
        vehicle_id INT NOT NULL,
        topic VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT FALSE
      )
    `);

    // Users table - Common table, check and add missing columns if it exists
    console.log(`Ensuring '${T_USERS}' table has required columns...`);
    // Create basic table if it doesn't exist at all
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${T_USERS} (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user'
      )
    `);

    // Add missing columns to existing users table
    const columnsToAdd = [
      { name: 'id', type: 'SERIAL' },
      { name: 'email', type: 'VARCHAR(255) UNIQUE' },
      { name: 'profile_image_url', type: 'TEXT' },
      { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'is_deleted', type: 'BOOLEAN DEFAULT FALSE' }
    ];

    for (const col of columnsToAdd) {
      try {
        // We use a more robust check for columns
        const { rows: colExists } = await dbPool.query(`
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2
        `, [T_USERS, col.name]);

        if (colExists.length === 0) {
          console.log(`Adding missing column '${col.name}' to '${T_USERS}'...`);
          await dbPool.query(`ALTER TABLE ${T_USERS} ADD COLUMN ${col.name} ${col.type}`);
        }
      } catch (err) {
        console.log(`Note: Could not add column ${col.name} to ${T_USERS}:`, err instanceof Error ? err.message : err);
      }
    }

    // Seed admin user
    const adminEmail = 'kasun.jm@gmail.com';
    // Check by both email and username since it's a shared table
    const { rows: adminRows }: any = await dbPool.query(`SELECT * FROM ${T_USERS} WHERE email = $1 OR username = $2`, [adminEmail, adminEmail]);
    if (adminRows.length === 0) {
      console.log("Seeding admin user...");
      await dbPool.query(
        `INSERT INTO ${T_USERS} (username, email, password, role) VALUES ($1, $2, $3, $4)`,
        [adminEmail, adminEmail, 'admin@123', 'admin']
      );
    }

    console.log("Database initialized successfully.");
    lastInitError = null;
    isInitialized = true;
    
    // Start keep-alive task
    startKeepAlive().catch(err => console.error("Error starting keep-alive:", err));
  } catch (error: any) {
    console.error("Error initializing database:", error);
    lastInitError = error.message;
  } finally {
    isInitializing = false;
  }
}

// Middleware to ensure DB is initialized
app.use(async (req, res, next) => {
  if (!isInitialized && !req.path.startsWith("/api/db-status")) {
    try {
      // Don't await initDb if it's already initializing, 
      // but also don't proceed if it's not ready.
      if (!isInitializing) {
        initDb().catch(err => console.error("Background init error:", err));
      }
      
      // Wait up to 5 seconds for initialization to complete
      let attempts = 0;
      while (!isInitialized && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!isInitialized) {
        return res.status(503).json({ 
          error: "Database is initializing", 
          message: "The database is being set up. Please refresh in a few seconds." 
        });
      }
    } catch (error) {
      console.error("Middleware DB init error:", error);
    }
  }
  next();
});

// API Routes
app.get("/api/db-status", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) {
    return res.status(500).json({ status: "error", message: "Database configuration missing" });
  }

  try {
    await dbPool.query("SELECT 1");
    const { rows: tables }: any = await dbPool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    res.json({ 
      status: "ok", 
      message: "Connected to database",
      database: process.env.PGDATABASE,
      tables: tables.map((t: any) => t.table_name),
      lastInitError
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message, lastInitError });
  }
});

app.get("/api/vehicles", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) {
    return res.status(500).json({ error: "Database configuration missing" });
  }

  try {
    const { rows }: any = await dbPool.query(`SELECT * FROM ${T_VEHICLES} WHERE is_deleted = FALSE`);
    const mappedRows = rows.map((row: any) => ({
      id: row.id.toString(),
      name: row.name,
      licensePlate: row.license_plate,
      status: row.status,
      nextServiceDate: row.next_service_date,
      nextServiceOdometer: row.next_service_odometer,
      currentOdometer: row.current_odometer,
      imageUrl: row.image_url,
      engineNo: row.engine_no,
      registrationDate: row.registration_date,
      insuranceExpiry: row.insurance_expiry,
      revenueLicenseExpiry: row.revenue_license_expiry,
      revenueLicenseRegion: row.revenue_license_region,
      ownership: row.ownership,
      isTransferred: !!row.is_transferred,
    }));
    res.json(mappedRows);
  } catch (error: any) {
    console.error("Error fetching vehicles:", error);
    res.status(500).json({ 
      error: "Failed to fetch vehicles",
      details: process.env.NODE_ENV !== "production" ? error.message : undefined
    });
  }
});

app.get("/api/service-history/:vehicleId", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) {
    return res.status(500).json({ error: "Database configuration missing" });
  }

  try {
    const { rows } = await dbPool.query(
      `SELECT * FROM ${T_SERVICE_HISTORY} WHERE vehicle_id = $1 AND is_deleted = FALSE`,
      [req.params.vehicleId]
    );
    
    // Parse parts JSON string if stored as TEXT
    const mappedRows = (rows as any[]).map(row => ({
      ...row,
      parts: typeof row.parts === 'string' ? JSON.parse(row.parts) : row.parts,
      laborCost: row.labor_cost // Map snake_case to camelCase
    }));
    
    res.json(mappedRows);
  } catch (error: any) {
    console.error("Error fetching service history:", error);
    res.status(500).json({ 
      error: "Failed to fetch service history",
      details: process.env.NODE_ENV !== "production" ? error.message : undefined
    });
  }
});

app.post("/api/service-history", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) {
    return res.status(500).json({ error: "Database configuration missing" });
  }

  const record = req.body;
  try {
    // Check if vehicle exists and is not deleted
    const { rows: vehicles }: any = await dbPool.query(`SELECT id FROM ${T_VEHICLES} WHERE id = $1 AND is_deleted = FALSE`, [record.vehicleId]);
    if (vehicles.length === 0) {
      return res.status(404).json({ error: "Vehicle not found or deleted" });
    }

    const { rows: result } = await dbPool.query(
      `INSERT INTO ${T_SERVICE_HISTORY} (vehicle_id, date, odometer, title, description, type, cost, parts, labor_cost) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        record.vehicleId,
        record.date,
        record.odometer,
        record.title,
        record.description,
        record.type,
        record.cost,
        record.parts ? JSON.stringify(record.parts) : null,
        record.laborCost,
      ]
    );
    res.status(201).json({ id: result[0].id, ...record });
  } catch (error: any) {
    console.error("Error saving service record:", error);
    res.status(500).json({ 
      error: "Failed to save service record",
      details: process.env.NODE_ENV !== "production" ? error.message : undefined
    });
  }
});

app.post("/api/vehicles", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) {
    return res.status(500).json({ error: "Database configuration missing" });
  }

  const vehicle = req.body;
  try {
    const { rows: result } = await dbPool.query(
      `INSERT INTO ${T_VEHICLES} (name, license_plate, status, next_service_date, next_service_odometer, current_odometer, image_url, engine_no, registration_date, insurance_expiry, revenue_license_expiry, revenue_license_region, ownership, is_transferred) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
      [
        vehicle.name,
        vehicle.licensePlate,
        vehicle.status,
        vehicle.nextServiceDate,
        vehicle.nextServiceOdometer || 0,
        vehicle.currentOdometer || 0,
        vehicle.imageUrl,
        vehicle.engineNo,
        vehicle.registrationDate,
        vehicle.insuranceExpiry,
        vehicle.revenueLicenseExpiry,
        vehicle.revenueLicenseRegion,
        vehicle.ownership,
        vehicle.isTransferred ? true : false,
      ]
    );
    res.status(201).json({ id: result[0].id, ...vehicle });
  } catch (error: any) {
    console.error("Error saving vehicle:", error);
    res.status(500).json({ 
      error: "Failed to save vehicle",
      details: process.env.NODE_ENV !== "production" ? error.message : undefined
    });
  }
});

app.put("/api/vehicles/:id", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) {
    return res.status(500).json({ error: "Database configuration missing" });
  }

  const vehicleId = req.params.id;
  const vehicle = req.body;
  try {
    await dbPool.query(
      `UPDATE ${T_VEHICLES} SET name = $1, license_plate = $2, status = $3, next_service_date = $4, next_service_odometer = $5, current_odometer = $6, image_url = $7, engine_no = $8, registration_date = $9, insurance_expiry = $10, revenue_license_expiry = $11, revenue_license_region = $12, ownership = $13, is_transferred = $14 WHERE id = $15 AND is_deleted = FALSE`,
      [
        vehicle.name,
        vehicle.licensePlate,
        vehicle.status,
        vehicle.nextServiceDate,
        vehicle.nextServiceOdometer || 0,
        vehicle.currentOdometer || 0,
        vehicle.imageUrl,
        vehicle.engineNo,
        vehicle.registrationDate,
        vehicle.insuranceExpiry,
        vehicle.revenueLicenseExpiry,
        vehicle.revenueLicenseRegion,
        vehicle.ownership,
        vehicle.isTransferred ? true : false,
        vehicleId,
      ]
    );
    res.json({ id: vehicleId, ...vehicle });
  } catch (error: any) {
    console.error("Error updating vehicle:", error);
    res.status(500).json({ 
      error: "Failed to update vehicle",
      details: process.env.NODE_ENV !== "production" ? error.message : undefined
    });
  }
});

app.delete("/api/vehicles/:id", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) {
    return res.status(500).json({ error: "Database configuration missing" });
  }

  const vehicleId = req.params.id;
  try {
    // Soft delete associated data first
    await dbPool.query(`UPDATE ${T_UPCOMING_SERVICES} SET is_deleted = TRUE WHERE vehicle_id = $1`, [vehicleId]);
    await dbPool.query(`UPDATE ${T_VEHICLE_IMAGES} SET is_deleted = TRUE WHERE vehicle_id = $1`, [vehicleId]);
    await dbPool.query(`UPDATE ${T_SERVICE_HISTORY} SET is_deleted = TRUE WHERE vehicle_id = $1`, [vehicleId]);
    
    // Soft delete the vehicle
    await dbPool.query(`UPDATE ${T_VEHICLES} SET is_deleted = TRUE WHERE id = $1`, [vehicleId]);
    
    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting vehicle:", error);
    res.status(500).json({ 
      error: "Failed to delete vehicle",
      details: process.env.NODE_ENV !== "production" ? error.message : undefined
    });
  }
});

// System Updates Routes
app.get("/api/system-updates", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  try {
    const { rows }: any = await dbPool.query(`SELECT * FROM ${T_SYSTEM_UPDATES} WHERE is_deleted = FALSE ORDER BY created_at DESC LIMIT 5`);
    res.json(rows.map((row: any) => ({
      id: row.id,
      message: row.message,
      isNew: !!row.is_new,
      createdAt: row.created_at
    })));
  } catch (error) {
    console.error("Error fetching system updates:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/system-updates", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  const { message } = req.body;
  try {
    const { rows: result }: any = await dbPool.query(
      `INSERT INTO ${T_SYSTEM_UPDATES} (message) VALUES ($1) RETURNING id`,
      [message]
    );
    res.status(201).json({ id: result[0].id, message, isNew: true });
  } catch (error) {
    console.error("Error adding system update:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Upcoming Services Routes
app.get("/api/upcoming-services", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  try {
    const { rows }: any = await dbPool.query(
      `SELECT us.*, v.name as vehicleName, v.license_plate as licensePlate, v.image_url as vehicleImageUrl FROM ${T_UPCOMING_SERVICES} us JOIN ${T_VEHICLES} v ON us.vehicle_id = v.id WHERE us.status = 'Pending' AND us.is_deleted = FALSE AND v.is_deleted = FALSE ORDER BY us.due_date ASC`
    );
    res.json(rows.map((row: any) => ({
      id: row.id,
      vehicleId: row.vehicle_id,
      vehicleName: row.vehicleName,
      licensePlate: row.licensePlate,
      vehicleImageUrl: row.vehicleImageUrl,
      title: row.title,
      description: row.description,
      dueDate: row.due_date,
      dueOdometer: row.due_odometer,
      priority: row.priority,
      status: row.status
    })));
  } catch (error) {
    console.error("Error fetching all upcoming services:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/upcoming-services/:vehicleId", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  try {
    const { rows }: any = await dbPool.query(
      `SELECT * FROM ${T_UPCOMING_SERVICES} WHERE vehicle_id = $1 AND status = 'Pending' AND is_deleted = FALSE ORDER BY due_date ASC`,
      [req.params.vehicleId]
    );
    res.json(rows.map((row: any) => ({
      id: row.id,
      vehicleId: row.vehicle_id,
      title: row.title,
      description: row.description,
      dueDate: row.due_date,
      dueOdometer: row.due_odometer,
      priority: row.priority,
      status: row.status
    })));
  } catch (error) {
    console.error("Error fetching upcoming services:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/upcoming-services", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  const service = req.body;
  try {
    // Check if vehicle exists and is not deleted
    const { rows: vehicles }: any = await dbPool.query(`SELECT id FROM ${T_VEHICLES} WHERE id = $1 AND is_deleted = FALSE`, [service.vehicleId]);
    if (vehicles.length === 0) {
      return res.status(404).json({ error: "Vehicle not found or deleted" });
    }

    const { rows: result }: any = await dbPool.query(
      `INSERT INTO ${T_UPCOMING_SERVICES} (vehicle_id, title, description, due_date, due_odometer, priority) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [service.vehicleId, service.title, service.description, service.dueDate, service.dueOdometer, service.priority || 'Medium']
    );
    res.status(201).json({ id: result[0].id, ...service });
  } catch (error) {
    console.error("Error adding upcoming service:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/upcoming-services/:id", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  try {
    await dbPool.query(`UPDATE ${T_UPCOMING_SERVICES} SET is_deleted = TRUE WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting upcoming service:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/upcoming-services/:id", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  const service = req.body;
  try {
    await dbPool.query(
      `UPDATE ${T_UPCOMING_SERVICES} SET title = $1, description = $2, due_date = $3, due_odometer = $4, priority = $5, status = $6 WHERE id = $7 AND is_deleted = FALSE`,
      [service.title, service.description, service.dueDate, service.dueOdometer, service.priority, service.status, req.params.id]
    );
    res.json({ id: req.params.id, ...service });
  } catch (error) {
    console.error("Error updating upcoming service:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Vehicle Images Routes
app.get("/api/vehicles/:id/images", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  try {
    const { rows }: any = await dbPool.query(
      `SELECT * FROM ${T_VEHICLE_IMAGES} WHERE vehicle_id = $1 AND is_deleted = FALSE ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(rows.map((row: any) => ({
      id: row.id.toString(),
      vehicleId: row.vehicle_id.toString(),
      topic: row.topic,
      description: row.description,
      imageUrl: row.image_url,
      createdAt: row.created_at
    })));
  } catch (error) {
    console.error("Error fetching vehicle images:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/vehicles/:id/images", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  const { topic, description, imageUrl } = req.body;
  const vehicleId = req.params.id;
  try {
    // Check if vehicle exists and is not deleted
    const { rows: vehicles }: any = await dbPool.query(`SELECT id FROM ${T_VEHICLES} WHERE id = $1 AND is_deleted = FALSE`, [vehicleId]);
    if (vehicles.length === 0) {
      return res.status(404).json({ error: "Vehicle not found or deleted" });
    }

    const { rows: result }: any = await dbPool.query(
      `INSERT INTO ${T_VEHICLE_IMAGES} (vehicle_id, topic, description, image_url) VALUES ($1, $2, $3, $4) RETURNING id`,
      [vehicleId, topic, description, imageUrl]
    );
    res.status(201).json({ 
      id: result[0].id.toString(), 
      vehicleId, 
      topic, 
      description, 
      imageUrl,
      createdAt: new Date()
    });
  } catch (error) {
    console.error("Error adding vehicle image:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/vehicle-images/:id", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  try {
    await dbPool.query(`UPDATE ${T_VEHICLE_IMAGES} SET is_deleted = TRUE WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting vehicle image:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/vehicle-images/:id", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  const { topic, description, imageUrl } = req.body;
  try {
    await dbPool.query(
      `UPDATE ${T_VEHICLE_IMAGES} SET topic = $1, description = $2, image_url = $3 WHERE id = $4 AND is_deleted = FALSE`,
      [topic, description, imageUrl, req.params.id]
    );
    res.json({ id: req.params.id, topic, description, imageUrl });
  } catch (error) {
    console.error("Error updating vehicle image:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Auth Routes
app.get("/api/users", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  try {
    const { rows }: any = await dbPool.query(`SELECT id, email, role, profile_image_url, created_at FROM ${T_USERS} WHERE is_deleted = FALSE ORDER BY created_at DESC`);
    res.json(rows.map((row: any) => ({
      id: row.id.toString(),
      email: row.email,
      role: row.role,
      profileImageUrl: row.profile_image_url,
      createdAt: row.created_at
    })));
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/users", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  const { email, password, role, profileImageUrl } = req.body;
  try {
    const { rows: result }: any = await dbPool.query(
      `INSERT INTO ${T_USERS} (email, password, role, profile_image_url) VALUES ($1, $2, $3, $4) RETURNING id`,
      [email, password, role || 'user', profileImageUrl || null]
    );
    res.status(201).json({ id: result[0].id.toString(), email, role: role || 'user', profileImageUrl });
  } catch (error: any) {
    console.error("Error adding user:", error);
    if (error.code === '23505') { // PostgreSQL unique violation
      res.status(400).json({ error: "Email already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.put("/api/users/:id", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  const { email, password, role, profileImageUrl } = req.body;
  try {
    let query = `UPDATE ${T_USERS} SET email = $1, role = $2, profile_image_url = $3 WHERE id = $4 AND is_deleted = FALSE`;
    let params = [email, role, profileImageUrl, req.params.id];
    
    if (password) {
      query = `UPDATE ${T_USERS} SET email = $1, password = $2, role = $3, profile_image_url = $4 WHERE id = $5 AND is_deleted = FALSE`;
      params = [email, password, role, profileImageUrl, req.params.id];
    }
    
    await dbPool.query(query, params);
    res.json({ id: req.params.id, email, role, profileImageUrl });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  try {
    await dbPool.query(`UPDATE ${T_USERS} SET is_deleted = TRUE WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/login", async (req, res) => {
  const dbPool = await getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  
  const { email, password } = req.body;
  
  try {
    const { rows }: any = await dbPool.query(
      `SELECT * FROM ${T_USERS} WHERE email = $1 AND password = $2 AND is_deleted = FALSE`,
      [email, password]
    );
    
    if (rows.length > 0) {
      const user = rows[0];
      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        profileImageUrl: user.profile_image_url
      });
    } else {
      res.status(401).json({ error: "Invalid email or password" });
    }
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ 
      error: "Internal server error", 
      message: error.message,
      details: process.env.NODE_ENV !== 'production' ? error : undefined
    });
  }
});

// Vite middleware for development
async function setupVite() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    // Always ensure DB is initialized in dev
    await initDb();

    // Dynamic import vite to prevent Rollup native binary errors in production
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else if (process.env.VERCEL) {
    // On Vercel, we don't listen, but we might want to trigger initDb
    // However, the middleware will handle it more reliably per-request
    console.log("Running in Vercel environment");
  }
}

if (!process.env.VERCEL) {
  try {
    setupVite();
  } catch (e) {
    console.error("Error in setupVite:", e);
  }
}

export default app; // Export at the end to ensure all routes are registered

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Global error handler:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});
