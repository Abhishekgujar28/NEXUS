import { Router } from 'express';
import {
  addProjectMember,
  createProject,
  deleteProject,
  getProject,
  getProjectStats,
  listProjects,
  removeProjectMember,
  updateProject,
} from '../controllers/project.controller.js';
import { verifyAuth } from '../middleware/auth.middleware.js';
import { projectAuth } from '../middleware/projectAuth.js';
import { validate } from '../middleware/validate.middleware.js';
import { addMemberSchema, createProjectSchema, updateProjectSchema } from '../schemas/project.schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(verifyAuth);

router.get('/', asyncHandler(listProjects));
router.post('/', validate(createProjectSchema), asyncHandler(createProject));
router.get('/:id', projectAuth('viewer'), asyncHandler(getProject));
router.put('/:id', projectAuth('editor'), validate(updateProjectSchema), asyncHandler(updateProject));
router.delete('/:id', projectAuth('owner'), asyncHandler(deleteProject));
router.get('/:id/stats', projectAuth('viewer'), asyncHandler(getProjectStats));
router.post('/:id/members', projectAuth('owner'), validate(addMemberSchema), asyncHandler(addProjectMember));
router.delete('/:id/members/:userId', projectAuth('owner'), asyncHandler(removeProjectMember));

export default router;
