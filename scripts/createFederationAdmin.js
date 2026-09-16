const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: "./.env" });

const User = require("../models/User");
const Federation = require("../models/Federation");

async function createFederationAdmin() {
  try {
    const mongoUri = process.env.MONGO_URI;
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(mongoUri);
    console.log("Connected successfully!");

    const email = "princekkc4142@gmail.com".toLowerCase().trim();
    const plainPassword = "Pk4142@@";

    // 1. Ensure a Federation exists
    let fed = await Federation.findOne();
    if (!fed) {
      fed = await Federation.create({
        name: "Bihar State Labour Cooperative Federation (BSLCF)",
        region: "Bihar / West Champaran Division",
      });
      console.log(`Created Federation: ${fed.name} (${fed._id})`);
    } else {
      console.log(`Using existing Federation: ${fed.name} (${fed._id})`);
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(plainPassword, salt);

    // 3. Create or update User
    let user = await User.findOne({ email });

    if (user) {
      console.log(`User ${email} exists. Updating to FEDERATION_ADMIN...`);
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            name: "Prince Federation Admin",
            role: "FEDERATION_ADMIN",
            passwordHash: passwordHash,
            federation: fed._id,
            isVerified: true,
            isActive: true,
          },
        }
      );
      console.log(`Federation Admin account updated successfully! ID: ${user._id}`);
    } else {
      console.log(`Creating new FEDERATION_ADMIN account for ${email}...`);
      user = await User.create({
        name: "Prince Federation Admin",
        email: email,
        phone: "9123456789",
        passwordHash: plainPassword, // pre-save hook will hash plainPassword
        role: "FEDERATION_ADMIN",
        federation: fed._id,
        isVerified: true,
        isActive: true,
      });
      console.log(`Federation Admin account created successfully! ID: ${user._id}`);
    }

    // 4. Verify password match
    const verifiedUser = await User.findOne({ email }).select("+passwordHash");
    const isMatch = await bcrypt.compare(plainPassword, verifiedUser.passwordHash);
    console.log(`Password verification test for '${email}': ${isMatch ? "SUCCESSFUL ✓" : "FAILED ✕"}`);
    console.log(`Role assigned: ${verifiedUser.role}`);

    process.exit(0);
  } catch (err) {
    console.error("Error creating federation admin:", err);
    process.exit(1);
  }
}

createFederationAdmin();
