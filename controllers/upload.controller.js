const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const { uploadToCloudinary } = require("../config/cloudinary");

/**
 * POST /api/upload/images
 * Upload 1 to 3 images for custom service problem diagnosis
 */
const uploadCustomImages = asyncHandler(async (req, res) => {
  const files = req.files;

  if (!files || files.length === 0) {
    throw ApiError.badRequest("No image files uploaded");
  }

  if (files.length > 3) {
    throw ApiError.badRequest("You can upload a maximum of 3 images");
  }

  const uploadPromises = files.map((file) =>
    uploadToCloudinary(file.buffer, "sevasetu_custom_tasks")
  );

  const urls = await Promise.all(uploadPromises);

  return ApiResponse.success(res, {
    message: "Images uploaded successfully",
    data: { urls },
    statusCode: 200,
  });
});

module.exports = { uploadCustomImages };
