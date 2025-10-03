import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { createError } from '../middleware/errorHandler';

export const analyticsController = {
  // Get dashboard metrics
  getDashboardMetrics: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { timeRange = '30d' } = req.query;
      
      // Calculate date range
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get presentation generation metrics
      const presentationStats = await client.query(`
        SELECT 
          COUNT(*) as total_presentations,
          COUNT(CASE WHEN created_at >= $1 THEN 1 END) as recent_presentations,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_presentations,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_presentations
        FROM presentations
      `, [startDate]);

      // Get source metrics
      const sourceStats = await client.query(`
        SELECT 
          COUNT(*) as total_sources,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_sources,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_sources,
          COUNT(CASE WHEN created_at >= $1 THEN 1 END) as recent_sources
        FROM presentation_sources
      `, [startDate]);

      // Get user activity metrics
      const userStats = await client.query(`
        SELECT 
          COUNT(DISTINCT id) as active_users,
          COUNT(CASE WHEN created_at >= $1 THEN 1 END) as recent_activity
        FROM presentations
      `, [startDate]);

      // Get industry breakdown
      const industryStats = await client.query(`
        SELECT 
          industry,
          COUNT(*) as count,
          COUNT(CASE WHEN created_at >= $1 THEN 1 END) as recent_count
        FROM presentation_analytics
        WHERE industry IS NOT NULL
        GROUP BY industry
        ORDER BY count DESC
        LIMIT 10
      `, [startDate]);

      // Get use case breakdown
      const useCaseStats = await client.query(`
        SELECT 
          use_case,
          COUNT(*) as count,
          COUNT(CASE WHEN created_at >= $1 THEN 1 END) as recent_count
        FROM presentation_analytics
        WHERE use_case IS NOT NULL
        GROUP BY use_case
        ORDER BY count DESC
        LIMIT 10
      `, [startDate]);

      // Get regional team breakdown
      const regionalStats = await client.query(`
        SELECT 
          u.regional_team,
          COUNT(DISTINCT pa.presentation_id) as presentations,
          COUNT(CASE WHEN pa.created_at >= $1 THEN 1 END) as recent_presentations
        FROM presentation_analytics pa
        JOIN users u ON pa.user_id = u.id
        WHERE u.regional_team IS NOT NULL
        GROUP BY u.regional_team
        ORDER BY presentations DESC
      `, [startDate]);

      // Get source usage analytics
      const sourceUsageStats = await client.query(`
        SELECT 
          ps.title,
          ps.industry,
          COUNT(ps.id) as usage_count,
          COUNT(CASE WHEN ps.created_at >= $1 THEN 1 END) as recent_usage
        FROM presentation_sources ps
        GROUP BY ps.id, ps.title, ps.industry
        ORDER BY usage_count DESC
        LIMIT 10
      `, [startDate]);

      res.json({
        overview: {
          presentations: presentationStats.rows[0],
          sources: sourceStats.rows[0],
          users: userStats.rows[0],
          timeRange: timeRange
        },
        industryBreakdown: industryStats.rows,
        useCaseBreakdown: useCaseStats.rows,
        regionalBreakdown: regionalStats.rows,
        topSources: sourceUsageStats.rows
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Get industry analytics
  getIndustryAnalytics: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { industry } = req.params;
      const { timeRange = '30d' } = req.query;
      
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get industry-specific metrics
      const industryMetrics = await client.query(`
        SELECT 
          COUNT(DISTINCT pa.presentation_id) as total_presentations,
          COUNT(CASE WHEN pa.created_at >= $1 THEN 1 END) as recent_presentations,
          COUNT(DISTINCT pa.user_id) as unique_users,
          AVG(pa.slide_count) as avg_slides_per_presentation
        FROM presentation_analytics pa
        WHERE pa.industry = $2
      `, [startDate, industry]);

      // Get use cases for this industry
      const useCases = await client.query(`
        SELECT 
          use_case,
          COUNT(*) as count,
          COUNT(CASE WHEN created_at >= $1 THEN 1 END) as recent_count
        FROM presentation_analytics
        WHERE industry = $2 AND use_case IS NOT NULL
        GROUP BY use_case
        ORDER BY count DESC
      `, [startDate, industry]);

      // Get KPIs for this industry
      const kpis = await client.query(`
        SELECT 
          kpi,
          COUNT(*) as count,
          COUNT(CASE WHEN created_at >= $1 THEN 1 END) as recent_count
        FROM presentation_analytics
        WHERE industry = $2 AND kpi IS NOT NULL
        GROUP BY kpi
        ORDER BY count DESC
      `, [startDate, industry]);

      // Get regional teams using this industry
      const regionalTeams = await client.query(`
        SELECT 
          u.regional_team,
          COUNT(DISTINCT pa.presentation_id) as presentations,
          COUNT(CASE WHEN pa.created_at >= $1 THEN 1 END) as recent_presentations
        FROM presentation_analytics pa
        JOIN users u ON pa.user_id = u.id
        WHERE pa.industry = $2 AND u.regional_team IS NOT NULL
        GROUP BY u.regional_team
        ORDER BY presentations DESC
      `, [startDate, industry]);

      res.json({
        industry,
        metrics: industryMetrics.rows[0],
        useCases: useCases.rows,
        kpis: kpis.rows,
        regionalTeams: regionalTeams.rows,
        timeRange
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Get regional team analytics
  getRegionalTeamAnalytics: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { team } = req.params;
      const { timeRange = '30d' } = req.query;
      
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get team-specific metrics
      const teamMetrics = await client.query(`
        SELECT 
          COUNT(DISTINCT pa.presentation_id) as total_presentations,
          COUNT(CASE WHEN pa.created_at >= $1 THEN 1 END) as recent_presentations,
          COUNT(DISTINCT pa.user_id) as team_members,
          AVG(pa.slide_count) as avg_slides_per_presentation
        FROM presentation_analytics pa
        JOIN users u ON pa.user_id = u.id
        WHERE u.regional_team = $2
      `, [startDate, team]);

      // Get industries used by this team
      const industries = await client.query(`
        SELECT 
          pa.industry,
          COUNT(*) as count,
          COUNT(CASE WHEN pa.created_at >= $1 THEN 1 END) as recent_count
        FROM presentation_analytics pa
        JOIN users u ON pa.user_id = u.id
        WHERE u.regional_team = $2 AND pa.industry IS NOT NULL
        GROUP BY pa.industry
        ORDER BY count DESC
      `, [startDate, team]);

      // Get use cases for this team
      const useCases = await client.query(`
        SELECT 
          use_case,
          COUNT(*) as count,
          COUNT(CASE WHEN pa.created_at >= $1 THEN 1 END) as recent_count
        FROM presentation_analytics pa
        JOIN users u ON pa.user_id = u.id
        WHERE u.regional_team = $2 AND use_case IS NOT NULL
        GROUP BY use_case
        ORDER BY count DESC
      `, [startDate, team]);

      // Get team members activity
      const teamMembers = await client.query(`
        SELECT 
          u.name,
          u.email,
          u.department,
          COUNT(DISTINCT pa.presentation_id) as presentations,
          COUNT(CASE WHEN pa.created_at >= $1 THEN 1 END) as recent_presentations,
          MAX(pa.created_at) as last_activity
        FROM presentation_analytics pa
        JOIN users u ON pa.user_id = u.id
        WHERE u.regional_team = $2
        GROUP BY u.id, u.name, u.email, u.department
        ORDER BY presentations DESC
      `, [startDate, team]);

      res.json({
        team,
        metrics: teamMetrics.rows[0],
        industries: industries.rows,
        useCases: useCases.rows,
        teamMembers: teamMembers.rows,
        timeRange
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Get source usage analytics
  getSourceUsageAnalytics: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { timeRange = '30d' } = req.query;
      
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get source usage metrics
      const sourceUsage = await client.query(`
        SELECT 
          ps.id,
          ps.title,
          ps.industry,
          ps.status,
          COUNT(ps.id) as total_usage,
          COUNT(CASE WHEN ps.created_at >= $1 THEN 1 END) as recent_usage,
          COUNT(DISTINCT ps.id) as unique_sources,
          AVG(ps.relevance_score) as avg_relevance_score
        FROM presentation_sources ps
        -- LEFT JOIN source_usage_analytics sua ON ps.id = sua.source_id
        GROUP BY ps.id, ps.title, ps.industry, ps.status
        ORDER BY total_usage DESC
      `, [startDate]);

      // Get source performance by industry
      const industryPerformance = await client.query(`
        SELECT 
          ps.industry,
          COUNT(ps.id) as total_sources,
          COUNT(CASE WHEN ps.status = 'approved' THEN 1 END) as approved_sources,
          COUNT(ps.id) as total_usage,
          AVG(ps.relevance_score) as avg_relevance_score
        FROM presentation_sources ps
        -- LEFT JOIN source_usage_analytics sua ON ps.id = sua.source_id
        GROUP BY ps.industry
        ORDER BY total_usage DESC
      `);

      // Get most popular sources
      const popularSources = await client.query(`
        SELECT 
          ps.title,
          ps.industry,
          COUNT(ps.id) as usage_count,
          COUNT(CASE WHEN ps.created_at >= $1 THEN 1 END) as recent_usage
        FROM presentation_sources ps
        WHERE ps.status = 'approved'
        GROUP BY ps.id, ps.title, ps.industry
        ORDER BY usage_count DESC
        LIMIT 20
      `, [startDate]);

      res.json({
        sourceUsage: sourceUsage.rows,
        industryPerformance: industryPerformance.rows,
        popularSources: popularSources.rows,
        timeRange
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Get user activity analytics
  getUserActivityAnalytics: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { timeRange = '30d' } = req.query;
      
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get user activity metrics
      const userActivity = await client.query(`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.regional_team,
          u.department,
          u.location,
          COUNT(DISTINCT pa.presentation_id) as total_presentations,
          COUNT(CASE WHEN pa.created_at >= $1 THEN 1 END) as recent_presentations,
          MAX(pa.created_at) as last_activity,
          COUNT(DISTINCT pa.industry) as industries_used,
          COUNT(DISTINCT pa.use_case) as use_cases_used
        FROM users u
        LEFT JOIN presentation_analytics pa ON u.id = pa.user_id
        GROUP BY u.id, u.name, u.email, u.regional_team, u.department, u.location
        ORDER BY total_presentations DESC
      `, [startDate]);

      // Get activity trends
      const activityTrends = await client.query(`
        SELECT 
          DATE(ua.created_at) as date,
          COUNT(*) as activity_count,
          COUNT(DISTINCT ua.user_id) as unique_users
        FROM presentations ua
        WHERE ua.created_at >= $1
        GROUP BY DATE(ua.created_at)
        ORDER BY date DESC
        LIMIT 30
      `, [startDate]);

      // Get department breakdown
      const departmentBreakdown = await client.query(`
        SELECT 
          u.department,
          COUNT(DISTINCT u.id) as team_size,
          COUNT(DISTINCT pa.presentation_id) as total_presentations,
          COUNT(CASE WHEN pa.created_at >= $1 THEN 1 END) as recent_presentations
        FROM users u
        LEFT JOIN presentation_analytics pa ON u.id = pa.user_id
        WHERE u.department IS NOT NULL
        GROUP BY u.department
        ORDER BY total_presentations DESC
      `, [startDate]);

      res.json({
        userActivity: userActivity.rows,
        activityTrends: activityTrends.rows,
        departmentBreakdown: departmentBreakdown.rows,
        timeRange
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Get file upload/deletion logs
  getFileLogs: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { timeRange = '30d', eventType = 'all' } = req.query;
      
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Build query based on event type filter
      let eventFilter = '';
      let queryParams = [startDate];
      
      if (eventType === 'upload') {
        eventFilter = "AND ae.event_type IN ('file_uploaded', 'source_uploaded')";
      } else if (eventType === 'delete') {
        eventFilter = "AND ae.event_type IN ('file_deleted', 'source_deleted')";
      } else if (eventType === 'all') {
        eventFilter = "AND ae.event_type IN ('file_uploaded', 'source_uploaded', 'file_deleted', 'source_deleted')";
      }

      // Get file activity logs
      const fileLogs = await client.query(`
        SELECT 
          ae.id,
          ae.event_type,
          ae.event_data,
          ae.created_at,
          u.name as user_name,
          u.email as user_email,
          u.regional_team,
          u.department
        FROM analytics_events ae
        LEFT JOIN users u ON ae.user_id = u.id
        WHERE ae.created_at >= $1 ${eventFilter}
        ORDER BY ae.created_at DESC
        LIMIT 100
      `, queryParams);

      // Get file activity summary
      const fileSummary = await client.query(`
        SELECT 
          ae.event_type,
          COUNT(*) as count,
          COUNT(CASE WHEN ae.created_at >= $1 THEN 1 END) as recent_count,
          SUM(CASE WHEN ae.event_data->>'file_size' IS NOT NULL 
              THEN (ae.event_data->>'file_size')::BIGINT ELSE 0 END) as total_size_bytes
        FROM analytics_events ae
        WHERE ae.created_at >= $1 ${eventFilter}
        GROUP BY ae.event_type
        ORDER BY count DESC
      `, queryParams);

      // Get file activity by user
      const userFileActivity = await client.query(`
        SELECT 
          u.name as user_name,
          u.email as user_email,
          u.regional_team,
          u.department,
          COUNT(CASE WHEN ae.event_type IN ('file_uploaded', 'source_uploaded') THEN 1 END) as uploads,
          COUNT(CASE WHEN ae.event_type IN ('file_deleted', 'source_deleted') THEN 1 END) as deletions,
          SUM(CASE WHEN ae.event_type IN ('file_uploaded', 'source_uploaded') 
              AND ae.event_data->>'file_size' IS NOT NULL 
              THEN (ae.event_data->>'file_size')::BIGINT ELSE 0 END) as total_upload_size,
          MAX(ae.created_at) as last_activity
        FROM analytics_events ae
        LEFT JOIN users u ON ae.user_id = u.id
        WHERE ae.created_at >= $1 ${eventFilter}
        GROUP BY u.id, u.name, u.email, u.regional_team, u.department
        ORDER BY uploads DESC
        LIMIT 20
      `, queryParams);

      // Get file activity trends by day
      const fileTrends = await client.query(`
        SELECT 
          DATE(ae.created_at) as date,
          COUNT(CASE WHEN ae.event_type IN ('file_uploaded', 'source_uploaded') THEN 1 END) as uploads,
          COUNT(CASE WHEN ae.event_type IN ('file_deleted', 'source_deleted') THEN 1 END) as deletions,
          COUNT(DISTINCT ae.user_id) as unique_users
        FROM analytics_events ae
        WHERE ae.created_at >= $1 ${eventFilter}
        GROUP BY DATE(ae.created_at)
        ORDER BY date DESC
        LIMIT 30
      `, queryParams);

      res.json({
        fileLogs: fileLogs.rows,
        fileSummary: fileSummary.rows,
        userFileActivity: userFileActivity.rows,
        fileTrends: fileTrends.rows,
        timeRange,
        eventType
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Get source management analytics
  getSourceManagementAnalytics: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { timeRange = '30d' } = req.query;
      
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get source status breakdown
      const sourceStatus = await client.query(`
        SELECT 
          ps.status,
          COUNT(*) as count,
          COUNT(CASE WHEN ps.created_at >= $1 THEN 1 END) as recent_count,
          AVG(ps.relevance_score) as avg_relevance_score
        FROM presentation_sources ps
        GROUP BY ps.status
        ORDER BY count DESC
      `, [startDate]);

      // Get source upload trends
      const sourceUploadTrends = await client.query(`
        SELECT 
          DATE(ps.created_at) as date,
          COUNT(*) as uploads,
          COUNT(CASE WHEN ps.status = 'approved' THEN 1 END) as approved,
          COUNT(CASE WHEN ps.status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN ps.status = 'rejected' THEN 1 END) as rejected
        FROM presentation_sources ps
        WHERE ps.created_at >= $1
        GROUP BY DATE(ps.created_at)
        ORDER BY date DESC
        LIMIT 30
      `, [startDate]);

      // Get source approval activity
      const approvalActivity = await client.query(`
        SELECT 
          u.name as approver_name,
          u.email as approver_email,
          COUNT(*) as approvals,
          COUNT(CASE WHEN ps.approved_at >= $1 THEN 1 END) as recent_approvals,
          AVG(ps.relevance_score) as avg_approved_score
        FROM presentation_sources ps
        LEFT JOIN users u ON ps.approved_by = u.id
        WHERE ps.status = 'approved' AND ps.approved_by IS NOT NULL
        GROUP BY u.id, u.name, u.email
        ORDER BY approvals DESC
      `, [startDate]);

      // Get source industry breakdown
      const sourceIndustryBreakdown = await client.query(`
        SELECT 
          ps.industry,
          COUNT(*) as total_sources,
          COUNT(CASE WHEN ps.status = 'approved' THEN 1 END) as approved_sources,
          COUNT(CASE WHEN ps.created_at >= $1 THEN 1 END) as recent_sources,
          AVG(ps.relevance_score) as avg_relevance_score
        FROM presentation_sources ps
        GROUP BY ps.industry
        ORDER BY total_sources DESC
      `, [startDate]);

      res.json({
        sourceStatus: sourceStatus.rows,
        sourceUploadTrends: sourceUploadTrends.rows,
        approvalActivity: approvalActivity.rows,
        sourceIndustryBreakdown: sourceIndustryBreakdown.rows,
        timeRange
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
};