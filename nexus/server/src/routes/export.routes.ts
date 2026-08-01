import { Router } from 'express';
import { requestExport } from '../controllers/export.controller.js';
import { verifyAuth } from '../middleware/auth.middleware.js';
import { projectAuth } from '../middleware/projectAuth.js';
import { validate } from '../middleware/validate.middleware.js';
import { exportReportSchema } from '../schemas/export.schema.js';

const router = Router();

router.get(
  '/:id/:format',
  verifyAuth,
  projectAuth('viewer'),
  validate(exportReportSchema),
  requestExport
);

export default router;
