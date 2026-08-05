import mongoose, { Document, Schema } from 'mongoose';

export interface IJobCheckpoint extends Document {
  jobId: string;
  projectId: mongoose.Types.ObjectId;
  currentStage: number;
  completedStages: number[];
  stageOutputs: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const jobCheckpointSchema = new Schema<IJobCheckpoint>(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    currentStage: { type: Number, required: true, default: 1 },
    completedStages: { type: [Number], default: [] },
    stageOutputs: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const JobCheckpoint = mongoose.model<IJobCheckpoint>('JobCheckpoint', jobCheckpointSchema);
