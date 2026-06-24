import { Router } from 'express';
import * as auth from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/google', asyncHandler(auth.googleStart));
router.get('/google/callback', asyncHandler(auth.googleCallback));
router.get('/me', authenticate, asyncHandler(auth.me));

export default router;
