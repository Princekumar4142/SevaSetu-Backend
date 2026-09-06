const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { port, allowedOrigins, nodeEnv } = require("./config/env");
const connectDB = require("./config/db");
const errorMiddleware = require("./middleware/error.middleware");
const ApiError = require("./utils/apiError");

const app = express();

// Trust Railway/Vercel reverse proxy — required for rate-limit & IP detection
app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: false }));

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, "");
    const isAllowed =
      allowedOrigins.includes(normalizedOrigin) ||
      allowedOrigins.includes(origin) ||
      normalizedOrigin.endsWith(".vercel.app");

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
if (nodeEnv !== "test") app.use(morgan(nodeEnv === "production" ? "combined" : "dev"));

app.get("/api/health", (req, res) => res.json({ success: true, message: "SevaSetu AI API is running" }));

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/workers", require("./routes/worker.routes"));
app.use("/api/cooperatives", require("./routes/cooperative.routes"));
app.use("/api/bookings", require("./routes/booking.routes"));
app.use("/api/subscribers", require("./routes/subscriber.routes"));
app.use("/api/payments", require("./routes/payment.routes"));
app.use("/api/upload", require("./routes/upload.routes"));
app.use("/api/geocode", require("./routes/geocode.routes"));

// Unmatched routes
app.use((req, res, next) => next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`)));

app.use(errorMiddleware);

const http = require("http");
const socketServer = require("./socket");

async function start() {
  await connectDB();
  
  const httpServer = http.createServer(app);
  socketServer.init(httpServer);

  httpServer.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[SERVER] SevaSetu AI API listening on http://localhost:${port}`);
  });
}

start();

module.exports = app;
