require("dotenv").config();

const required = ["MONGO_URI", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  // Fail loudly and clearly rather than starting with broken auth/DB config.
  // eslint-disable-next-line no-console
  console.error(
    `\n[CONFIG ERROR] Missing required environment variable(s): ${missing.join(", ")}\n` +
    `Copy .env.example to .env and fill these in before starting the server.\n`
  );
  process.exit(1);
}

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV || "development",
};
