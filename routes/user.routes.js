const express = require("express");
const userController = require("../controllers/user.controller");
const protect = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/profile", protect, userController.getProfile);
router.put("/profile", protect, userController.updateProfile);

module.exports = router;
