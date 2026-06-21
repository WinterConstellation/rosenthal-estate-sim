import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadScriptEditConfig } from "./pathPolicy.mjs";
import { applyScriptEdit, getEditableItem, loadScriptEditIndex } from "./editorStore.mjs";
import { writeScriptEditIndex } from "./indexGenerator.mjs";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3799;

function setCorsHeaders(res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  setCorsHeaders(res);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolveBody, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolveBody(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Request body must be JSON"));
      }
    });
    req.on("error", reject);
  });
}

function contentTypeFor(filePath) {
  const byExt = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
  };
  return byExt[extname(filePath)] ?? "application/octet-stream";
}

function runVerify(projectRoot, command) {
  return new Promise((resolveRun) => {
    const child = spawn(command, { cwd: projectRoot, shell: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => {
      resolveRun({ command, code, stdout, stderr, ok: code === 0 });
    });
    child.on("error", (error) => {
      resolveRun({ command, code: -1, stdout, stderr: error.message, ok: false });
    });
  });
}

export function createScriptEditServer({
  projectRoot = process.cwd(),
  token = randomBytes(16).toString("hex"),
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
} = {}) {
  const staticRoot = new URL("./public/", import.meta.url);
  let httpServer;

  async function handleApi(req, res, url) {
    if (url.searchParams.get("token") !== token) {
      sendJson(res, 403, { error: "Forbidden: missing or invalid token" });
      return;
    }

    try {
      if (req.method === "GET" && url.pathname === "/api/index") {
        sendJson(res, 200, loadScriptEditIndex(projectRoot));
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/item") {
        const id = url.searchParams.get("id") ?? "";
        if (!id) {
          sendJson(res, 400, { error: "Missing item id" });
          return;
        }
        try {
          sendJson(res, 200, getEditableItem(projectRoot, id));
        } catch (error) {
          sendJson(res, 404, { error: error.message });
        }
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/item") {
        const body = await readJsonBody(req);
        sendJson(res, 200, await applyScriptEdit(projectRoot, body));
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/reindex") {
        sendJson(res, 200, await writeScriptEditIndex(projectRoot));
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/verify") {
        const config = loadScriptEditConfig(projectRoot);
        const results = [];
        for (const command of config.verify ?? []) {
          results.push(await runVerify(projectRoot, command));
        }
        sendJson(res, results.every((result) => result.ok) ? 200 : 500, { results });
        return;
      }
      sendJson(res, 404, { error: "Not found" });
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  function handleStatic(req, res, url) {
    const requested = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
    if (requested.includes("\0") || requested.includes("..")) {
      res.statusCode = 400;
      res.end("Invalid path");
      return;
    }
    const filePath = fileURLToPath(new URL(requested, staticRoot));
    if (!existsSync(filePath)) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    res.statusCode = 200;
    res.setHeader("content-type", contentTypeFor(filePath));
    res.setHeader("cache-control", "no-store");
    createReadStream(filePath).pipe(res);
  }

  return {
    token,
    start() {
      httpServer = createServer((req, res) => {
        const url = new URL(req.url ?? "/", `http://${host}:${port}`);
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          setCorsHeaders(res);
          res.end();
          return;
        }
        if (url.pathname.startsWith("/api/")) {
          void handleApi(req, res, url);
          return;
        }
        handleStatic(req, res, url);
      });
      return new Promise((resolveStart) => {
        httpServer.listen(port, host, () => {
          const address = httpServer.address();
          resolveStart({
            host,
            port: typeof address === "object" && address ? address.port : port,
          });
        });
      });
    },
    close() {
      return new Promise((resolveClose, reject) => {
        if (!httpServer) {
          resolveClose();
          return;
        }
        httpServer.close((error) => {
          if (error) reject(error);
          else resolveClose();
        });
      });
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createScriptEditServer({
    projectRoot: process.cwd(),
    token: process.env.SCRIPT_EDIT_TOKEN,
  });
  const address = await server.start();
  console.log(`Script editor: http://${address.host}:${address.port}/?token=${server.token}`);
}
