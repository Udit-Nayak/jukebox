import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { validateRequest, authSchemas } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticateToken } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: {
    success: false,
    error: 'Too many registration attempts, please try again later'
  }
});

// POST /api/auth/register
router.post('/register',
  registerLimiter,
  validateRequest(authSchemas.register),
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password, email } = req.body;

    const user = await authService.register(username, password, email);
    const token = authService.generateToken(user);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      },
      message: 'User registered successfully'
    });
  })
);

// POST /api/auth/login
router.post('/login',
  authLimiter,
  validateRequest(authSchemas.login),
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    const user = await authService.login(username, password);
    const token = authService.generateToken(user);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      },
      message: 'Login successful'
    });
  })
);

// GET /api/auth/me
router.get('/me',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getUserById(req.user!.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        }
      }
    });
  })
);

// POST /api/auth/refresh
router.post('/refresh',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getUserById(req.user!.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const token = authService.generateToken(user);

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      },
      message: 'Token refreshed successfully'
    });
  })
);

// POST /api/auth/create-admin (for initial setup)
router.post('/create-admin',
  validateRequest(authSchemas.register),
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password, email } = req.body;

    try {
      const admin = await authService.createAdminUser(username, password, email);
      const token = authService.generateToken(admin);

      return res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            role: admin.role
          }
        },
        message: 'Admin user created successfully'
      });
    } catch (error: any) {
      if (error.message === 'Admin user already exists') {
        return res.status(409).json({
          success: false,
          error: 'Admin user already exists'
        });
      }
      throw error;
    }
  })
);

export default router;