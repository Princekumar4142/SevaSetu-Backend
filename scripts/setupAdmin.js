const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: "../.env" });

const User = require("../models/User");
const Worker = require("../models/Worker");

async function setupAdminAndResetWorkers() {
  try {
    const mongoUri = process.env.MONGO_URI;
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(mongoUri);
    console.log("Connected successfully!");

    const adminEmail = "princebth1988@gmail.com";
    const plainPassword = "Pk4142@@";

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(plainPassword, salt);

    let adminUser = await User.findOne({ email: adminEmail });

    if (adminUser) {
      console.log(`User ${adminEmail} found. Direct updating role & single passwordHash...`);
      await User.updateOne(
        { _id: adminUser._id },
        {
          $set: {
            role: "PLATFORM_ADMIN",
            passwordHash: passwordHash,
            isVerified: true,
            isActive: true,
          },
        }
      );
      console.log(`Admin account updated successfully! User ID: ${adminUser._id}`);
    } else {
      console.log(`Creating new PLATFORM_ADMIN account for ${adminEmail}...`);
      adminUser = await User.create({
        name: "Prince Admin",
        email: adminEmail,
        phone: "9876543210",
        passwordHash: plainPassword, // pre-save hook will hash plainPassword ONCE
        role: "PLATFORM_ADMIN",
        isVerified: true,
        isActive: true,
      });
      console.log(`Admin account created successfully! User ID: ${adminUser._id}`);
    }

    // Verify bcrypt check locally right now
    const updatedUser = await User.findOne({ email: adminEmail }).select("+passwordHash");
    const isMatch = await bcrypt.compare(plainPassword, updatedUser.passwordHash);
    console.log(`Bcrypt check test for '${adminEmail}' with '${plainPassword}': ${isMatch ? "SUCCESS ✓" : "FAILED ✕"}`);

    // Reset any worker profiles to PENDING status
    console.log("Resetting workers to PENDING status...");
    const resetResult = await Worker.updateMany(
      {},
      {
        $set: {
          verificationStatus: "PENDING",
          verifiedAt: null,
          status: "OFFLINE",
        },
      }
    );
    console.log(`Reset ${resetResult.modifiedCount} workers to PENDING verification status.`);

    const workers = await Worker.find().select("user");
    const workerUserIds = workers.map((w) => w.user);
    await User.updateMany(
      { _id: { $in: workerUserIds }, role: "WORKER" },
      { $set: { isVerified: false } }
    );
    console.log("Updated worker user accounts to isVerified: false.");

    console.log("Done! Setup complete.");
    process.exit(0);
  } catch (error) {
    console.error("Error setting up admin:", error);
    process.exit(1);
  }
}

setupAdminAndResetWorkers();
