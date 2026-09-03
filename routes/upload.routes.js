const express = require("express");
const multer = require("multer");
const { uploadCustomImages } = require("../controllers/upload.controller");

const router = express.Router();

// Memory storage for processing through Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

router.post("/images", upload.array("images", 3), uploadCustomImages);

module.exports = router;
