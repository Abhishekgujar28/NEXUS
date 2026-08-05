import mongoose, { Document, Schema } from 'mongoose';

export interface IProviderMetricsLog extends Document {
  providerName: string;
  providerType: 'ai' | 'search';
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successes: number;
  lastFailureReason?: string;
  latencyMs?: number;
  timestamp: Date;
}

const providerMetricsLogSchema = new Schema<IProviderMetricsLog>(
  {
    providerName: { type: String, required: true, index: true },
    providerType: { type: String, enum: ['ai', 'search'], required: true },
    state: { type: String, enum: ['CLOSED', 'OPEN', 'HALF_OPEN'], required: true },
    failures: { type: Number, default: 0 },
    successes: { type: Number, default: 0 },
    lastFailureReason: { type: String },
    latencyMs: { type: Number },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export const ProviderMetricsLog = mongoose.model<IProviderMetricsLog>(
  'ProviderMetricsLog',
  providerMetricsLogSchema
);
