import mongoose from 'mongoose';

const innovationGapSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    researchJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchJob', required: true, index: true },
    title: { type: String, required: true },
    description: String,
    opportunity: String,
    category: {
      type: String,
      enum: ['feature', 'technical', 'cost', 'ux', 'integration', 'scalability', 'user', 'research'],
      default: 'feature',
    },
    impact: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    difficulty: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    confidence: { type: Number, default: 0, min: 0, max: 1 },
    affectedSolutions: [String],
    evidenceSourceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ResearchSource' }],
  },
  { timestamps: true }
);

export default mongoose.model('InnovationGap', innovationGapSchema);
