import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';

// Check if AWS credentials are configured
const hasAwsCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET;

const s3Client = hasAwsCredentials ? new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
}) : null;

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'presentation-generator-files';

export class S3Service {
  static async uploadFile(filePath: string, key: string): Promise<string> {
    if (!hasAwsCredentials) {
      console.warn('⚠️ AWS credentials not configured, falling back to local storage');
      console.warn('💡 To enable S3 storage, configure these environment variables:');
      console.warn('   - AWS_ACCESS_KEY_ID');
      console.warn('   - AWS_SECRET_ACCESS_KEY');
      console.warn('   - AWS_S3_BUCKET');
      console.warn('   - AWS_REGION (optional, defaults to us-east-1)');
      
      // Return local path as fallback
      return filePath;
    }

    try {
      const fileContent = fs.readFileSync(filePath);
      
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileContent,
        ContentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });

      await s3Client!.send(command);
      console.log(`✅ File uploaded to S3: s3://${BUCKET_NAME}/${key}`);
      
      return `s3://${BUCKET_NAME}/${key}`;
    } catch (error) {
      console.error('❌ Error uploading file to S3:', error);
      throw error;
    }
  }

  static async downloadFile(key: string, localPath: string): Promise<void> {
    if (!hasAwsCredentials) {
      console.warn('⚠️ AWS credentials not configured, skipping S3 download');
      return;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client!.send(command);
      const fileContent = await response.Body?.transformToByteArray();
      
      if (fileContent) {
        fs.writeFileSync(localPath, Buffer.from(fileContent));
        console.log(`✅ File downloaded from S3: ${key} -> ${localPath}`);
      }
    } catch (error) {
      console.error('❌ Error downloading file from S3:', error);
      throw error;
    }
  }

  static async deleteFile(key: string): Promise<void> {
    if (!hasAwsCredentials) {
      console.warn('⚠️ AWS credentials not configured, skipping S3 delete');
      return;
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await s3Client!.send(command);
      console.log(`✅ File deleted from S3: ${key}`);
    } catch (error) {
      console.error('❌ Error deleting file from S3:', error);
      throw error;
    }
  }

  static async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!hasAwsCredentials) {
      console.warn('⚠️ AWS credentials not configured, cannot generate signed URL');
      return '';
    }

    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3Client!, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      console.error('❌ Error generating signed URL:', error);
      throw error;
    }
  }
}
