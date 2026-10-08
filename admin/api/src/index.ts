import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { requireAdmin } from "./middleware/requireAdmin.js";
import { metricsRouter } from "./routes/metrics.js";
import { provisionRouter } from "./routes/provision.js";
import { usersRouter } from "./routes/users.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: (process.env.ADMIN_WEB_ORIGINS ?? "http://localhost:5173").split(","),
  })
);

// Defense in depth: the admin surface is low-traffic by nature, so a tight
// rate limit costs nothing and blunts token-guessing / scripted abuse.
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Everything below requires a verified Firebase ID token with admin=true.
app.use("/api", requireAdmin);
app.use("/api/users", usersRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/provision", provisionRouter);

// Central error handler — no stack traces to clients.
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[admin-api]", err);
  res.status(500).json({ error: "Internal error" });
});

app.listen(PORT, () => {
  console.log(`GNmail admin API listening on :${PORT}`);
});
