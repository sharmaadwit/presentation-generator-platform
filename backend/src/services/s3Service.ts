import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

// AWS S3 Configuration - Multiple credential methods supported
let s3Client: S3Client | null = null;
let BUCKET_NAME = process.env.AWS_S3_BUCKET || 'adwit-test';
let hasAwsCredentials = false;

console.log('🔧 AWS S3 configuration check:');

// Method 1: Try IAM Role (recommended for AWS infrastructure)
if (process.env.AWS_REGION && process.env.AWS_S3_BUCKET) {
  try {
    console.log('🔧 Using IAM Role for AWS authentication...');
    console.log('🔧 AWS Region:', process.env.AWS_REGION);
    console.log('🔧 S3 Bucket:', process.env.AWS_S3_BUCKET);
    
    s3Client = new S3Client({
      region: process.env.AWS_REGION,
      // No credentials needed - will use IAM role automatically
    });
    BUCKET_NAME = process.env.AWS_S3_BUCKET;
    hasAwsCredentials = true;
    console.log('✅ AWS S3 client initialized with IAM Role');
  } catch (error) {
    console.error('❌ Error initializing S3 with IAM Role:', error);
  }
}

// Method 2: Try credentials file (fallback)
if (!hasAwsCredentials) {
  const credentialsPath = path.join(__dirname, '../config/awsCredentials.json');
  console.log('  - Credentials file path:', credentialsPath);
  console.log('  - Credentials file exists:', fs.existsSync(credentialsPath));

  if (fs.existsSync(credentialsPath)) {
    try {
      console.log('🔧 Loading AWS credentials from file...');
      const awsConfig = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      console.log('🔧 AWS credentials loaded successfully, region:', awsConfig.region);
      
      s3Client = new S3Client({
        region: awsConfig.region,
        credentials: {
          accessKeyId: awsConfig.accessKeyId,
          secretAccessKey: awsConfig.secretAccessKey,
        },
      });
      
      BUCKET_NAME = awsConfig.bucketName;
      hasAwsCredentials = true;
      console.log('✅ AWS S3 client initialized with file credentials');
    } catch (error) {
      console.error('❌ Error loading AWS credentials from file:', error);
    }
  }
}

// Method 3: Try environment variables (fallback)
if (!hasAwsCredentials && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  try {
    console.log('🔧 Using environment variables for AWS authentication...');
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    BUCKET_NAME = process.env.AWS_S3_BUCKET || 'presentation-generator-files';
    hasAwsCredentials = true;
    console.log('✅ AWS S3 client initialized with environment variables');
  } catch (error) {
    console.error('❌ Error initializing S3 with environment variables:', error);
  }
}

if (!hasAwsCredentials) {
  console.warn('⚠️ No AWS credentials found. S3 functionality will be disabled.');
}

export class S3Service {
  static async uploadFile(filePath: string, key: string): Promise<string> {
    if (!hasAwsCredentials) {
      console.warn('⚠️ AWS credentials not configured, using local storage');
      console.warn('💡 To enable S3 storage, use one of these methods:');
      console.warn('   1. IAM Role: Set AWS_REGION and AWS_S3_BUCKET environment variables');
      console.warn('   2. Credentials file: Update awsCredentials.json');
      console.warn('   3. Environment variables: Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, etc.');
      
      // Create a persistent local storage path
      const persistentDir = '/app/persistent-storage';
      if (!fs.existsSync(persistentDir)) {
        fs.mkdirSync(persistentDir, { recursive: true });
      }
      
      const persistentPath = path.join(persistentDir, key);
      
      // Copy file to persistent storage
      try {
        fs.copyFileSync(filePath, persistentPath);
        console.log(`✅ File stored locally at: ${persistentPath}`);
        return persistentPath;
      } catch (error) {
        console.error('❌ Error storing file locally:', error);
        return filePath; // Fallback to original path
      }
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
