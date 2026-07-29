import mongoose from 'mongoose';

const researchSourceSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    researchJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchJob', index: true },
    provider: { type: String, enum: ['serper', 'github', 'arxiv', 'semanticScholar'], required: true },
    sourceType: { type: String, enum: ['paper', 'article', 'repo', 'dataset', 'api', 'web'], required: true },
    title: { type: String, required: true },
    url: String,
    authors: [String],
    publishedAt: Date,
    snippet: String,
    content: String,
    query: String,
    metadata: mongoose.Schema.Types.Mixed,
    relevanceScore: { type: Number, default: 0, min: 0, max: 1 },
    credibilityScore: { type: Number, default: 0, min: 0, max: 1 },
    retrievedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

researchSourceSchema.index({ projectId: 1, provider: 1 });
researchSourceSchema.index({ projectId: 1, url: 1 });

export default mongoose.model('ResearchSource', researchSourceSchema);
