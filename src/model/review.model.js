import mongoose, { Schema } from "mongoose";

const reviewSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    commnet: {
      type: String,
      required: true,
    },
    rattings: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export const Review = mongoose.model("Review", reviewSchema);
