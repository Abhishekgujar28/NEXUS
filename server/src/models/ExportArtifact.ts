import mongoose, { Document, Schema } from 'mongoose';

export type ExportFormat = 'pdf' | 'docx' | 'markdown' | 'html' | 'json';

export interface IExportArtifact extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  format: ExportFormat;
  title: string;
  fileKey: string;
  downloadUrl: string;
  fileSizeBytes?: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const exportArtifactSchema = new Schema<IExportArtifact>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    format: {
      type: String,
      enum: ['pdf', 'docx', 'markdown', 'html', 'json'],
      required: true,
    },
    title: { type: String, required: true },
    fileKey: { type: String, required: true },
    downloadUrl: { type: String, required: true },
    fileSizeBytes: { type: Number },
    expiresAt: { type: Date, index: { expires: 0 } },
  },
  { timestamps: true }
);

export const ExportArtifact = mongoose.model<IExportArtifact>('ExportArtifact', exportArtifactSchema);
