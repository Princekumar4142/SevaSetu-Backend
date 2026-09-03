const express = require("express");
const workerController = require("../controllers/worker.controller");
const protect = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const { ROLES } = require("../utils/roles");

const router = express.Router();

router.get("/profile", protect, authorize(ROLES.WORKER), workerController.getProfile);
router.put("/profile", protect, authorize(ROLES.WORKER), workerController.updateProfile);

// Admin verification workflow. Platform admins can review all workers;
// cooperative admins are automatically scoped to their own cooperative in the service layer.
router.get("/verification", protect, authorize(ROLES.COOPERATIVE_ADMIN, ROLES.PLATFORM_ADMIN), workerController.listVerificationQueue);
router.get("/verification/:workerId", protect, authorize(ROLES.COOPERATIVE_ADMIN, ROLES.PLATFORM_ADMIN), workerController.getVerificationWorker);
router.patch("/verification/:workerId/verify", protect, authorize(ROLES.COOPERATIVE_ADMIN, ROLES.PLATFORM_ADMIN), workerController.verifyWorker);
router.patch("/verification/:workerId/reject", protect, authorize(ROLES.COOPERATIVE_ADMIN, ROLES.PLATFORM_ADMIN), workerController.rejectWorker);

// Directory: VERIFIED / active workers and shops (public for customers and visitors)
router.get("/verified", workerController.listVerifiedWorkers);
router.get("/verified/:workerId", workerController.getVerifiedWorkerById);

module.exports = router;
