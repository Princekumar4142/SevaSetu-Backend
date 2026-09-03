const express = require("express");
const cooperativeController = require("../controllers/cooperative.controller");
const protect = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const { ROLES } = require("../utils/roles");

const router = express.Router();

router.get(
  "/profile",
  protect,
  authorize(ROLES.COOPERATIVE_ADMIN, ROLES.FEDERATION_ADMIN, ROLES.PLATFORM_ADMIN),
  cooperativeController.getProfile
);

module.exports = router;
