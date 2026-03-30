console.log("api/index.ts: Starting execution");

export default async (req: any, res: any) => {
  if (req.url === '/api/ping-basic') {
    return res.status(200).json({ status: 'basic-ok' });
  }
  
  try {
    console.log("api/index.ts: Loading server...");
    const { default: app } = await import("../server.js");
    console.log("api/index.ts: Server loaded");
    return app(req, res);
  } catch (err: any) {
    console.error("api/index.ts: Error loading server:", err);
    return res.status(500).json({ 
      error: "Failed to load server", 
      message: err.message,
      stack: err.stack
    });
  }
};
