import mongoose from 'mongoose';

export const RESEARCH_STAGES = [
  { key: 'understand', label: 'Understanding Idea' },
  { key: 'plan', label: 'Planning Queries' },
  { key: 'search_web', label: 'Searching Web' },
  { key: 'search_papers', label: 'Searching Papers' },
  { key: 'search_github', label: 'Searching GitHub' },
  { key: 'analyze', label: 'Analyzing Evidence' },
  { key: 'solutions', label: 'Finding Solutions' },
  { key: 'gaps', label: 'Discovering Gaps' },
  { key: 'stress', label: 'Stress Testing' },
  { key: 'architecture', label: 'Designing Architecture' },
  { key: 'roadmap', label: 'Generating Roadmap' },
] as const;

const stageSchema = new mongoose.Schema(
  {
    key: String,
    label: String,
    status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'skipped'], default: 'pending' },
    startedAt: Date,
    completedAt: Date,
    note: String,
    durationMs: { type: Number, min: 0 },
    retryCount: { type: Number, default: 0, min: 0 },
    errors: { type: [String], default: [] },
    warnings: { type: [String], default: [] },
    tokenUsage: {
      promptTokens: { type: Number, default: 0 },
      completionTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
    },
    estimatedCost: { type: Number, default: 0 },
  },
  { _id: false }
);

const researchJobSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed', 'cancelled'],
      default: 'queued',
      index: true,
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    stages: [stageSchema],
    sourceCount: { type: Number, default: 0 },
    startedAt: Date,
    completedAt: Date,
    error: String,
    cancelRequested: { type: Boolean, default: false },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

researchJobSchema.index({ projectId: 1, status: 1 });

export default mongoose.model('ResearchJob', researchJobSchema);
