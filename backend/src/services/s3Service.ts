import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

// Load AWS credentials from file
const credentialsPath = path.join(__dirname, '../config/awsCredentials.json');
let awsConfig: any = null;
let s3Client: S3Client | null = null;
let BUCKET_NAME = 'presentation-generator-files';

console.log('🔧 AWS S3 configuration check:');
console.log('  - Credentials file path:', credentialsPath);
console.log('  - Credentials file exists:', fs.existsSync(credentialsPath));

if (fs.existsSync(credentialsPath)) {
  try {
    console.log('🔧 Loading AWS credentials from file...');
    awsConfig = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    console.log('🔧 AWS credentials loaded successfully, region:', awsConfig.region);
    
    s3Client = new S3Client({
      region: awsConfig.region,
      credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
      },
    });
    
    BUCKET_NAME = awsConfig.bucketName;
    console.log('✅ AWS S3 client initialized successfully');
  } catch (error) {
    console.error('❌ Error loading AWS credentials:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
  }
} else {
  console.warn('⚠️ AWS credentials file not found at:', credentialsPath);
}

const hasAwsCredentials = awsConfig && s3Client;

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

  static extractFileKeyFromUrl(s3Url: string): string | null {
    try {
      // Extract key from s3://bucket-name/path/to/file format
      const match = s3Url.match(/^s3:\/\/([^\/]+)\/(.+)$/);
      if (match) {
        return match[2]; // Return the key part
      }
      return null;
    } catch (error) {
      console.error('❌ Error extracting file key from S3 URL:', error);
      return null;
    }
  }
}
