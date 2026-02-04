import { Router } from 'express';

const router = Router();

// POST /api/auth/login - Mock login
router.post('/login', (req, res) => {
  // TODO: Implement real auth
  res.json({
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Demo User',
      role: 'Admin',
      workspaceId: 'workspace-1'
    },
    token: 'mock-jwt-token'
  });
});

export default router;