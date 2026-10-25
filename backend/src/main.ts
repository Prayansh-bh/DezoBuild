import { ApplicationServer } from "./common/http/server";
import { logger } from "./common/logging/logger";

async function bootstrap() {
  const app = new ApplicationServer();
  app.registerShutdownSignals();

  await app.start();
}

if (process.env["NODE_ENV"] !== "test") {
  bootstrap().catch((err) => {
    logger.error("Fatal error during backend initialization", err);
    process.exit(1);
  });
}

