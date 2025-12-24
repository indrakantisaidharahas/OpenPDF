#!/usr/bin/env node


//so i willa slo be adding an mcp  to the project 
// lets start wit making a simpe mcp 

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";


// const NWS_API_BASE = "https://api.weather.gov";
// const USER_AGENT = "weather-app/1.0";

// Create server instance
const server = new McpServer({
  name: "openpdf",
  version: "1.0.0",
});
