const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/apiResponse");
const workerService = require("../services/worker.service");

const getProfile = asyncHandler(async (req, res) => {
  const worker = await workerService.getProfileByUserId(req.user._id);
  return ApiResponse.success(res, { message: "Worker profile fetched", data: { worker } });
});

const updateProfile = asyncHandler(async (req, res) => {
  const worker = await workerService.updateProfile(req.user._id, req.body);
  return ApiResponse.success(res, { message: "Worker profile updated", data: { worker } });
});

const listVerificationQueue = asyncHandler(async (req, res) => {
  const cooperativeId = req.user.role === "COOPERATIVE_ADMIN" ? req.user.cooperative : null;
  const workers = await workerService.listForAdmin({ cooperativeId, status: req.query.status || "PENDING" });
  return ApiResponse.success(res, { message: "Worker verification queue fetched", data: { workers } });
});

const getVerificationWorker = asyncHandler(async (req, res) => {
  const cooperativeId = req.user.role === "COOPERATIVE_ADMIN" ? req.user.cooperative : null;
  const worker = await workerService.getForAdmin(req.params.workerId, cooperativeId);
  return ApiResponse.success(res, { message: "Worker details fetched", data: { worker } });
});

const verifyWorker = asyncHandler(async (req, res) => {
  const worker = await workerService.verifyWorker(req.params.workerId, req.user, "VERIFY");
  return ApiResponse.success(res, { message: "Worker verified successfully", data: { worker } });
});

const rejectWorker = asyncHandler(async (req, res) => {
  const worker = await workerService.verifyWorker(req.params.workerId, req.user, "REJECT", req.body.reason);
  return ApiResponse.success(res, { message: "Worker rejected", data: { worker } });
});

const listVerifiedWorkers = asyncHandler(async (req, res) => {
  const workers = await workerService.listVerified({
    search: req.query.search || "",
    skill: req.query.skill || "",
    category: req.query.category || "",
    city: req.query.city || "",
  });
  return ApiResponse.success(res, { message: "Verified workers fetched", data: { workers } });
});

const getVerifiedWorkerById = asyncHandler(async (req, res) => {
  const worker = await workerService.getVerifiedById(req.params.workerId);
  return ApiResponse.success(res, { message: "Worker fetched", data: { worker } });
});

module.exports = { getProfile, updateProfile, listVerificationQueue, getVerificationWorker, verifyWorker, rejectWorker, listVerifiedWorkers, getVerifiedWorkerById };
