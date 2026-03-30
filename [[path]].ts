/**
 * Cloudflare Pages Functions: API Catch-all
 * 
 * This file resolves the '405 Method Not Allowed' error by telling Cloudflare 
 * that all routes under /api/* are dynamic functions, not static files.
 */

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;

  // Map Cloudflare environment variables to process.env for your Express logic
  Object.assign(process.env, env);

  // Note: Express is built for Node.js. Cloudflare Workers (Pages Functions)
  // use a 'fetch' based API. To run your full Express app here, 
  // you should use a compatibility adapter like 'serverless-http' 
  // or migrate the routes to 'Hono'.
  
  // As a temporary fix to verify routing works:
  if (request.method === 'POST') {
    return new Response(JSON.stringify({ 
      message: "API Function reached successfully.",
      note: "You now need to bridge this Function to your Express logic in server.ts using an adapter."
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  return new Response("API Bridge Active", { status: 200 });
};