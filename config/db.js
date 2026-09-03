const mongoose = require("mongoose");
const { mongoUri } = require("./env");

async function connectDB() {
  try {
    await mongoose.connect(mongoUri);
    // eslint-disable-next-line no-console
    console.log(`[DB] MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[DB] MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
