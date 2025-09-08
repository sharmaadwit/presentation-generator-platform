import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

console.log('🚀 GoogleDriveService module loading...');

// Check if Google Drive credentials are configured
const hasGoogleDriveCredentials = process.env.GOOGLE_DRIVE_CREDENTIALS && process.env.GOOGLE_DRIVE_FOLDER_ID;

console.log('🔧 Google Drive configuration check:');
console.log('  - GOOGLE_DRIVE_CREDENTIALS exists:', !!process.env.GOOGLE_DRIVE_CREDENTIALS);
console.log('  - GOOGLE_DRIVE_FOLDER_ID exists:', !!process.env.GOOGLE_DRIVE_FOLDER_ID);
console.log('  - hasGoogleDriveCredentials:', hasGoogleDriveCredentials);
console.log('  - GOOGLE_DRIVE_CREDENTIALS length:', process.env.GOOGLE_DRIVE_CREDENTIALS?.length || 0);
console.log('  - GOOGLE_DRIVE_FOLDER_ID value:', process.env.GOOGLE_DRIVE_FOLDER_ID);
console.log('  - NODE_ENV:', process.env.NODE_ENV);

let drive: any = null;

if (hasGoogleDriveCredentials) {
  try {
    console.log('🔧 Parsing Google Drive credentials...');
    const credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS!);
    console.log('🔧 Credentials parsed successfully, project_id:', credentials.project_id);
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    console.log('🔧 Google Auth created successfully');
    
    drive = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive API initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Google Drive API:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
  }
} else {
  console.warn('⚠️ Google Drive credentials not configured');
}

export class GoogleDriveService {
  static async uploadFile(filePath: string, fileName: string, folderId?: string): Promise<string> {
    if (!hasGoogleDriveCredentials || !drive) {
      console.warn('⚠️ Google Drive credentials not configured or API not initialized, falling back to local storage');
      console.warn('💡 To enable Google Drive storage, configure these environment variables:');
      console.warn('   - GOOGLE_DRIVE_CREDENTIALS (JSON string)');
      console.warn('   - GOOGLE_DRIVE_FOLDER_ID (optional, defaults to root)');
      console.warn('🔧 Drive client status:', drive ? 'initialized' : 'null');
      
      // Return local path as fallback
      return filePath;
    }

    try {
      const fileMetadata = {
        name: fileName,
        parents: folderId ? [folderId] : [process.env.GOOGLE_DRIVE_FOLDER_ID || 'root']
      };

      const media = {
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        body: fs.createReadStream(filePath)
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name,webViewLink'
      });

      const fileId = response.data.id;
      const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
      
      console.log(`✅ File uploaded to Google Drive: ${fileName}`);
      console.log(`🔗 File ID: ${fileId}`);
      console.log(`🌐 File URL: ${fileUrl}`);
      
      return fileUrl;
    } catch (error) {
      console.error('❌ Error uploading file to Google Drive:', error);
      throw error;
    }
  }

  static async downloadFile(fileId: string, localPath: string): Promise<void> {
    if (!hasGoogleDriveCredentials) {
      console.warn('⚠️ Google Drive credentials not configured, skipping download');
      return;
    }

    try {
      const response = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, {
        responseType: 'stream'
      });

      const writeStream = fs.createWriteStream(localPath);
      response.data.pipe(writeStream);

      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
          console.log(`✅ File downloaded from Google Drive: ${fileId} -> ${localPath}`);
          resolve();
        });
        writeStream.on('error', reject);
      });
    } catch (error) {
      console.error('❌ Error downloading file from Google Drive:', error);
      throw error;
    }
  }

  static async deleteFile(fileId: string): Promise<void> {
    if (!hasGoogleDriveCredentials) {
      console.warn('⚠️ Google Drive credentials not configured, skipping delete');
      return;
    }

    try {
      await drive.files.delete({
        fileId: fileId
      });
      console.log(`✅ File deleted from Google Drive: ${fileId}`);
    } catch (error) {
      console.error('❌ Error deleting file from Google Drive:', error);
      throw error;
    }
  }

  static extractFileIdFromUrl(url: string): string | null {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }
}
