import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const Db = await mongoose.connect(process.env.DB_URL, {
      dbName: "chatapp",
    });
    console.log("db connected");
  } catch (err) {
    console.log(err);
  }
};
