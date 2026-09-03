const cloudinary = require("cloudinary").v2;

const isConfigured = Boolean(
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) ||
  process.env.CLOUDINARY_URL
);

if (isConfigured) {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config();
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
} else {
  // eslint-disable-next-line no-console
  console.warn(
    "[CLOUDINARY] Cloudinary credentials missing from .env (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET). " +
    "Uploaded custom task images will use base64 / storage data fallback."
  );
}

/**
 * Upload a single image buffer or base64 data to Cloudinary
 */
async function uploadToCloudinary(fileBuffer, folder = "sevasetu_custom_tasks") {
  if (!isConfigured) {
    // Return base64 data URI fallback for seamless development if credentials not yet saved
    const base64 = fileBuffer.toString("base64");
    return `data:image/jpeg;base64,${base64}`;
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        quality: "auto",
        fetch_format: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured: isConfigured,
  uploadToCloudinary,
};
