import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createError } from './errorHandler';

// Validation schemas
const registrationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).max(100).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const presentationRequestSchema = Joi.object({
  useCase: Joi.string().min(5).max(500).required(),
  customer: Joi.string().min(2).max(100).required(),
  industry: Joi.string().min(2).max(100).required(),
  targetAudience: Joi.string().max(200).optional(),
  presentationLength: Joi.string().valid('short', 'medium', 'long').optional(),
  style: Joi.string().valid('professional', 'creative', 'minimalist', 'corporate').optional(),
  additionalRequirements: Joi.string().max(1000).optional()
});

const scrapingRequestSchema = Joi.object({
  query: Joi.string().min(3).max(200).required(),
  industry: Joi.string().min(2).max(100).required(),
  maxResults: Joi.number().min(1).max(50).optional()
});

// Validation middleware functions
export const validateRegistration = (req: Request, res: Response, next: NextFunction) => {
  const { error } = registrationSchema.validate(req.body);
  if (error) {
    next(createError(error.details[0].message, 400));
  } else {
    next();
  }
};

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    next(createError(error.details[0].message, 400));
  } else {
    next();
  }
};

export const validatePresentationRequest = (req: Request, res: Response, next: NextFunction) => {
  const { error } = presentationRequestSchema.validate(req.body);
  if (error) {
    next(createError(error.details[0].message, 400));
  } else {
    next();
  }
};

export const validateScrapingRequest = (req: Request, res: Response, next: NextFunction) => {
  const { error } = scrapingRequestSchema.validate(req.body);
  if (error) {
    next(createError(error.details[0].message, 400));
  } else {
    next();
  }
};
