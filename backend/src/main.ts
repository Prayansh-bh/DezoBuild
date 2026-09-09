import { appConfig } from "./config/app.config";
import { DatabaseService } from "./database/database.service";

async function bootstrap() {
  console.log("====================================================");
  console.log("DEZOBUILD Construction Operating System - API Server");
  console.log(`Environment: ${appConfig.environment}`);
  console.log(`Configured Port: ${appConfig.port}`);
  console.log("====================================================");

  const db = DatabaseService.getInstance();
  await db.connect();
  console.log("Database service initialized (Contract mode).");
}

if (process.env["NODE_ENV"] !== "test") {
  bootstrap().catch((err) => {
    console.error("Fatal error during backend initialization:", err);
    process.exit(1);
  });
}
