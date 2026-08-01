import mongoose, { Document, Schema } from 'mongoose';

export type DiagramType =
  | 'flowchart'
  | 'sequence'
  | 'er'
  | 'component'
  | 'class'
  | 'deployment'
  | 'infrastructure';

export interface IDiagramArtifact extends Document {
  projectId: mongoose.Types.ObjectId;
  researchJobId: string;
  diagramType: DiagramType;
  title: string;
  mermaidSource: string;
  svgUrl?: string;
  pngUrl?: string;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const diagramArtifactSchema = new Schema<IDiagramArtifact>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    researchJobId: { type: String, required: true, index: true },
    diagramType: {
      type: String,
      enum: ['flowchart', 'sequence', 'er', 'component', 'class', 'deployment', 'infrastructure'],
      required: true,
    },
    title: { type: String, required: true },
    mermaidSource: { type: String, required: true },
    svgUrl: { type: String },
    pngUrl: { type: String },
    pdfUrl: { type: String },
  },
  { timestamps: true }
);

export const DiagramArtifact = mongoose.model<IDiagramArtifact>(
  'DiagramArtifact',
  diagramArtifactSchema
);
