import { pool } from '../config/database';

export interface LogEventData {
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  sourceId?: string;
  sourceTitle?: string;
  industry?: string;
  tags?: string[];
  action?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export const logAnalyticsEvent = async (
  userId: string,
  eventType: string,
  eventData: LogEventData = {},
  sessionId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  const client = await pool.connect();
  
  try {
    await client.query(`
      INSERT INTO analytics_events (
        user_id, event_type, event_data, session_id, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      userId,
      eventType,
      JSON.stringify(eventData),
      sessionId,
      ipAddress,
      userAgent
    ]);
  } catch (error) {
    console.error('Failed to log analytics event:', error);
    // Don't throw error to avoid breaking the main operation
  } finally {
    client.release();
  }
};

// Specific logging functions for common events
export const logFileUpload = async (
  userId: string,
  fileId: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  industry?: string,
  tags?: string[],
  sessionId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  await logAnalyticsEvent(
    userId,
    'file_uploaded',
    {
      fileId,
      fileName,
      fileSize,
      fileType,
      industry,
      tags,
      action: 'upload'
    },
    sessionId,
    ipAddress,
    userAgent
  );
};

export const logFileDeletion = async (
  userId: string,
  fileId: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  reason?: string,
  sessionId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  await logAnalyticsEvent(
    userId,
    'file_deleted',
    {
      fileId,
      fileName,
      fileSize,
      fileType,
      reason,
      action: 'delete'
    },
    sessionId,
    ipAddress,
    userAgent
  );
};

export const logSourceUpload = async (
  userId: string,
  sourceId: string,
  sourceTitle: string,
  industry: string,
  tags?: string[],
  sessionId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  await logAnalyticsEvent(
    userId,
    'source_uploaded',
    {
      sourceId,
      sourceTitle,
      industry,
      tags,
      action: 'upload'
    },
    sessionId,
    ipAddress,
    userAgent
  );
};

export const logSourceDeletion = async (
  userId: string,
  sourceId: string,
  sourceTitle: string,
  reason?: string,
  sessionId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  await logAnalyticsEvent(
    userId,
    'source_deleted',
    {
      sourceId,
      sourceTitle,
      reason,
      action: 'delete'
    },
    sessionId,
    ipAddress,
    userAgent
  );
};

export const logSourceApproval = async (
  userId: string,
  sourceId: string,
  sourceTitle: string,
  approvedBy: string,
  sessionId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  await logAnalyticsEvent(
    userId,
    'source_approved',
    {
      sourceId,
      sourceTitle,
      approvedBy,
      action: 'approve'
    },
    sessionId,
    ipAddress,
    userAgent
  );
};

export const logSourceRejection = async (
  userId: string,
  sourceId: string,
  sourceTitle: string,
  rejectedBy: string,
  reason?: string,
  sessionId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  await logAnalyticsEvent(
    userId,
    'source_rejected',
    {
      sourceId,
      sourceTitle,
      rejectedBy,
      reason,
      action: 'reject'
    },
    sessionId,
    ipAddress,
    userAgent
  );
};
