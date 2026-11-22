import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { registerWorldBankTools } from "./tools/worldbank.js";
import { registerWeatherTools } from "./tools/weather.js";
import { registerDisasterTools } from "./tools/disasters.js";
import { registerAviationTools } from "./tools/aviation.js";
import { registerTradeTools } from "./tools/trade.js";
import { registerCountriesTools } from "./tools/countries.js";

const ICON_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/icon.png");

function createServer(): McpServer {
  const server = new McpServer({ name: "globalpulse-mcp-server", version: "1.0.0" });
  registerWorldBankTools(server);
  registerWeatherTools(server);
  registerDisasterTools(server);
  registerAviationTools(server);
  registerTradeTools(server);
  registerCountriesTools(server);
  return server;
}

async function runStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GlobalPulse MCP running on stdio");
}

async function runHttp(): Promise<void> {
  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "globalpulse-mcp-server", version: "1.0.0" });
  });
  app.get("/.well-known/openai-apps-challenge", (_req, res) => {
    const token = process.env.OPENAI_APPS_CHALLENGE;
    if (!token) return res.status(404).end();
    res.type("text/plain").status(200).send(token);
  });
  const serveIcon = (_req: express.Request, res: express.Response) => {
    res.type("image/png").sendFile(ICON_PATH, err => {
      if (err && !res.headersSent) res.status(404).end();
    });
  };
  app.get("/favicon.ico", serveIcon);
  app.get("/icon.png", serveIcon);
  app.post("/mcp", async (req, res) => {
    try {
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      res.on("close", () => {
        transport.close().catch(() => {});
        server.close().catch(() => {});
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("Error handling /mcp request:", err);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
      }
    }
  });
  const port = parseInt(process.env.PORT ?? "3000", 10);
  app.listen(port, () => console.error(`GlobalPulse MCP running on http://localhost:${port}/mcp`));
}

const transport = process.env.TRANSPORT ?? "stdio";
if (transport === "http") {
  runHttp().catch(err => { console.error(err); process.exit(1); });
} else {
  runStdio().catch(err => { console.error(err); process.exit(1); });
}
