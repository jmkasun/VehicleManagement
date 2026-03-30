import mysql from "mysql2/promise";

export const onRequest: PagesFunction<{
  MYSQL_HOST: string;
  MYSQL_USER: string;
  MYSQL_PASSWORD: string;
  MYSQL_DATABASE: string;
  MYSQL_PORT: string;
}> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // Fix: Cloudflare Workers need environment variables mapped to process.env 
  // for libraries like mysql2 to find them if they use default getters,
  // but it's safer to pass them directly.
  
  if (url.pathname === "/api/login" && request.method === "POST") {
    try {
      const { email, password } = await request.json() as any;

      const connection = await mysql.createConnection({
        host: env.MYSQL_HOST,
        user: env.MYSQL_USER,
        password: env.MYSQL_PASSWORD,
        database: env.MYSQL_DATABASE,
        port: parseInt(env.MYSQL_PORT || "3306"),
        ssl: { rejectUnauthorized: false },
      });

      const [rows]: any = await connection.execute(
        "SELECT id, email, role, profile_image_url FROM `users` WHERE email = ? AND password = ?",
        [email, password]
      );

      await connection.end();

      if (rows.length > 0) {
        return new Response(JSON.stringify(rows[0]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response("API Route Not Found", { status: 404 });
};

