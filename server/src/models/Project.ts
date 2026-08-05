import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    description: { type: String, required: true, minlength: 10, maxlength: 4000 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['draft', 'researching', 'complete', 'failed', 'deleted'], default: 'draft' },
    domain: String,
    projectType: String,
    targetUsers: String,
    platform: String,
    preferredTech: { type: [String], default: [] },
    constraints: String,
    teamSize: { type: Number, min: 1, max: 100 },
    timeline: String,
    skillLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
    researchProgress: { type: Number, default: 0, min: 0, max: 100 },
    confidenceScore: { type: Number, default: 0, min: 0, max: 100 },
    healthScore: { type: Number, default: 0, min: 0, max: 100 },
    // Structured AI output persisted on the project for quick workspace reads
    problemUnderstanding: mongoose.Schema.Types.Mixed,
    tags: [String],
  },
  { timestamps: true }
);

projectSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model('Project', projectSchema);
