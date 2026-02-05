import Joi from 'joi';

/**
 * Company request/response types and validation schemas
 */

// ============ Request DTOs ============

export interface RegisterCompanyRequest {
  companyName: string;
  companyDomain: string;
  contactEmail: string;
  contactName: string;
  contactPhone?: string;
  companySize: string;
  industry?: string;
  useCase?: string;
}

export interface UpdateOnboardingRequest {
  status?: 'pending' | 'approved' | 'rejected' | 'workspace_created';
  adminUserId?: string;
}

// ============ Response DTOs ============

export interface OnboardingRequestResponse {
  id: string;
  company_name: string;
  company_domain: string;
  contact_email: string;
  contact_name: string;
  company_size: string;
  status: string;
  admin_user_id?: string;
  workspace_id?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface CompanyPaymentResponse {
  id: string;
  onboarding_request_id: string;
  company_name: string;
  company_domain: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  created_at: string;
  due_date?: string;
  paid_at?: string;
}

// ============ Validation Schemas ============

export const registerCompanySchema = Joi.object({
  companyName: Joi.string().required().trim().max(255),
  companyDomain: Joi.string().required().trim().max(255),
  contactEmail: Joi.string().email().required(),
  contactName: Joi.string().required().trim().max(255),
  contactPhone: Joi.string().optional().trim().max(20),
  companySize: Joi.string().required().valid('1-10', '11-50', '51-200', '200+'),
  industry: Joi.string().optional().trim().max(100),
  useCase: Joi.string().optional().trim().max(1000)
});

// ============ Custom Error Classes ============

export class OnboardingRequestNotFoundError extends Error {
  constructor(requestId: string) {
    super(`Onboarding request ${requestId} not found`);
    this.name = 'OnboardingRequestNotFoundError';
  }
}

export class DomainAlreadyRegisteredError extends Error {
  constructor(domain: string) {
    super(`Domain "${domain}" is already registered or pending`);
    this.name = 'DomainAlreadyRegisteredError';
  }
}

export class InvalidCompanyDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCompanyDataError';
  }
}
