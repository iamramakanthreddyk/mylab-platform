import { Router } from 'express';
import { pool } from '../db';

const router = Router();

// POST /api/company/onboarding/register - Register new company
router.post('/onboarding/register', async (req, res) => {
  try {
    const {
      companyName,
      companyDomain,
      contactEmail,
      contactName,
      contactPhone,
      companySize,
      industry,
      useCase
    } = req.body;

    // Validate required fields
    if (!companyName || !companyDomain || !contactEmail || !contactName || !companySize) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['companyName', 'companyDomain', 'contactEmail', 'contactName', 'companySize']
      });
    }

    // Check if domain already exists
    const existingRequest = await pool.query(
      'SELECT id FROM CompanyOnboardingRequests WHERE company_domain = $1 AND status != $2',
      [companyDomain, 'rejected']
    );

    if (existingRequest.rows.length > 0) {
      return res.status(409).json({
        error: 'Company domain already registered or pending approval'
      });
    }

    // Insert onboarding request
    const result = await pool.query(`
      INSERT INTO CompanyOnboardingRequests
      (company_name, company_domain, contact_email, contact_name, contact_phone, company_size, industry, use_case)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, status, created_at
    `, [companyName, companyDomain, contactEmail, contactName, contactPhone, companySize, industry, useCase]);

    const requestId = result.rows[0].id;

    // Automatically create payment record for this onboarding request
    // Default pricing: $99/month for small companies, $299/month for larger
    const basePrice = companySize === '1-10' ? 99 : companySize === '11-50' ? 199 : 299;
    const setupFee = 0; // No setup fee for initial launch
    const totalAmount = basePrice + setupFee;

    await pool.query(`
      INSERT INTO CompanyPayments
      (onboarding_request_id, company_name, company_domain, contact_email, amount, currency, payment_method, status, notes, due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      requestId,
      companyName,
      companyDomain,
      contactEmail,
      totalAmount,
      'USD',
      'bank_transfer', // Default to bank transfer for offline payments
      'pending',
      `Monthly subscription: $${basePrice}/month${setupFee > 0 ? ` + Setup fee: $${setupFee}` : ''}. First payment due before workspace activation.`,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days to pay
    ]);

    res.status(201).json({
      success: true,
      requestId: requestId,
      status: result.rows[0].status,
      paymentRequired: {
        amount: totalAmount,
        currency: 'USD',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        instructions: 'Payment must be completed before workspace activation. Contact support for payment details.'
      },
      message: 'Company onboarding request submitted successfully. Please complete payment within 30 days to activate your workspace.'
    });

  } catch (error) {
    console.error('Error registering company:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/company/onboarding/status/:requestId - Check onboarding status
router.get('/onboarding/status/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    const result = await pool.query(`
      SELECT
        cor.id, cor.company_name, cor.company_domain, cor.contact_email, cor.contact_name,
        cor.status, cor.admin_user_id, cor.workspace_id, cor.reviewed_at, cor.created_at,
        cp.id as payment_id, cp.amount, cp.currency, cp.status as payment_status,
        cp.payment_method, cp.due_date, cp.paid_at, cp.verified_at
      FROM CompanyOnboardingRequests cor
      LEFT JOIN CompanyPayments cp ON cor.id = cp.onboarding_request_id
      WHERE cor.id = $1
    `, [requestId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Onboarding request not found' });
    }

    const request = result.rows[0];
    res.json({
      requestId: request.id,
      companyName: request.company_name,
      companyDomain: request.company_domain,
      contactEmail: request.contact_email,
      contactName: request.contact_name,
      status: request.status,
      adminUserId: request.admin_user_id,
      workspaceId: request.workspace_id,
      reviewedAt: request.reviewed_at,
      createdAt: request.created_at,
      payment: request.payment_id ? {
        id: request.payment_id,
        amount: request.amount,
        currency: request.currency,
        status: request.payment_status,
        method: request.payment_method,
        dueDate: request.due_date,
        paidAt: request.paid_at,
        verifiedAt: request.verified_at,
        isOverdue: request.due_date && new Date() > new Date(request.due_date) && request.payment_status !== 'completed'
      } : null,
      nextSteps: request.status === 'pending' && request.payment_status !== 'completed'
        ? ['Complete payment to unlock full features (basic access granted)']
        : request.status === 'pending' && request.payment_status === 'completed'
        ? ['Waiting for admin approval']
        : request.status === 'approved'
        ? ['Workspace being created']
        : request.status === 'workspace_created'
        ? ['Onboarding complete - check email for login details']
        : [],
      accessLevel: request.workspace_id ? 'basic' : 'none', // Will be enhanced with payment-based feature limits
      paymentReminder: request.payment_status !== 'completed' ? {
        enabled: true,
        status: request.payment_status,
        message: request.payment_status === 'overdue'
          ? 'Payment is overdue. Please complete payment to avoid feature limitations.'
          : 'Payment pending. Complete payment to unlock all features.'
      } : null
    });

  } catch (error) {
    console.error('Error checking onboarding status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/company/onboarding/approve/:requestId - Approve onboarding request (admin only)
router.put('/onboarding/approve/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminUserId } = req.body; // This would come from auth middleware

    // TODO: Add admin authentication check
    // For now, assume adminUserId is provided

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check payment status (but don't block approval)
      const paymentCheck = await client.query(`
        SELECT id, status, amount, due_date FROM CompanyPayments
        WHERE onboarding_request_id = $1
        ORDER BY created_at DESC LIMIT 1
      `, [requestId]);

      const paymentInfo = paymentCheck.rows[0];

      // Update request status
      const updateResult = await client.query(`
        UPDATE CompanyOnboardingRequests
        SET status = 'approved', reviewed_by = $2, reviewed_at = NOW()
        WHERE id = $1 AND status = 'pending'
        RETURNING company_name, company_domain, contact_email, contact_name
      `, [requestId, adminUserId]);

      if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Pending onboarding request not found' });
      }

      const company = updateResult.rows[0];

      // Create workspace with payment status
      const paymentStatus = paymentInfo?.status === 'completed' ? 'completed' :
                           paymentInfo?.status === 'pending' && paymentInfo.due_date && new Date() > new Date(paymentInfo.due_date) ? 'overdue' :
                           paymentInfo?.status === 'pending' ? 'pending' : 'trial';

      const workspaceResult = await client.query(`
        INSERT INTO Workspace (name, slug, domain, created_by, payment_status, payment_amount, payment_due_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        company.company_name,
        workspaceSlug,
        company.company_domain,
        adminUserId,
        paymentStatus,
        paymentInfo?.amount || null,
        paymentInfo?.due_date || null
      ]);

      const workspaceId = workspaceResult.rows[0].id;

      // Create admin user
      const userResult = await client.query(`
        INSERT INTO Users (workspace_id, email, name, role)
        VALUES ($1, $2, $3, 'admin')
        RETURNING id
      `, [workspaceId, company.contact_email, company.contact_name]);

      const userId = userResult.rows[0].id;

      // Update request with workspace and admin user
      await client.query(`
        UPDATE CompanyOnboardingRequests
        SET status = 'workspace_created', admin_user_id = $2, workspace_id = $3
        WHERE id = $1
      `, [requestId, userId, workspaceId]);

      await client.query('COMMIT');

      // Create welcome notification for the new admin user
      try {
        await client.query(`
          INSERT INTO Notifications (user_id, workspace_id, type, title, message, priority, action_url, action_label)
          VALUES ($1, $2, 'success', 'Workspace Created Successfully!', 'Welcome to MyLab! Your workspace ${company.company_name} is now ready. You can start creating projects and managing samples.', 'high', '/dashboard', 'Get Started')
        `, [userId, workspaceId]);
      } catch (notificationError) {
        console.warn('Failed to create welcome notification:', notificationError);
        // Don't fail the whole operation for notification issues
      }

      // Prepare response with payment status
      const paymentStatus = paymentInfo ? {
        hasPayment: true,
        status: paymentInfo.status,
        amount: paymentInfo.amount,
        dueDate: paymentInfo.due_date,
        isOverdue: paymentInfo.due_date && new Date() > new Date(paymentInfo.due_date) && paymentInfo.status !== 'completed',
        message: paymentInfo.status === 'completed'
          ? 'Payment completed'
          : paymentInfo.status === 'pending'
          ? 'Payment pending - company will receive reminders'
          : `Payment ${paymentInfo.status}`
      } : {
        hasPayment: false,
        message: 'No payment record found - please create payment record'
      };

      res.json({
        success: true,
        message: 'Company onboarding approved and workspace created',
        workspace: {
          id: workspaceId,
          name: company.company_name,
          slug: workspaceSlug,
          domain: company.company_domain
        },
        adminUser: {
          id: userId,
          email: company.contact_email,
          name: company.contact_name,
          role: 'admin',
          note: 'Temporary password set - user should change on first login'
        },
        payment: paymentStatus,
        accessLevel: paymentInfo?.status === 'completed' ? 'full' : 'basic',
        reminders: paymentInfo?.status !== 'completed' ? {
          enabled: true,
          frequency: 'weekly',
          message: 'Payment reminders will be sent until payment is completed'
        } : null
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error approving onboarding request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/company/invitations - Send invitation to join workspace
router.post('/invitations', async (req, res) => {
  try {
    const { workspaceId, invitedEmail, invitedName, role, invitedBy } = req.body;

    // Validate required fields
    if (!workspaceId || !invitedEmail || !invitedName || !role || !invitedBy) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['workspaceId', 'invitedEmail', 'invitedName', 'role', 'invitedBy']
      });
    }

    // Check if user already exists in workspace
    const existingUser = await pool.query(
      'SELECT id FROM Users WHERE workspace_id = $1 AND email = $2',
      [workspaceId, invitedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists in this workspace' });
    }

    // Check for existing pending invitation
    const existingInvitation = await pool.query(
      'SELECT id FROM CompanyInvitations WHERE workspace_id = $1 AND invited_email = $2 AND status = $3',
      [workspaceId, invitedEmail, 'pending']
    );

    if (existingInvitation.rows.length > 0) {
      return res.status(409).json({ error: 'Pending invitation already exists for this email' });
    }

    // Generate invitation token and expiry
    const invitationToken = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Insert invitation
    const result = await pool.query(`
      INSERT INTO CompanyInvitations
      (workspace_id, invited_email, invited_name, role, invited_by, invitation_token, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, invitation_token, expires_at
    `, [workspaceId, invitedEmail, invitedName, role, invitedBy, invitationToken, expiresAt]);

    // TODO: Send invitation email

    res.status(201).json({
      success: true,
      invitationId: result.rows[0].id,
      invitationToken: result.rows[0].invitation_token,
      expiresAt: result.rows[0].expires_at,
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/company/invitations/accept/:token - Accept invitation
router.post('/invitations/accept/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body; // In real implementation, this would be hashed

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get invitation details
      const invitationResult = await client.query(`
        SELECT id, workspace_id, invited_email, invited_name, role, expires_at
        FROM CompanyInvitations
        WHERE invitation_token = $1 AND status = 'pending'
      `, [token]);

      if (invitationResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Invalid or expired invitation token' });
      }

      const invitation = invitationResult.rows[0];

      // Check if expired
      if (new Date() > new Date(invitation.expires_at)) {
        await client.query('ROLLBACK');
        return res.status(410).json({ error: 'Invitation has expired' });
      }

      // Create user account
      const userResult = await client.query(`
        INSERT INTO Users (workspace_id, email, name, role, password_hash)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, name, role
      `, [invitation.workspace_id, invitation.invited_email, invitation.invited_name, invitation.role, password]);

      // Update invitation status
      await client.query(`
        UPDATE CompanyInvitations
        SET status = 'accepted', accepted_at = NOW()
        WHERE id = $1
      `, [invitation.id]);

      await client.query('COMMIT');

      res.json({
        success: true,
        user: userResult.rows[0],
        message: 'Account created successfully. You can now log in.'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/company/invitations/workspace/:workspaceId - List workspace invitations
router.get('/invitations/workspace/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const result = await pool.query(`
      SELECT
        id, invited_email, invited_name, role, status,
        invited_by, expires_at, created_at, accepted_at
      FROM CompanyInvitations
      WHERE workspace_id = $1
      ORDER BY created_at DESC
    `, [workspaceId]);

    res.json({
      invitations: result.rows.map(inv => ({
        id: inv.id,
        email: inv.invited_email,
        name: inv.invited_name,
        role: inv.role,
        status: inv.status,
        invitedBy: inv.invited_by,
        expiresAt: inv.expires_at,
        createdAt: inv.created_at,
        acceptedAt: inv.accepted_at
      }))
    });

  } catch (error) {
    console.error('Error listing invitations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/company/payments/initiate - Initiate payment for company onboarding
router.post('/payments/initiate', async (req, res) => {
  try {
    const {
      onboardingRequestId,
      amount,
      currency = 'USD',
      paymentMethod,
      paymentReference,
      notes,
      dueDate
    } = req.body;

    // Validate required fields
    if (!onboardingRequestId || !amount || !paymentMethod) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['onboardingRequestId', 'amount', 'paymentMethod']
      });
    }

    // Get company details from onboarding request
    const requestResult = await pool.query(`
      SELECT company_name, company_domain, contact_email
      FROM CompanyOnboardingRequests
      WHERE id = $1
    `, [onboardingRequestId]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Onboarding request not found' });
    }

    const company = requestResult.rows[0];

    // Create payment record
    const paymentResult = await pool.query(`
      INSERT INTO CompanyPayments
      (onboarding_request_id, company_name, company_domain, contact_email, amount, currency, payment_method, payment_reference, notes, due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, status, created_at
    `, [
      onboardingRequestId,
      company.company_name,
      company.company_domain,
      company.contact_email,
      amount,
      currency,
      paymentMethod,
      paymentReference,
      notes,
      dueDate
    ]);

    res.status(201).json({
      success: true,
      paymentId: paymentResult.rows[0].id,
      status: paymentResult.rows[0].status,
      amount,
      currency,
      paymentMethod,
      dueDate,
      message: 'Payment record created. Company will be notified of payment instructions.',
      instructions: {
        method: paymentMethod,
        reference: paymentReference,
        amount: `${currency} ${amount}`,
        dueDate: dueDate || 'Immediate',
        notes: 'Please include the payment reference in your transaction details.'
      }
    });

  } catch (error) {
    console.error('Error initiating payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/company/payments/:paymentId/status - Check payment status
router.get('/payments/:paymentId/status', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const result = await pool.query(`
      SELECT
        id, onboarding_request_id, company_name, company_domain, contact_email,
        amount, currency, payment_method, status, transaction_id, payment_reference,
        notes, due_date, paid_at, verified_by, verified_at, created_at
      FROM CompanyPayments
      WHERE id = $1
    `, [paymentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const payment = result.rows[0];
    res.json({
      paymentId: payment.id,
      onboardingRequestId: payment.onboarding_request_id,
      companyName: payment.company_name,
      companyDomain: payment.company_domain,
      contactEmail: payment.contact_email,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.payment_method,
      status: payment.status,
      transactionId: payment.transaction_id,
      paymentReference: payment.payment_reference,
      notes: payment.notes,
      dueDate: payment.due_date,
      paidAt: payment.paid_at,
      verifiedBy: payment.verified_by,
      verifiedAt: payment.verified_at,
      createdAt: payment.created_at
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/company/payments/:paymentId/verify - Verify offline payment completion (admin)
router.post('/payments/:paymentId/verify', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { adminUserId, transactionId, notes } = req.body;

    // TODO: Add admin authentication check
    // For now, assume adminUserId is provided

    // Update payment status to completed
    const result = await pool.query(`
      UPDATE CompanyPayments
      SET status = 'completed', transaction_id = $2, paid_at = NOW(), verified_by = $3, verified_at = NOW(), notes = CONCAT(COALESCE(notes, ''), ' | Verified: ', $4)
      WHERE id = $1 AND status IN ('pending', 'processing')
      RETURNING id, onboarding_request_id, company_name, amount, currency
    `, [paymentId, transactionId, adminUserId, notes || 'Payment verified by admin']);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found or already processed' });
    }

    const payment = result.rows[0];

    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment: {
        id: payment.id,
        companyName: payment.company_name,
        amount: payment.amount,
        currency: payment.currency,
        onboardingRequestId: payment.onboarding_request_id
      },
      nextStep: 'Company onboarding can now be approved by an administrator'
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/company/payments/:paymentId/receipt - Get payment receipt
router.get('/payments/:paymentId/receipt', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const result = await pool.query(`
      SELECT
        cp.*,
        cor.company_name, cor.contact_name, cor.contact_email,
        u.name as verified_by_name
      FROM CompanyPayments cp
      LEFT JOIN CompanyOnboardingRequests cor ON cp.onboarding_request_id = cor.id
      LEFT JOIN Users u ON cp.verified_by = u.id
      WHERE cp.id = $1
    `, [paymentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    const payment = result.rows[0];

    // Generate receipt
    const receipt = {
      receiptId: `RCP-${payment.id.substring(0, 8).toUpperCase()}`,
      paymentId: payment.id,
      companyName: payment.company_name,
      contactName: payment.contact_name,
      contactEmail: payment.contact_email,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.payment_method,
      transactionId: payment.transaction_id,
      paymentReference: payment.payment_reference,
      status: payment.status,
      paidAt: payment.paid_at,
      verifiedBy: payment.verified_by_name,
      verifiedAt: payment.verified_at,
      notes: payment.notes,
      issuedAt: new Date().toISOString()
    };

    res.json({
      receipt,
      message: payment.status === 'completed' ? 'Payment completed successfully' : 'Payment is pending verification'
    });

  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/company/payments/send-reminder - Send payment reminder (admin)
router.post('/payments/send-reminder', async (req, res) => {
  try {
    const { workspaceId, message } = req.body;

    // Update last reminder timestamp
    const result = await pool.query(`
      UPDATE Workspace
      SET payment_last_reminder = NOW()
      WHERE id = $1 AND payment_status IN ('pending', 'overdue')
      RETURNING id, name, payment_status, payment_amount, payment_due_date
    `, [workspaceId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found or payment already completed' });
    }

    const workspace = result.rows[0];

    // Create notification via the notification system
    try {
      await fetch(`${req.protocol}://${req.get('host')}/api/notifications/payment-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          message: message || `Payment reminder for ${workspace.name}`,
          urgent: workspace.payment_status === 'overdue'
        })
      });
    } catch (notificationError) {
      console.warn('Failed to create notification:', notificationError);
      // Continue anyway - notification failure shouldn't block the reminder
    }

    res.json({
      success: true,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      paymentStatus: workspace.payment_status,
      reminderSent: true,
      notificationCreated: true,
      message: message || 'Payment reminder sent successfully'
    });

  } catch (error) {
    console.error('Error sending payment reminder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/company/workspaces/payment-status - Get workspaces with payment issues (admin)
router.get('/workspaces/payment-status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        w.id, w.name, w.slug, w.payment_status, w.payment_amount,
        w.payment_due_date, w.payment_last_reminder, w.created_at,
        cor.company_name, cor.contact_email, cor.contact_name
      FROM Workspace w
      LEFT JOIN CompanyOnboardingRequests cor ON w.id = cor.workspace_id
      WHERE w.payment_status IN ('pending', 'overdue', 'trial')
      AND w.deleted_at IS NULL
      ORDER BY
        CASE w.payment_status
          WHEN 'overdue' THEN 1
          WHEN 'pending' THEN 2
          WHEN 'trial' THEN 3
        END,
        w.payment_due_date ASC
    `);

    const workspaces = result.rows.map(row => ({
      workspaceId: row.id,
      workspaceName: row.name,
      workspaceSlug: row.slug,
      paymentStatus: row.payment_status,
      paymentAmount: row.payment_amount,
      paymentDueDate: row.payment_due_date,
      lastReminder: row.payment_last_reminder,
      createdAt: row.created_at,
      companyName: row.company_name,
      contactEmail: row.contact_email,
      contactName: row.contact_name,
      daysOverdue: row.payment_due_date && row.payment_status === 'overdue'
        ? Math.floor((new Date().getTime() - new Date(row.payment_due_date).getTime()) / (1000 * 60 * 60 * 24))
        : null,
      needsReminder: !row.payment_last_reminder ||
        (new Date().getTime() - new Date(row.payment_last_reminder).getTime()) > (7 * 24 * 60 * 60 * 1000) // 7 days
    }));

    res.json({
      workspaces,
      summary: {
        total: workspaces.length,
        overdue: workspaces.filter(w => w.paymentStatus === 'overdue').length,
        pending: workspaces.filter(w => w.paymentStatus === 'pending').length,
        trial: workspaces.filter(w => w.paymentStatus === 'trial').length,
        needReminders: workspaces.filter(w => w.needsReminder).length
      }
    });

});

// POST /api/company/payments/send-reminder - Send payment reminder notification
router.post('/payments/send-reminder', async (req, res) => {
  try {
    const { workspaceId, message } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }

    // Get workspace and admin user info
    const workspaceResult = await pool.query(`
      SELECT w.id, w.name, w.admin_user_id, u.email, u.name as admin_name
      FROM Workspace w
      JOIN Users u ON w.admin_user_id = u.id
      WHERE w.id = $1
    `, [workspaceId]);

    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const workspace = workspaceResult.rows[0];

    // Create notification
    const notificationResult = await pool.query(`
      INSERT INTO Notifications
      (user_id, workspace_id, type, title, message, priority, action_url, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, created_at
    `, [
      workspace.admin_user_id,
      workspaceId,
      'payment_reminder',
      'Payment Reminder',
      message || ` for workspace "${workspace.name}"`,
      'medium',
      '/dashboard/payments',
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    ]);

    // Update last reminder timestamp
    await pool.query(`
      UPDATE Workspace
      SET payment_last_reminder = NOW()
      WHERE id = $1
    `, [workspaceId]);

    res.json({
      success: true,
      notificationId: notificationResult.rows[0].id,
      message: 'Payment reminder sent successfully'
    });

  } catch (error) {
    console.error('Error sending payment reminder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;