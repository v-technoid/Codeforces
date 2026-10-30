// A tiny local server for trying the project on your own computer.
// It uses only what comes with Node.js, so there is nothing to install.
//
//   node server.js            then open http://localhost:3000
//   PORT=4000 node server.js  to use another port
//
// It serves the site files and runs the same /api files that Vercel runs online.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

// Files that are part of the project but shouldn't be served as pages.
const PRIVATE = new Set(["server.js", "package.json", ".git", "api", "node_modules", "scripts", "vercel.json"]);

const API = {
  "/api/card": () => import("./api/card.js"),
  "/api/codeforces": () => import("./api/codeforces.js"),
  "/api/profile": () => import("./api/profile.js"),
  "/api/stats": () => import("./api/stats.js"),
  "/api/contests": () => import("./api/contests.js"),
};

const KILL_SWITCH = `// Removes a service worker left here by another project.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: "window" })) client.navigate(client.url);
  })());
});
`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (API[url.pathname]) {
      const { default: handler } = await API[url.pathname]();
      req.query = Object.fromEntries(url.searchParams);
      return await handler(req, res);
    }

    // Static files. Block anything that tries to leave the project folder.
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith("/")) path += "index.html";
    const file = normalize(join(ROOT, path));
    const top = path.split("/")[1];
    if (!file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep) || PRIVATE.has(top)) {
      res.writeHead(404).end("Not found");
      return;
    }
    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) {
      // Browsers re-check an installed service worker's script now and then.
      // If an old project left one behind on this address, answer with a
      // script that removes itself, so the old site stops showing up here.
      if (/(service-?worker|sw)[\w.-]*\.js$/i.test(path)) {
        res.writeHead(200, { "Content-Type": TYPES[".js"], "Cache-Control": "no-store" });
        res.end(KILL_SWITCH);
        return;
      }
      // Unknown pages get the site's 404 page, the same as on Vercel.
      res.writeHead(404, { "Content-Type": TYPES[".html"] }).end(await readFile(join(ROOT, "404.html")).catch(() => "Not found"));
      return;
    }
    res.writeHead(200, {
      "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(await readFile(file));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Server error");
  }
});

// If the port is busy (often an old dev server still running), try the next
// few ports instead of failing, and say clearly which one we ended up on.
let port = PORT;
server.on("error", (err) => {
  if (err.code === "EADDRINUSE" && port < PORT + 10) {
    console.log(`Port ${port} is already in use by another program, trying ${port + 1}...`);
    port += 1;
    server.listen(port);
    return;
  }
  console.error(err);
  process.exit(1);
});

server.on("listening", () => {
  console.log("");
  console.log(`  Coder Stats Card is running. Open this address:`);
  console.log(`  http://localhost:${port}`);
  console.log("");
  if (port !== PORT) {
    console.log(`  Note: something else is using port ${PORT}, so whatever you see at`);
    console.log(`  http://localhost:${PORT} is NOT this project. Stop that program, or use the address above.`);
    console.log("");
  }
  console.log(`  Try a card: http://localhost:${port}/api/codeforces?username=tourist`);
  console.log("  Press Ctrl+C to stop.");
});

server.listen(port);
