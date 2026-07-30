import mongoose from 'mongoose';

const evidenceClaimSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    researchJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchJob', required: true, index: true },
    claim: { type: String, required: true },
    supportingSourceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ResearchSource' }],
    contradictingSourceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ResearchSource' }],
    confidence: { type: Number, default: 0, min: 0, max: 1 },
    reasoning: String,
    sourceQuality: { type: Number, default: 0, min: 0, max: 1 },
    relevance: { type: Number, default: 0, min: 0, max: 1 },
    freshness: { type: Number, default: 0, min: 0, max: 1 },
    evidenceScore: { type: Number, default: 0, min: 0, max: 1 },
  },
  { timestamps: true }
);

export default mongoose.model('EvidenceClaim', evidenceClaimSchema);
