import mongoose from "mongoose";
const { Schema } = mongoose;

const GroupSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    admin: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    messages: [
      {
        type: Schema.Types.ObjectId,
        ref: "chat",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("group", GroupSchema);
