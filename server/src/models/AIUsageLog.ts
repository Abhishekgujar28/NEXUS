import mongoose from 'mongoose';

const aiUsageLogSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, index: true },
    model: { type: String, required: true, index: true },
    taskCategory: { type: String, default: 'general' },
    latencyMs: { type: Number, required: true },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 },
    fallbackUsed: { type: Boolean, default: false },
    retriesCount: { type: Number, default: 0 },
    success: { type: Boolean, default: true },
    error: String,
  },
  { timestamps: true }
);

aiUsageLogSchema.index({ createdAt: -1 });

export default mongoose.model('AIUsageLog', aiUsageLogSchema);
