import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface UserDocument extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  avatar: string;
  plan: 'free' | 'pro' | 'team';
  refreshToken: string;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    avatar: { type: String, default: '' },
    plan: { type: String, enum: ['free', 'pro', 'team'], default: 'free' },
    refreshToken: { type: String, default: '', select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password as string);
};

export default mongoose.model<UserDocument>('User', userSchema);
