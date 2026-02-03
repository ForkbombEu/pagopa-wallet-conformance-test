import { spawn } from "child_process";
import express from "express";

import { normalizeCliOptions, setEnvFromOptions } from "./cli/options";

type CommandResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
};

const runCommand = (
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<CommandResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });

const normalizeRequestParams = (
  req: express.Request,
): Record<string, unknown> => ({
  ...req.query,
  ...(req.body ?? {}),
});

const createTestHandler =
  (scriptName: string) =>
  async (req: express.Request, res: express.Response) => {
    const rawParams = normalizeRequestParams(req);
    const { options, errors } = normalizeCliOptions(rawParams);

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const env = setEnvFromOptions(options);

    try {
      const result = await runCommand("pnpm", [scriptName], env);
      const payload = {
        command: scriptName,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
      };

      if (result.exitCode !== 0) {
        return res.status(500).json(payload);
      }

      return res.status(200).json(payload);
    } catch (error) {
      console.error(`Failed to run ${scriptName}`, error);
      return res.status(500).json({
        error: "command_execution_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

export const createCliServer = () => {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/commands", (_req, res) => {
    res.json({
      commands: [
        {
          name: "test:issuance",
          method: ["GET", "POST"],
          path: "/test/issuance",
        },
        {
          name: "test:presentation",
          method: ["GET", "POST"],
          path: "/test/presentation",
        },
      ],
      options: [
        "fileIni",
        "credentialIssuerUri",
        "presentationAuthorizeUri",
        "credentialTypes",
        "timeout",
        "maxRetries",
        "logLevel",
        "logFile",
        "port",
        "saveCredential",
      ],
    });
  });

  app.get("/test/issuance", createTestHandler("test:issuance"));
  app.post("/test/issuance", createTestHandler("test:issuance"));
  app.get("/test/presentation", createTestHandler("test:presentation"));
  app.post("/test/presentation", createTestHandler("test:presentation"));

  return app;
};

if (require.main === module) {
  const port = Number.parseInt(process.env.WCT_CLI_SERVER_PORT ?? "3002", 10);
  const app = createCliServer();
  app.listen(port, () => {
    console.log(
      `[CLI Server] Started
      PID: ${process.pid}
      URL: http://localhost:${port}
      Endpoints:
      GET  /health
      GET  /commands
      GET  /test/issuance
      POST /test/issuance
      GET  /test/presentation
      POST /test/presentation
      Started: ${new Date().toISOString()}`,
    );
  });
}
