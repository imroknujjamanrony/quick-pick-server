import express from "express";
import cors from "cors";
import dotenv from "dotenv";
const port = process.env.PORT || 5000;
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import { ApiResponse } from "./utils/ApiResponse.js";
import { ApiError } from "./utils/ApiError.js";
import multer from "multer";
import { uploadOnCloudinary } from "./utils/cloudninary.js";

dotenv.config();

const app = express();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });
app.use(cors());
app.use(express.json());

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.zb1tr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const uri =
  "mongodb+srv://carDoctor:djmD2MEoD0G0UyTG@cluster0.b3shiyx.mongodb.net/quick_client_?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    //blogs related APIs
    const jinStoreBlogsCollection = client
      .db("Jinstore")
      .collection("jinStoreBlogsCollection");

    app.get("/jinStoreBlogsCollection", async (req, res) => {
      const cursor = jinStoreBlogsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//dbv collection

const database = client.db("quick_client");
const productDb = database.collection("products");

app.get("/", (req, res) => {
  res.send("Hello Team Nexus");
});

//post products
app.post("/products", upload.array("image", 5), async (req, res) => {
  const {
    productname,
    title,
    sku,
    description,
    price,
    quantity,
    isOrganic,
    seller,
  } = req.body;

  const imageFiles = req?.files;

  try {
    const uploadedImages = [];

    for (const file of imageFiles) {
      const uploadedUrl = await uploadOnCloudinary(file.path);
      if (uploadedUrl) {
        uploadedImages.push(uploadedUrl);
      }
    }
    const product = {
      productname,
      title,
      sku,
      description,
      price,
      quantity,
      images: uploadedImages,
      isOrganic,
      seller,
    };

    const result = await productDb.insertOne(product);
    res
      .status(201)
      .json(new ApiResponse(200, result, "product posted successfully"));
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add product",
      error: error.message,
    });
  }
});

//get all products && filter products
app.get("/products", async (req, res) => {
  const {
    category,
    minPrice,
    maxPrice,
    search,
    isOrganic,
    page = 1,
    limit = 10,
  } = req.query;

  const query = {};

  if (category) query.category = category;
  if (isOrganic) query.isOrganic = isOrganic === true;

  if (minPrice || maxPrice) {
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  if (search) {
    query.$or = [{ productname: { $regex: search, $options: "i" } }];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const products = await productDb
    .find(query)
    .skip(skip)
    .limit(parseInt(limit))
    .toArray();
  const total = await productDb.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        total,
        currentcPage: page,
        totalPages: Math.ceil(total / limit),
        products,
      },
      "product fetched successfully"
    )
  );
});

//get single product
app.get("/product/:id", async (req, res) => {
  const { id } = req.params;
  console.log(id);
  try {
    const product = await productDb.findOne({ _id: new ObjectId(id) });
    console.log(product);
    return res
      .status(200)
      .json(new ApiResponse(200, product, "single product fetched"));
  } catch (error) {
    throw new ApiError(
      500,
      "internal server problem while fatching single product"
    );
  }
});

//delete product
app.delete("/product/:id", async (req, res) => {
  const { id } = req.params;
  console.log(id);
  try {
    const product = await productDb.findOneAndDelete({ _id: new ObjectId(id) });
    console.log(product);
    return res
      .status(200)
      .json(new ApiResponse(200, product, "product deleted"));
  } catch (error) {
    throw new ApiError(
      500,
      "internal server problem while fatching deleting product"
    );
  }
});

app.listen(port, () => {
  console.log(`${port}`);
});
