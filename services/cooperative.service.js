const Cooperative = require("../models/Cooperative");
const Worker = require("../models/Worker");
const ApiError = require("../utils/apiError");

async function getProfile(cooperativeId) {
  if (!cooperativeId) throw ApiError.badRequest("This account is not linked to a cooperative yet");
  const coop = await Cooperative.findById(cooperativeId).populate("federation", "name region");
  if (!coop) throw ApiError.notFound("Cooperative not found");
  const totalWorkers = await Worker.countDocuments({ cooperative: cooperativeId });
  const verifiedWorkers = await Worker.countDocuments({ cooperative: cooperativeId, verificationStatus: "VERIFIED" });
  return { cooperative: coop, totalWorkers, verifiedWorkers };
}

module.exports = { getProfile };
