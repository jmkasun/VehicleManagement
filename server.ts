import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MySQL Connection Pool
let pool: mysql.Pool | null = null;
let lastInitError: string | null = null;

function getPool() {
  if (!pool) {
    const config = {
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: parseInt(process.env.MYSQL_PORT || "3306"),
    };

    const missing = [];
    if (!config.host) missing.push("MYSQL_HOST");
    if (!config.user) missing.push("MYSQL_USER");
    if (!config.password) missing.push("MYSQL_PASSWORD");
    if (!config.database) missing.push("MYSQL_DATABASE");

    if (missing.length > 0) {
      const msg = `MySQL configuration is incomplete. Missing: ${missing.join(", ")}. API routes will fail.`;
      console.warn(msg);
      lastInitError = msg;
      return null;
    }

    pool = mysql.createPool(config);
  }
  return pool;
}

async function initDb() {
  console.log("Initializing database...");
  const dbPool = getPool();
  if (!dbPool) {
    console.error("Database initialization failed: Pool not created.");
    return;
  }

  try {
    // Test connection
    await dbPool.query("SELECT 1");
    console.log("Database connection test successful.");

    console.log("Creating 'vehicles' table...");
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS \`vehicles\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        license_plate VARCHAR(50) NOT NULL,
        status ENUM('Active', 'Expiring', 'Storage', 'Maintenance') DEFAULT 'Active',
        next_service_date VARCHAR(50),
        next_service_odometer INT DEFAULT 0,
        current_odometer INT DEFAULT 0,
        image_url LONGTEXT,
        chassis_no VARCHAR(255),
        engine_no VARCHAR(255),
        registration_date VARCHAR(50),
        insurance_policy_no VARCHAR(255),
        insurance_expiry VARCHAR(50),
        revenue_license_expiry VARCHAR(50),
        revenue_license_region VARCHAR(100)
      )
    `);

    console.log("Creating 'service_history' table...");
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS \`service_history\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id INT,
        date VARCHAR(50) NOT NULL,
        odometer INT,
        title VARCHAR(255),
        description TEXT,
        type ENUM('Full Service', 'Tire Rotation', 'Oil Change', 'Brake Overhaul', 'Battery Replacement'),
        cost DECIMAL(10, 2),
        parts LONGTEXT,
        labor_cost DECIMAL(10, 2)
      )
    `);

    console.log("Creating 'system_updates' table...");
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS \`system_updates\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message TEXT NOT NULL,
        is_new BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Creating 'upcoming_services' table...");
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS \`upcoming_services\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        due_date VARCHAR(50),
        due_odometer INT,
        priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
        status ENUM('Pending', 'Completed') DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Creating 'vehicle_images' table...");
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS \`vehicle_images\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id INT NOT NULL,
        topic VARCHAR(255) NOT NULL,
        description TEXT,
        image_url LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Creating 'users' table...");
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        profile_image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed admin user
    const [adminRows]: any = await dbPool.query("SELECT * FROM \`users\` WHERE email = 'kasun.jm@gmail.com'");
    if (adminRows.length === 0) {
      console.log("Seeding admin user...");
      await dbPool.query(
        "INSERT INTO \`users\` (email, password, role) VALUES (?, ?, ?)",
        ['kasun.jm@gmail.com', 'admin@123', 'admin']
      );
    }

    // Ensure new columns exist (Migrations)
    console.log("Checking for missing columns...");
    try {
      const [existingColumns]: any = await dbPool.query("SHOW COLUMNS FROM \`vehicles\` LIKE 'next_service_odometer'");
      if (existingColumns.length === 0) {
        console.log("Adding 'next_service_odometer' column...");
        await dbPool.query("ALTER TABLE \`vehicles\` ADD COLUMN next_service_odometer INT DEFAULT 0 AFTER next_service_date");
      }
      
      const [existingColumns2]: any = await dbPool.query("SHOW COLUMNS FROM \`vehicles\` LIKE 'current_odometer'");
      if (existingColumns2.length === 0) {
        console.log("Adding 'current_odometer' column...");
        await dbPool.query("ALTER TABLE \`vehicles\` ADD COLUMN current_odometer INT DEFAULT 0 AFTER next_service_odometer");
      }

      const [existingUrlColumn]: any = await dbPool.query("SHOW COLUMNS FROM \`vehicles\` LIKE 'image_url'");
      if (existingUrlColumn.length > 0 && !existingUrlColumn[0].Type.toLowerCase().includes('longtext')) {
        console.log("Upgrading 'image_url' to LONGTEXT...");
        await dbPool.query("ALTER TABLE \`vehicles\` MODIFY COLUMN image_url LONGTEXT");
      }

      const [existingUserColumns]: any = await dbPool.query("SHOW COLUMNS FROM \`users\` LIKE 'profile_image_url'");
      if (existingUserColumns.length === 0) {
        console.log("Adding 'profile_image_url' column to 'users' table...");
        await dbPool.query("ALTER TABLE \`users\` ADD COLUMN profile_image_url TEXT AFTER role");
      }
      console.log("Columns verified/added.");
    } catch (err) {
      console.error("Column check/add failed:", err);
    }

    // Seed initial data if empty - REMOVED AS PER USER REQUEST
    /*
    const [rows]: any = await dbPool.query("SELECT COUNT(*) as count FROM `vehicles` text");
    if (rows[0].count === 0) {
      console.log("Seeding initial vehicle data...");
      await dbPool.query(`
        INSERT INTO `vehicles` (name, license_plate, status, next_service_date, next_service_odometer, current_odometer, image_url, chassis_no, engine_no, registration_date, insurance_policy_no, insurance_expiry, revenue_license_expiry, revenue_license_region)
        VALUES 
        ('Toyota Land Cruiser', 'WP CAS-9022', 'Active', '2026-05-15', 50000, 45000, 'https://picsum.photos/seed/cruiser/800/600', 'LC200-1234567', '1VD-FTV-9876543', '2022-01-10', 'INS-99887766', '2026-12-31', '2026-06-30', 'Western'),
        ('Mitsubishi Montero', 'WP CAA-1122', 'Expiring', '2026-04-05', 35000, 34200, 'https://picsum.photos/seed/montero/800/600', 'V98W-2233445', '4M41-5566778', '2021-05-20', 'INS-11223344', '2026-05-20', '2026-04-15', 'Western')
      `);
      console.log("Seeding completed.");
    }
    */

    console.log("Database initialized successfully.");
    lastInitError = null;
  } catch (error: any) {
    console.error("Error initializing database:", error);
    lastInitError = error.message;
  }
}

// API Routes
app.get("/api/db-status", async (req, res) => {
  const dbPool = getPool();
  if (!dbPool) {
    return res.status(500).json({ status: "error", message: "Database configuration missing" });
  }

  try {
    await dbPool.query("SELECT 1");
    const [tables]: any = await dbPool.query("SHOW TABLES");
    res.json({ 
      status: "ok", 
      message: "Connected to database",
      database: process.env.MYSQL_DATABASE,
      tables: tables.map((t: any) => Object.values(t)[0]),
      lastInitError
    });
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message, lastInitError });
  }
});

app.get("/api/vehicles", async (req, res) => {
  const dbPool = getPool();
  if (!dbPool) {
    return res.status(500).json({ error: "Database configuration missing" });
  }

  try {
    const [rows]: any = await dbPool.query("SELECT * FROM \`vehicles\`");
    const mappedRows = rows.map((row: any) => ({
      id: row.id.toString(),
      name: row.name,
      licensePlate: row.license_plate,
      status: row.status,
      nextServiceDate: row.next_service_date,
      nextServiceOdometer: row.next_service_odometer,
      currentOdometer: row.current_odometer,
      imageUrl: row.image_url,
      chassisNo: row.chassis_no,
      engineNo: row.engine_no,
      registrationDate: row.registration_date,
      insurancePolicyNo: row.insurance_policy_no,
      insuranceExpiry: row.insurance_expiry,
      revenueLicenseExpiry: row.revenue_license_expiry,
      revenueLicenseRegion: row.revenue_license_region,
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
  const dbPool = getPool();
  if (!dbPool) {
    return res.status(500).json({ error: "Database configuration missing" });
  }

  try {
    const [rows] = await dbPool.query(
      "SELECT * FROM \`service_history\` WHERE vehicle_id = ?",
      [req.params.vehicleId]
    );
    
    // Parse parts JSON string if stored as LONGTEXT
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
  const dbPool = getPool();
  if (!dbPool) {
    return res.status(500).json({ error: "Database configuration missing" });
  }

  const record = req.body;
  try {
    const [result] = await dbPool.query(
      "INSERT INTO \`service_history\` (vehicle_id, date, odometer, title, description, type, cost, parts, labor_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
    res.status(201).json({ id: (result as any).insertId, ...record });
  } catch (error: any) {
    console.error("Error saving service record:", error);
    res.status(500).json({ 
      error: "Failed to save service record",
      details: process.env.NODE_ENV !== "production" ? error.message : undefined
    });
  }
});

app.post("/api/vehicles", async (req, res) => {
  const dbPool = getPool();
  if (!dbPool) {
    return res.status(500).json({ error: "Database configuration missing" });
  }

  const vehicle = req.body;
  try {
    const [result] = await dbPool.query(
      "INSERT INTO \`vehicles\` (name, license_plate, status, next_service_date, next_service_odometer, current_odometer, image_url, chassis_no, engine_no, registration_date, insurance_policy_no, insurance_expiry, revenue_license_expiry, revenue_license_region) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        vehicle.name,
        vehicle.licensePlate,
        vehicle.status,
        vehicle.nextServiceDate,
        vehicle.nextServiceOdometer || 0,
        vehicle.currentOdometer || 0,
        vehicle.imageUrl,
        vehicle.chassisNo,
        vehicle.engineNo,
        vehicle.registrationDate,
        vehicle.insurancePolicyNo,
        vehicle.insuranceExpiry,
        vehicle.revenueLicenseExpiry,
        vehicle.revenueLicenseRegion,
      ]
    );
    res.status(201).json({ id: (result as any).insertId, ...vehicle });
  } catch (error: any) {
    console.error("Error saving vehicle:", error);
    res.status(500).json({ 
      error: "Failed to save vehicle",
      details: process.env.NODE_ENV !== "production" ? error.message : undefined
    });
  }
});

app.put("/api/vehicles/:id", async (req, res) => {
  const dbPool = getPool();
  if (!dbPool) {
    return res.status(500).json({ error: "Database configuration missing" });
  }

  const vehicleId = req.params.id;
  const vehicle = req.body;
  try {
    await dbPool.query(
      "UPDATE \`vehicles\` SET name = ?, license_plate = ?, status = ?, next_service_date = ?, next_service_odometer = ?, current_odometer = ?, image_url = ?, chassis_no = ?, engine_no = ?, registration_date = ?, insurance_policy_no = ?, insurance_expiry = ?, revenue_license_expiry = ?, revenue_license_region = ? WHERE id = ?",
      [
        vehicle.name,
        vehicle.licensePlate,
        vehicle.status,
        vehicle.nextServiceDate,
        vehicle.nextServiceOdometer || 0,
        vehicle.currentOdometer || 0,
        vehicle.imageUrl,
        vehicle.chassisNo,
        vehicle.engineNo,
        vehicle.registrationDate,
        vehicle.insurancePolicyNo,
        vehicle.insuranceExpiry,
        vehicle.revenueLicenseExpiry,
        vehicle.revenueLicenseRegion,
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

// System Updates Routes
app.get("/api/system-updates", async (req, res) => {
  const dbPool = getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  try {
    const [rows]: any = await dbPool.query("SELECT * FROM \`system_updates\` ORDER BY created_at DESC LIMIT 5");
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
  const dbPool = getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  const { message } = req.body;
  try {
    const [result]: any = await dbPool.query(
      "INSERT INTO \`system_updates\` (message) VALUES (?)",
      [message]
    );
    res.status(201).json({ id: result.insertId, message, isNew: true });
  } catch (error) {
    console.error("Error adding system update:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Upcoming Services Routes
app.get("/api/upcoming-services", async (req, res) => {
  const dbPool = getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  try {
    const [rows]: any = await dbPool.query(
      "SELECT us.*, v.name as vehicleName, v.license_plate as licensePlate, v.image_url as vehicleImageUrl FROM \`upcoming_services\` us JOIN \`vehicles\` v ON us.vehicle_id = v.id WHERE us.status = 'Pending' ORDER BY us.due_date ASC"
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
  const dbPool = getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  try {
    const [rows]: any = await dbPool.query(
      "SELECT * FROM \`upcoming_services\` WHERE vehicle_id = ? AND status = 'Pending' ORDER BY due_date ASC",
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
  const dbPool = getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  const service = req.body;
  try {
    const [result]: any = await dbPool.query(
      "INSERT INTO \`upcoming_services\` (vehicle_id, title, description, due_date, due_odometer, priority) VALUES (?, ?, ?, ?, ?, ?)",
      [service.vehicleId, service.title, service.description, service.dueDate, service.dueOdometer, service.priority || 'Medium']
    );
    res.status(201).json({ id: result.insertId, ...service });
  } catch (error) {
    console.error("Error adding upcoming service:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/upcoming-services/:id", async (req, res) => {
  const dbPool = getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  try {
    await dbPool.query("DELETE FROM \`upcoming_services\` WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting upcoming service:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Vehicle Images Routes
app.get("/api/vehicles/:id/images", async (req, res) => {
  const dbPool = getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  try {
    const [rows]: any = await dbPool.query(
      "SELECT * FROM \`vehicle_images\` WHERE vehicle_id = ? ORDER BY created_at DESC",
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
  const dbPool = getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  const { topic, description, imageUrl } = req.body;
  const vehicleId = req.params.id;
  try {
    const [result]: any = await dbPool.query(
      "INSERT INTO \`vehicle_images\` (vehicle_id, topic, description, image_url) VALUES (?, ?, ?, ?)",
      [vehicleId, topic, description, imageUrl]
    );
    res.status(201).json({ 
      id: result.insertId.toString(), 
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
  const dbPool = getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  try {
    await dbPool.query("DELETE FROM \`vehicle_images\` WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting vehicle image:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Auth Routes
app.get("/api/users", async (req, res) => {
  const dbPool = getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  try {
    const [rows]: any = await dbPool.query("SELECT id, email, role, profile_image_url, created_at FROM \`users\` ORDER BY created_at DESC");
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
  const dbPool = getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  const { email, password, role, profileImageUrl } = req.body;
  try {
    const [result]: any = await dbPool.query(
      "INSERT INTO \`users\` (email, password, role, profile_image_url) VALUES (?, ?, ?, ?)",
      [email, password, role || 'user', profileImageUrl || null]
    );
    res.status(201).json({ id: result.insertId.toString(), email, role: role || 'user', profileImageUrl });
  } catch (error: any) {
    console.error("Error adding user:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: "Email already exists" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.put("/api/users/:id", async (req, res) => {
  const dbPool = getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  const { email, password, role, profileImageUrl } = req.body;
  try {
    let query = "UPDATE \`users\` SET email = ?, role = ?, profile_image_url = ? WHERE id = ?";
    let params = [email, role, profileImageUrl, req.params.id];
    
    if (password) {
      query = "UPDATE \`users\` SET email = ?, password = ?, role = ?, profile_image_url = ? WHERE id = ?";
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
  const dbPool = getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  try {
    await dbPool.query("DELETE FROM \`users\` WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/login", async (req, res) => {
  const dbPool = getPool();
  if (!dbPool) return res.status(503).json({ error: "Database not configured" });
  
  const { email, password } = req.body;
  
  try {
    const [rows]: any = await dbPool.query(
      "SELECT * FROM \`users\` WHERE email = ? AND password = ?",
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
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Vite middleware for development
async function setupVite() {
  await initDb();
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupVite();
