import mongoose from 'mongoose';

const existingSolutionSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    researchJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchJob', required: true, index: true },
    name: { type: String, required: true },
    description: String,
    url: String,
    category: String,
    features: [String],
    strengths: [String],
    limitations: [String],
    pricingModel: String,
    technologies: [String],
    relevanceScore: { type: Number, default: 0, min: 0, max: 1 },
    similarityScore: { type: Number, default: 0, min: 0, max: 1 },
    sourceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ResearchSource' }],
  },
  { timestamps: true }
);

export default mongoose.model('ExistingSolution', existingSolutionSchema);
