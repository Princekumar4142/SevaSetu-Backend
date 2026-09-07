const express = require("express");
const userController = require("../controllers/user.controller");
const protect = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const { ROLES } = require("../utils/roles");

const router = express.Router();

router.get("/profile", protect, userController.getProfile);
router.put("/profile", protect, userController.updateProfile);

// Platform Admin User Management & Moderation
router.get("/", protect, authorize(ROLES.PLATFORM_ADMIN), userController.listUsers);
router.delete("/:userId", protect, authorize(ROLES.PLATFORM_ADMIN), userController.deleteUser);
router.patch("/:userId/status", protect, authorize(ROLES.PLATFORM_ADMIN), userController.toggleUserStatus);

module.exports = router;

