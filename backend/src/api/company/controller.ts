import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { CompanyService } from './service';
import { DomainAlreadyRegisteredError, OnboardingRequestNotFoundError } from './types';
import logger from '../../utils/logger';

/**
 * Company Controller - Handles HTTP requests for company endpoints
 */

export const companyController = {
  /**
   * POST /api/company/onboarding/register - Register new company
   */
  register: asyncHandler(async (req: Request, res: Response) => {
    const { companyName, companyDomain, contactEmail, contactName, contactPhone, companySize, industry, useCase } =
      req.body;

    try {
      const result = await CompanyService.registerCompany({
        companyName,
        companyDomain,
        contactEmail,
        contactName,
        contactPhone,
        companySize,
        industry,
        useCase
      });

      logger.info('Company registered via API', { requestId: result.id, domain: companyDomain });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Registration successful. Payment details have been sent to your email.'
      });
    } catch (error) {
      if (error instanceof DomainAlreadyRegisteredError) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }),

  /**
   * GET /api/company/onboarding/:id - Get onboarding request details
   */
  getOnboarding: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const request = await CompanyService.getOnboardingRequest(id);

    res.status(200).json({
      success: true,
      data: request
    });
  }),

  /**
   * GET /api/company/onboarding - List onboarding requests (admin only)
   */
  listOnboarding: asyncHandler(async (req: Request, res: Response) => {
    const userRole = req.user!.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can view onboarding requests'
      });
    }

    const { status, limit, offset } = req.query;

    const result = await CompanyService.listOnboardingRequests({
      status: status as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        limit: Math.min(parseInt(limit as string) || 50, 1000),
        offset: parseInt(offset as string) || 0
      }
    });
  }),

  /**
   * PATCH /api/company/onboarding/:id/approve - Approve onboarding (admin only)
   */
  approveOnboarding: asyncHandler(async (req: Request, res: Response) => {
    const userRole = req.user!.role;
    const { id } = req.params;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can approve onboarding'
      });
    }

    try {
      const result = await CompanyService.approveOnboardingRequest(id, req.user!.id);

      logger.info('Onboarding approved via API', { requestId: id, adminId: req.user!.id });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Onboarding request approved'
      });
    } catch (error) {
      if (error instanceof OnboardingRequestNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }),

  /**
   * PATCH /api/company/onboarding/:id/reject - Reject onboarding (admin only)
   */
  rejectOnboarding: asyncHandler(async (req: Request, res: Response) => {
    const userRole = req.user!.role;
    const { id } = req.params;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can reject onboarding'
      });
    }

    try {
      const result = await CompanyService.rejectOnboardingRequest(id);

      logger.info('Onboarding rejected via API', { requestId: id });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Onboarding request rejected'
      });
    } catch (error) {
      if (error instanceof OnboardingRequestNotFoundError) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  })
};
