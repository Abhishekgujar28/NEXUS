import mongoose from 'mongoose';

const stageSchema = new mongoose.Schema({
  name: String,
  status: { type: String, enum: ['pending', 'running', 'complete', 'failed'], default: 'pending' },
  startedAt: Date,
  completedAt: Date,
  error: String,
}, { _id: false });

const researchJobSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  status: { type: String, enum: ['pending', 'running', 'complete', 'failed'], default: 'pending' },
  stages: [stageSchema],
  startedAt: Date,
  completedAt: Date,
  error: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

export default mongoose.model('ResearchJob', researchJobSchema);
