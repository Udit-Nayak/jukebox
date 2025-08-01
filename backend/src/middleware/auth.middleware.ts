import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import * as Joi from 'joi';


// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: 'admin' | 'user';
      };
    }
  }
}

// Authentication middleware
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required'
      });
      return;
    }

    // Verify token
    const decoded = authService.verifyToken(token);
    
    // Get full user info
    const user = await authService.getUserById(decoded.id);
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid token - user not found'
      });
      return;
    }

    // Add user to request
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: 'Invalid or expired token'
    });
    return;
  }
};

// Admin only middleware
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
    return;
  }

  next();
};

// Room admin middleware (checks if user is admin of specific room)
export const requireRoomAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const roomId = req.params.roomId || req.body.room_id;
    
    if (!roomId) {
      res.status(400).json({
        success: false,
        error: 'Room ID required'
      });
      return;
    }

    // Import here to avoid circular dependency
    const { roomService } = await import('../services/room.service');
    const room = await roomService.getRoomById(roomId);

    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found'
      });
      return;
    }

    if (room.admin_id !== req.user.id) {
      res.status(403).json({
        success: false,
        error: 'Room admin access required'
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error verifying room admin status'
    });
    return;
  }
};
// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = authService.verifyToken(token);
      const user = await authService.getUserById(decoded.id);

      if (user) {
        req.user = {
          id: user.id,
          username: user.username,
          role: user.role
        };
      }
    }

    // Always continue, even if no token or invalid token
    next();
  } catch (error) {
    // Log error but don't block request
    console.error('Optional auth error:', error);
    next();
  }
};

// Rate limiting middleware (basic implementation)
export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    const clientData = requests.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      requests.set(clientId, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }
    
    if (clientData.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later'
      });
      return;
    }
    
    clientData.count++;
    next();
  };
};
// User ownership middleware (checks if user owns the resource)
export const requireOwnership = (resourceIdParam: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const resourceId = req.params[resourceIdParam];
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: `${resourceIdParam} parameter required`
        });
      }

      // For admin users, skip ownership check
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if the resource belongs to the user
      if (resourceId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - resource ownership required'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Error verifying resource ownership'
      });
    }
  };
};

// Middleware to check multiple roles
export const requireRoles = (...roles: Array<'admin' | 'user'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied - requires one of: ${roles.join(', ')}`
      });
      return;
    }

    next();
  };
};

// Middleware to validate request body
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message
      });
      return;
    }
    
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.query);
    
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message
      });
      return;
    }
    
    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.params);
    
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message
      });
      return;
    }
    
    next();
  };
};