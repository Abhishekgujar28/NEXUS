import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  researchJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchJob', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchSource', required: true },
  sourceHash: { type: String, required: true },
  chunkHash: { type: String, required: true },
  chunkId: { type: String, required: true },
  embeddingModel: { type: String, required: true },
  status: { type: String, enum: ['pending', 'indexing', 'completed', 'failed'], default: 'pending', index: true },
  retryCount: { type: Number, default: 0 }, startedAt: Date, completedAt: Date, lastError: String,
}, { timestamps: true });
schema.index({ projectId: 1, chunkHash: 1, embeddingModel: 1 }, { unique: true });
schema.index({ researchJobId: 1, status: 1 });
export default mongoose.model('RagIndexState', schema);
