import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';

export const nameRule = (field = 'name'): ValidationChain =>
  body(field).trim().notEmpty().withMessage('Name is required.');

export const emailRule = (field = 'email'): ValidationChain =>
  body(field).isEmail().withMessage('Please enter a valid email address.').normalizeEmail();

export const addressRule = (field = 'address'): ValidationChain =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage('Address is required.')
    .isLength({ max: 400 })
    .withMessage('Address cannot exceed 400 characters.');

export const roleRule = (field = 'role'): ValidationChain =>
  body(field)
    .optional()
    .isIn(['admin', 'user', 'owner'])
    .withMessage('Role must be one of admin, user or owner.');

export const ratingRule = (field = 'rating'): ValidationChain =>
  body(field).isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5.');

export function handleValidation(req: Request, res: Response, next: NextFunction) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({ errors: result.array() });
  }
  next();
}
