import { pool } from '../../db';
import logger from '../../utils/logger';
import {
  RegisterCompanyRequest,
  UpdateOnboardingRequest,
  OnboardingRequestResponse,
  CompanyPaymentResponse,
  OnboardingRequestNotFoundError,
  DomainAlreadyRegisteredError,
  InvalidCompanyDataError
} from './types';

/**
 * Company Service - Handles all business logic for company onboarding and management
 */

export class CompanyService {
  /**
   * Register new company
   */
  static async registerCompany(data: RegisterCompanyRequest): Promise<OnboardingRequestResponse> {
    try {
      logger.info('Registering new company', { domain: data.companyDomain });

      // Check if domain already exists
      const existingRequest = await pool.query(
        `
        SELECT id FROM CompanyOnboardingRequests
        WHERE company_domain = $1 AND status != $2
        `,
        [data.companyDomain, 'rejected']
      );

      if (existingRequest.rows.length > 0) {
        throw new DomainAlreadyRegisteredError(data.companyDomain);
      }

      // Insert onboarding request
      const result = await pool.query(
        `
        INSERT INTO CompanyOnboardingRequests (
          company_name, company_domain, contact_email, contact_name,
          contact_phone, company_size, industry, use_case
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        `,
        [
          data.companyName,
          data.companyDomain,
          data.contactEmail,
          data.contactName,
          data.contactPhone || null,
          data.companySize,
          data.industry || null,
          data.useCase || null
        ]
      );

      const requestId = result.rows[0].id;

      // Create payment record
      const basePrice =
        data.companySize === '1-10' ? 7999 : data.companySize === '11-50' ? 16499 : 24999;
      const setupFee = 0;
      const totalAmount = basePrice + setupFee;

      await pool.query(
        `
        INSERT INTO CompanyPayments (
          onboarding_request_id, company_name, company_domain, contact_email,
          amount, currency, payment_method, status, notes, due_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          requestId,
          data.companyName,
          data.companyDomain,
          data.contactEmail,
          totalAmount,
          'INR',
          'invoice',
          'pending',
          `Payment for ${data.companyName} onboarding`,
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        ]
      );

      logger.info('Company registered successfully', { requestId });
      return result.rows[0] as OnboardingRequestResponse;
    } catch (error) {
      logger.error('Failed to register company', { error });
      throw error;
    }
  }

  /**
   * Get onboarding request
   */
  static async getOnboardingRequest(requestId: string): Promise<OnboardingRequestResponse> {
    try {
      logger.info('Fetching onboarding request', { requestId });

      const result = await pool.query(
        `
        SELECT * FROM CompanyOnboardingRequests
        WHERE id = $1
        `,
        [requestId]
      );

      if (result.rows.length === 0) {
        throw new OnboardingRequestNotFoundError(requestId);
      }

      return result.rows[0] as OnboardingRequestResponse;
    } catch (error) {
      logger.error('Failed to get onboarding request', { requestId, error });
      throw error;
    }
  }

  /**
   * List all onboarding requests (admin only)
   */
  static async listOnboardingRequests(filters: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: OnboardingRequestResponse[]; total: number }> {
    try {
      logger.info('Fetching onboarding requests', filters);

      const limit = Math.min(filters.limit || 50, 1000);
      const offset = filters.offset || 0;

      let query = 'SELECT * FROM CompanyOnboardingRequests WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit);
      params.push(offset);

      const result = await pool.query(query, params);

      const countResult = await pool.query(
        'SELECT COUNT(*) as total FROM CompanyOnboardingRequests' +
          (filters.status ? ' WHERE status = $1' : ''),
        filters.status ? [filters.status] : []
      );

      return {
        data: result.rows as OnboardingRequestResponse[],
        total: parseInt(countResult.rows[0].total, 10)
      };
    } catch (error) {
      logger.error('Failed to list onboarding requests', { error });
      throw error;
    }
  }

  /**
   * Approve onboarding request
   */
  static async approveOnboardingRequest(requestId: string, adminUserId: string): Promise<OnboardingRequestResponse> {
    try {
      logger.info('Approving onboarding request', { requestId, adminUserId });

      const request = await this.getOnboardingRequest(requestId);

      // Update status
      const result = await pool.query(
        `
        UPDATE CompanyOnboardingRequests
        SET status = $1, admin_user_id = $2, reviewed_at = NOW()
        WHERE id = $3
        RETURNING *
        `,
        ['approved', adminUserId, requestId]
      );

      logger.info('Onboarding request approved', { requestId });
      return result.rows[0] as OnboardingRequestResponse;
    } catch (error) {
      logger.error('Failed to approve onboarding request', { requestId, error });
      throw error;
    }
  }

  /**
   * Reject onboarding request
   */
  static async rejectOnboardingRequest(requestId: string): Promise<OnboardingRequestResponse> {
    try {
      logger.info('Rejecting onboarding request', { requestId });

      const result = await pool.query(
        `
        UPDATE CompanyOnboardingRequests
        SET status = $1, reviewed_at = NOW()
        WHERE id = $2
        RETURNING *
        `,
        ['rejected', requestId]
      );

      if (result.rows.length === 0) {
        throw new OnboardingRequestNotFoundError(requestId);
      }

      logger.info('Onboarding request rejected', { requestId });
      return result.rows[0] as OnboardingRequestResponse;
    } catch (error) {
      logger.error('Failed to reject onboarding request', { requestId, error });
      throw error;
    }
  }

  /**
   * Mark as workspace created
   */
  static async markWorkspaceCreated(requestId: string, workspaceId: string): Promise<OnboardingRequestResponse> {
    try {
      logger.info('Marking workspace created', { requestId, workspaceId });

      const result = await pool.query(
        `
        UPDATE CompanyOnboardingRequests
        SET status = $1, workspace_id = $2
        WHERE id = $3
        RETURNING *
        `,
        ['workspace_created', workspaceId, requestId]
      );

      if (result.rows.length === 0) {
        throw new OnboardingRequestNotFoundError(requestId);
      }

      logger.info('Workspace marked as created', { requestId, workspaceId });
      return result.rows[0] as OnboardingRequestResponse;
    } catch (error) {
      logger.error('Failed to mark workspace created', { requestId, error });
      throw error;
    }
  }
}
