import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
  description: { type: String, required: true, minlength: 10, maxlength: 2000 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['draft', 'researching', 'complete'], default: 'draft' },
  domain: String,
  targetUsers: String,
  platform: String,
  preferredTech: String,
  constraints: String,
  teamSize: { type: Number, min: 1, max: 100 },
  timeline: String,
  skillLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
  researchProgress: { type: Number, default: 0, min: 0, max: 100 },
  confidenceScore: { type: Number, default: 0, min: 0, max: 100 },
  healthScore: { type: Number, default: 0, min: 0, max: 100 },
  tags: [String],
}, { timestamps: true });

export default mongoose.model('Project', projectSchema);
