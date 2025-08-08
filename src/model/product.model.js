import mongoose, { Schema, Types } from "mongoose";

const productSchema = new Schema(
  {
    productname: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    images: [
      {
        type: String,
      },
    ],
    sku: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
    },
    oldPrice: {
      type: Number,
      default: null,
    },
    type: {
      type: String,
      enum: ["ORGANIC", "CHEMICAL"],
    },
    offer: {
      type: Number,
    },
    quantity: {
      type: Number,
      required: true,
    },
    owner : {
      type : Schema.Types.ObjectId,
      ref : "User"
    }
  },
  { timestamps: true }
);

export const Product = mongoose.model("Porudct", productSchema);
