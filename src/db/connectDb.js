import mongoose from "mongoose";

const connectDb = async () => {
  try {
    const connectionToDb = await mongoose.connect(`${process.env.MONGO_URI}`);

    console.log(
      `\n mongodb connected. db host : ${connectionToDb.connection.name}`
    );
  } catch (error) {
    console.log("mongodb connection error", error);
    process.exit(1);
  }
};

export default connectDb;
