import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Generic validation middleware
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

// Validation schemas
export const authSchemas = {
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(6).max(128).required(),
    email: Joi.string().email().optional()
  }),

  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  })
};

export const roomSchemas = {
  createRoom: Joi.object({
    name: Joi.string().min(1).max(100).required()
  }),

  joinRoom: Joi.object({
    room_code: Joi.string().length(6).required()
  }),

  addVideo: Joi.object({
    youtube_url: Joi.string().uri().required(),
    room_id: Joi.string().uuid().required()
  }),

  vote: Joi.object({
    video_id: Joi.string().uuid().required(),
    vote_type: Joi.number().valid(1, -1).required()
  })
};

// Query parameter validation
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

// URL parameter validation
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

// Common parameter schemas
export const paramSchemas = {
  roomId: Joi.object({
    roomId: Joi.string().uuid().required()
  }),

  videoId: Joi.object({
    videoId: Joi.string().uuid().required()
  }),

  userId: Joi.object({
    userId: Joi.string().uuid().required()
  })
};

// Query schemas
export const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  search: Joi.object({
    q: Joi.string().min(1).max(100).required(),
    limit: Joi.number().integer().min(1).max(20).default(10)
  })
};