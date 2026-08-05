import mongoose, { Schema, Document, Model } from 'mongoose';

export interface CitationItem {
  index: number;
  title: string;
  url: string;
  sourceType: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: CitationItem[];
  createdAt: Date;
}

export interface ConversationDocument extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const CitationSchema = new Schema<CitationItem>(
  {
    index: { type: Number, required: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    sourceType: { type: String, required: true },
  },
  { _id: false }
);

const ConversationMessageSchema = new Schema<ConversationMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    citations: [CitationSchema],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ConversationSchema = new Schema<ConversationDocument>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, default: 'New Conversation' },
    messages: [ConversationMessageSchema],
  },
  {
    timestamps: true,
  }
);

ConversationSchema.index({ projectId: 1, userId: 1, updatedAt: -1 });

const Conversation: Model<ConversationDocument> =
  mongoose.models.Conversation || mongoose.model<ConversationDocument>('Conversation', ConversationSchema);

export default Conversation;
