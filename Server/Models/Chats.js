import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    text: { type: String },
    time: { type: Date, default: Date.now() },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user" }, //pointing out the other user
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    image: { type: String },
    video: { type: String },
    location: { type: Object },
    sent: { type: Boolean, default: false },
    received: { type: Boolean, default: false },
    seen: { type: Boolean, default: false },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "group" },
  },
  { timestamps: true }
);

export default mongoose.model("chat", chatSchema);
