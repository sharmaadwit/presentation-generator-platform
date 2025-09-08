import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'presentation-generator-files';

export class S3Service {
  static async uploadFile(filePath: string, key: string): Promise<string> {
    try {
      const fileContent = fs.readFileSync(filePath);
      
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileContent,
        ContentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      });

      await s3Client.send(command);
      console.log(`✅ File uploaded to S3: s3://${BUCKET_NAME}/${key}`);
      
      return `s3://${BUCKET_NAME}/${key}`;
    } catch (error) {
      console.error('❌ Error uploading file to S3:', error);
      throw error;
    }
  }

  static async downloadFile(key: string, localPath: string): Promise<void> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(command);
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
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
      console.log(`✅ File deleted from S3: ${key}`);
    } catch (error) {
      console.error('❌ Error deleting file from S3:', error);
      throw error;
    }
  }

  static async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      console.error('❌ Error generating signed URL:', error);
      throw error;
    }
  }
}
