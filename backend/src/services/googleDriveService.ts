import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

console.log('🚀 GoogleDriveService module loading...');

// Load Google Drive credentials from file
const credentialsPath = path.join(__dirname, '../config/googleDriveCredentials.json');
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1aT0JnFTIk4dHQbe5rXbQzYBWMjnSe8bI';

console.log('🔧 Google Drive configuration check:');
console.log('  - Credentials file path:', credentialsPath);
console.log('  - Credentials file exists:', fs.existsSync(credentialsPath));
console.log('  - GOOGLE_DRIVE_FOLDER_ID:', folderId);

let drive: any = null;

if (fs.existsSync(credentialsPath)) {
  try {
    console.log('🔧 Loading Google Drive credentials from file...');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    console.log('🔧 Credentials loaded successfully, project_id:', credentials.project_id);
    
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
  console.warn('⚠️ Google Drive credentials file not found at:', credentialsPath);
}

export class GoogleDriveService {
  static async uploadFile(filePath: string, fileName: string, targetFolderId?: string): Promise<string> {
    if (!drive) {
      console.warn('⚠️ Google Drive API not initialized, falling back to local storage');
      console.warn('🔧 Drive client status:', drive ? 'initialized' : 'null');
      
      // Return local path as fallback
      return filePath;
    }

    try {
      // Use target folder ID, then environment variable, then root as fallback
      const parentFolderId = targetFolderId || folderId || 'root';
      console.log('🔧 Uploading to Google Drive folder:', parentFolderId);
      
      const fileMetadata = {
        name: fileName,
        parents: [parentFolderId]
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
    } catch (error: any) {
      console.error('❌ Error uploading file to Google Drive:', error);
      
      // If folder not found, try uploading to root folder
      if (error.status === 404 && error.message?.includes('File not found')) {
        console.log('🔄 Folder not found, trying to upload to root folder...');
        try {
          const fileMetadata = {
            name: fileName,
            parents: ['root']
          };

          const media = {
            mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            body: fs.createReadStream(filePath)
          };

          const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id,name,webViewLink'
          });

          const fileId = response.data.id;
          const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
          
          console.log('✅ File uploaded to Google Drive root folder successfully');
          console.log(`🔗 File ID: ${fileId}`);
          console.log(`🌐 File URL: ${fileUrl}`);
          
          return fileUrl;
        } catch (rootError) {
          console.error('❌ Error uploading to root folder:', rootError);
          throw rootError;
        }
      }
      
      throw error;
    }
  }

  static async downloadFile(fileId: string, localPath: string): Promise<void> {
    if (!drive) {
      console.warn('⚠️ Google Drive API not initialized, skipping download');
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
    if (!drive) {
      console.warn('⚠️ Google Drive API not initialized, skipping delete');
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
