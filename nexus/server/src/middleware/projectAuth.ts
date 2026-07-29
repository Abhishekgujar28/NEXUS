import { Request, Response, NextFunction } from 'express';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import { AppError, ErrorCodes } from '../core/errors.js';

type ProjectRole = 'owner' | 'editor' | 'viewer';

const rolePriority: Record<ProjectRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export const projectAuth =
  (minimumRole: ProjectRole = 'viewer') =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user?._id) {
        return next(new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED));
      }

      const projectId = req.params.id;
      if (!projectId) {
        return next(new AppError('Project id is required', 400, ErrorCodes.VALIDATION_ERROR));
      }

      const project = await Project.findById(projectId).select('userId status');
      if (!project || project.status === 'deleted') {
        return next(new AppError('Project not found', 404, ErrorCodes.NOT_FOUND));
      }

      let currentRole: ProjectRole | null = null;
      if (String(project.userId) === req.user._id) {
        currentRole = 'owner';
      } else {
        const membership = await ProjectMember.findOne({
          projectId: project._id,
          userId: req.user._id,
        }).select('role');
        if (membership?.role) {
          currentRole = membership.role as ProjectRole;
        }
      }

      if (!currentRole || rolePriority[currentRole] < rolePriority[minimumRole]) {
        return next(new AppError('Insufficient project permission', 403, ErrorCodes.FORBIDDEN));
      }

      req.projectRole = currentRole;
      return next();
    } catch (err) {
      return next(err);
    }
  };
