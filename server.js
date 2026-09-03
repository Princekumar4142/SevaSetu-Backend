const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { port, clientUrl, nodeEnv } = require("./config/env");
const connectDB = require("./config/db");
const errorMiddleware = require("./middleware/error.middleware");
const ApiError = require("./utils/apiError");

const app = express();

app.use(helmet());
app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
