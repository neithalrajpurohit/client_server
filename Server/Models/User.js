import mongoose, { Mongoose } from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String },
    password: { type: String },
    isOnline: { type: Boolean, default: false },
    socketId: { type: String },
    recentMessage: { type: String },
    time: { type: Date },
    isSeen: { type: Boolean, default: false },
    otpEnabled: { type: Boolean, default: false },
    otpVerified: { type: Boolean, default: false },
    otpAuthUrl: { type: String },
    otpSecret: { type: String },
    mfaEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("user", UserSchema);
