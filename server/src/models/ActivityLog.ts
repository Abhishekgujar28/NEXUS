import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: [
        'project_created',
        'research_started',
        'research_completed',
        'research_failed',
        'research_cancelled',
        'gap_discovered',
        'architecture_generated',
        'roadmap_generated',
        'task_completed',
        'member_added',
      ],
      required: true,
    },
    message: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

activityLogSchema.index({ projectId: 1, createdAt: -1 });

export default mongoose.model('ActivityLog', activityLogSchema);
