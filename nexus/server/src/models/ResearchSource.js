import mongoose from 'mongoose';

const researchSourceSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchJob' },
  sourceType: { type: String, enum: ['paper', 'article', 'repo', 'dataset', 'api', 'web'], required: true },
  title: { type: String, required: true },
  url: String,
  authors: [String],
  publishedAt: Date,
  snippet: String,
  content: String,
  metadata: mongoose.Schema.Types.Mixed,
  query: String,
  relevanceScore: { type: Number, default: 0, min: 0, max: 1 },
  credibilityScore: { type: Number, default: 0, min: 0, max: 1 },
  evidenceScore: { type: Number, default: 0, min: 0, max: 1 },
}, { timestamps: true });

export default mongoose.model('ResearchSource', researchSourceSchema);
