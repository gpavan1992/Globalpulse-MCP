import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { registerWorldBankTools } from "./tools/worldbank.js";
import { registerWeatherTools } from "./tools/weather.js";
import { registerDisasterTools } from "./tools/disasters.js";
import { registerAviationTools } from "./tools/aviation.js";
import { registerTradeTools } from "./tools/trade.js";
import { registerCountriesTools } from "./tools/countries.js";
const server = new McpServer({ name: "globalpulse-mcp-server", version: "1.0.0" });
registerWorldBankTools(server);
registerWeatherTools(server);
registerDisasterTools(server);
registerAviationTools(server);
registerTradeTools(server);
registerCountriesTools(server);
async function runStdio() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("GlobalPulse MCP running on stdio");
}
async function runHttp() {
    const app = express();
    app.use(express.json());
    app.get("/health", (_req, res) => {
        res.json({ status: "ok", server: "globalpulse-mcp-server", version: "1.0.0" });
    });
    app.post("/mcp", async (req, res) => {
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
        res.on("close", () => transport.close());
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    });
    const port = parseInt(process.env.PORT ?? "3000", 10);
    app.listen(port, () => console.error(`GlobalPulse MCP running on http://localhost:${port}/mcp`));
}
const transport = process.env.TRANSPORT ?? "stdio";
if (transport === "http") {
    runHttp().catch(err => { console.error(err); process.exit(1); });
}
else {
    runStdio().catch(err => { console.error(err); process.exit(1); });
}
