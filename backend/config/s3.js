const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - File name
 * @param {string} mimeType - MIME type (e.g., 'application/pdf')
 * @param {string} folder - Folder path in S3 (e.g., 'resumes/userId')
 * @returns {Promise<string>} - S3 object key
 */
async function uploadFile(fileBuffer, fileName, mimeType, folder = 'resumes') {
  try {
    // Generate unique file key
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${folder}/${timestamp}_${sanitizedFileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      // Make file private (not publicly accessible)
      ACL: 'private',
      // Add metadata
      Metadata: {
        originalName: fileName,
        uploadedAt: new Date().toISOString()
      }
    });

    await s3Client.send(command);

    console.log(`[S3] File uploaded successfully: ${key}`);
    return key;
  } catch (error) {
    console.error('[S3] Upload error:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
}

/**
 * Generate a pre-signed URL for downloading a file
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} - Pre-signed URL
 */
async function getDownloadUrl(key, expiresIn = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    console.log(`[S3] Generated download URL for: ${key}`);
    return url;
  } catch (error) {
    console.error('[S3] Error generating download URL:', error);
    throw new Error(`Failed to generate download URL: ${error.message}`);
  }
}

/**
 * Delete a file from S3
 * @param {string} key - S3 object key
 * @returns {Promise<void>}
 */
async function deleteFile(key) {
  try {
    if (!key) {
      console.warn('[S3] No key provided for deletion');
      return;
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);
    console.log(`[S3] File deleted successfully: ${key}`);
  } catch (error) {
    console.error('[S3] Delete error:', error);
    // Don't throw error for delete failures - log and continue
    console.warn(`[S3] Failed to delete file ${key}, continuing anyway`);
  }
}

/**
 * Get the full S3 URL for a file (for storage in database)
 * @param {string} key - S3 object key
 * @returns {string} - Full S3 URL
 */
function getS3Url(key) {
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

module.exports = {
  uploadFile,
  getDownloadUrl,
  deleteFile,
  getS3Url,
  s3Client,
  BUCKET_NAME
};
