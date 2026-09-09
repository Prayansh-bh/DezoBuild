const http = require("http");

const port = process.env.PORT || 8081;

const routes = [
  "/",
  "/projects",
  "/projects/new",
  "/projects/proj-001",
  "/materials",
  "/finance",
  "/people",
  "/equipment",
  "/alerts",
  "/reports",
  "/documents",
  "/settings",
];

async function checkRoute(path) {
  return new Promise((resolve) => {
    http
      .get(`http://localhost:${port}${path}`, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          const hasError =
            body.includes("This page didn't load") ||
            body.includes("Something went wrong on our end") ||
            body.includes("TypeError:") ||
            body.includes("ReferenceError:");
          resolve({
            path,
            status: res.statusCode,
            contentLength: body.length,
            hasHtml: body.includes("<html") || body.includes("<!DOCTYPE") || body.includes("<div"),
            hasError,
          });
        });
      })
      .on("error", (err) => {
        resolve({ path, error: err.message, status: 500, contentLength: 0, hasHtml: false, hasError: true });
      });
  });
}

(async () => {
  console.log(`=== DEZOBUILD ROUTE CONTRACT VERIFICATION (Port ${port}) ===`);
  let allPass = true;
  for (const r of routes) {
    const res = await checkRoute(r);
    const pass = res.status === 200 && res.hasHtml && !res.hasError;
    console.log(
      `[${pass ? "PASS" : "FAIL"}] Route ${res.path.padEnd(22)} => HTTP ${res.status} | Bytes: ${String(res.contentLength).padStart(5)} | HTML: ${res.hasHtml} | ErrorBoundary: ${res.hasError}`,
    );
    if (!pass) allPass = false;
  }
  console.log("==========================================================");
  console.log(`OVERALL RESULT: ${allPass ? "ALL ROUTES OPERATIONAL" : "FAILURE DETECTED"}`);
  process.exit(allPass ? 0 : 1);
})();
