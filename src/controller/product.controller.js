import { Product } from "../model/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createProduct = async (req, res) => {
  try {
    const {
      productname,
      description,
      imageUrl,   // assuming a single image for now
      price,
      quantity,
      sku,
    } = req.body;

    // Check if required fields are present
    if (!productname || !description || !imageUrl || !price || !quantity || !sku) {
      throw new ApiError(400, "All product fields are required");
    }

    const newProduct = await Product.create({
      productname,
      description,
      images: imageUrl,  // assuming you're storing multiple images as an array
      price,
      quantity,
      sku,
    });

    return res.status(201).json(new ApiResponse(201, newProduct, "Product uploaded successfully"));
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Something went wrong while creating the product",
    });
  }
};


export {createProduct}