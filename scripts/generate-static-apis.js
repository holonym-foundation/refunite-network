#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define static API responses that can be generated at build time
const staticApis = {
  "/api/health": {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  },
  "/api/metrics": {
    totalUsers: 0,
    totalInvites: 0,
    activeNetworks: 0,
    lastUpdated: new Date().toISOString(),
  },
};

// Create the out directory structure
const outDir = path.join(__dirname, "../out");
const apiDir = path.join(outDir, "api");

// Ensure directories exist
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

// Generate static API responses
Object.entries(staticApis).forEach(([route, data]) => {
  const routePath = route.replace("/api/", "");
  const routeDir = path.join(apiDir, routePath);

  if (!fs.existsSync(routeDir)) {
    fs.mkdirSync(routeDir, { recursive: true });
  }

  const filePath = path.join(routeDir, "route.json");
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  console.log(`Generated static API: ${route}`);
});

console.log("Static API generation complete!");
