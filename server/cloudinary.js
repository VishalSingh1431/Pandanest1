import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log('☁️  Cloudinary configured successfully for Pandanest images.');
} else {
  console.log('ℹ️  Cloudinary credentials not set in server/.env. Using optimized image data storage fallback.');
}

export async function uploadToCloudinary(fileBuffer, mimeType = 'image/jpeg') {
  if (isCloudinaryConfigured) {
    try {
      return await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'pandanest_toys',
            resource_type: 'auto',
            transformation: [
              { width: 800, height: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
            ]
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              resolve({
                url: result.secure_url,
                public_id: result.public_id,
              });
            }
          }
        );
        uploadStream.end(fileBuffer);
      });
    } catch (uploadErr) {
      console.warn('Cloudinary upload failed, falling back to data URI:', uploadErr.message);
      const base64 = fileBuffer.toString('base64');
      return {
        url: `data:${mimeType};base64,${base64}`,
        public_id: `fallback_${Date.now()}`
      };
    }
  }

  // Graceful fallback for local development: encode as clean Data URI
  const base64 = fileBuffer.toString('base64');
  return {
    url: `data:${mimeType};base64,${base64}`,
    public_id: `local_${Date.now()}`
  };
}

export async function uploadRawToCloudinary(fileBuffer, originalFilename = 'document.pdf') {
  if (isCloudinaryConfigured) {
    try {
      return await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'pandanest_digital_books',
            resource_type: 'raw',
            public_id: `${Date.now()}_${originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_')}`
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary raw upload error:', error);
              reject(error);
            } else {
              resolve({
                url: result.secure_url,
                public_id: result.public_id,
              });
            }
          }
        );
        uploadStream.end(fileBuffer);
      });
    } catch (uploadErr) {
      console.warn('Cloudinary raw upload failed:', uploadErr.message);
      throw uploadErr;
    }
  }
  throw new Error('Cloudinary not configured for direct raw document uploads.');
}

export { cloudinary, isCloudinaryConfigured };
