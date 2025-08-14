import express from "express";
import cors from "cors";
import dotenv from "dotenv";
const port = process.env.PORT || 5000;
import { MongoClient, ObjectId, ServerApiVersion, Timestamp } from "mongodb";
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

const allowedOrigins = [
  'https://quickpick-49e4b.web.app',
  'http://localhost:5173'
];

app.use(
  cors({
    origin: 'https://quickpick-49e4b.web.app/ ',
    credentials: true,
  })
);

app.use(express.json());

const uri =
  process.env.MONGO_URI ||
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.zb1tr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
      res.send(result)
    })

    app.get("/jinStoreBlogsCollection/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id)}
      const result = await jinStoreBlogsCollection.findOne(query)
      res.send(result)
    })

  app.get('/blogsCollectionCount', async(req, res)=>{
    const count = await jinStoreBlogsCollection.estimatedDocumentCount()
    res.send({count})
  })


    // res.send(result);
    // });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//db collection
const database = client.db("quick_client");
const productDb = database.collection("products");

app.get("/", (req, res) => {
  res.send("Hello Team Nexus");
});

// add/post products
app.post("/products", upload.array("images", 5), async (req, res) => {
  const {
    productname,
    title,
    sku,
    description,
    category,
    price,
    quantity,
    isOrganic,
    seller,
  } = req.body;

  console.log(productname);

  const imageFiles = req?.files || [];
  console.log(imageFiles);

  if (!productname || !price || !quantity || !seller) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

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
      category,
      price: parseFloat(price),
      quantity: parseFloat(quantity),
      images: uploadedImages,
      isOrganic: Boolean(isOrganic),
      seller,
      isFeatured: false,
      createdAt: new Date(),
    };

    const result = await productDb.insertOne(product);
    res
      .status(201)
      .json(new ApiResponse(201, result, "Product posted successfully"));
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json(new ApiError(500, "filed to add product", error));
  }
});

//get all products && filter products
app.get("/products", async (req, res) => {
  const {
    category = "",
    minPrice,
    maxPrice,
    searchValue,
    isOrganic,
    page = 1,
    limit = 100,
  } = req.query;

  let query = {};

  if (category) query.category = category;

  if (typeof isOrganic !== "undefined") {
    query.isOrganic = isOrganic === "true";
  }
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  if (searchValue) {
    query.$or = [
      {
        productname: { $regex: `.*${searchValue}.*`, $options: "i" },
      },
    ];
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  try {
    const products = await productDb
      .find(query)
      .skip(skip)
      .limit(limitNum)
      .toArray();

    const total = await productDb.countDocuments(query);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          total,
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          products,
        },
        "Products fetched successfully"
      )
    );
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({
      status: "error",
      data: null,
      message: "Internal Server Error",
    });
  }
});

//get single product
app.get("/product/:id", async (req, res) => {
  console.log("router hited");
  const { id } = req.params;
  console.log(id);
  try {
    const product = await productDb.findOne({ _id: new ObjectId(id) });
    // console.log("after 2nd update", product);
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

//update product
app.put("/product/:id", upload.array("image", 5), async (req, res) => {
  const { id } = req.params;
  const {
    productname,
    title,
    sku,
    description,
    category,
    price,
    quantity,
    isOrganic,
    seller,
  } = req.body;

  console.log(isOrganic);

  // const imageFiles = req?.files || [];
  const porduct = await productDb.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        productname,
        title,
        sku,
        description,
        category,
        price: parseFloat(price),
        quantity: parseFloat(quantity),
        isOrganic: Boolean(isOrganic),
        seller,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  if (!porduct) {
    return res.status(404).json(new ApiError(404, "Product not found"));
  }

  res
    .status(200)
    .json(new ApiResponse(200, porduct, "Product updated successfully"));
});

//update product image
app.patch("/productImage/:id", upload.array("image", 5), async (req, res) => {
  const { id } = req.params;
  console.log(id);
  const imageFiles = req?.files || [];
  console.log(imageFiles);

  try {
    const product = await productDb.findOne({ _id: new ObjectId(id) });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const uploadedImages = [];
    for (const file of imageFiles) {
      const uploadedUrl = await uploadOnCloudinary(file.path);
      if (uploadedUrl) {
        uploadedImages.push(uploadedUrl);
      }
    }

    await productDb.updateOne(
      { _id: new ObjectId(id) },
      { $set: { images: uploadedImages } }
    );

    const updatedProduct = await productDb.findOne({ _id: new ObjectId(id) });

    return res.status(200).json({
      status: 200,
      data: updatedProduct,
      message: "Product images updated",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

//delete product image
app.patch("/productImage/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const product = await productDb.findOne({ _id: new ObjectId(id) });
    if (!product) {
      return res.status(404).json(new ApiError(404, "Product not found"));
    }

    await productDb.updateOne(
      { _id: new ObjectId(id) },
      { $unset: { images: "" } }
    );

    const updatedProduct = await productDb.findOne({ _id: new ObjectId(id) });
    // console.log("after update : ", updatedProduct);

    return res.status(200).json({
      status: 200,
      data: updatedProduct,
      message: "Product image deleted",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

//add featured product
app.patch(`/feature-product/:id`, async (req, res) => {
  const { id } = req.params;
  const { isFeatured } = req.body;

  try {
    const product = await productDb.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { isFeatured: Boolean(isFeatured) } },
      { returnDocument: "after" }
    );

    if (!product) {
      return res.status(404).json(new ApiError(404, "Product not found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          product,
          product.isFeatured
            ? "✅ Product added to featured list"
            : "❌ Product removed from featured list"
        )
      );
  } catch (error) {
    return res.status(500).json(new ApiError(500, error.message));
  }
});

//add organic product
app.patch(`/orgaanic-product/:id`, async (req, res) => {
  const { id } = req.params;
  const { isOrganic } = req.body;
  console.log(id, isOrganic);

  try {
    const product = await productDb.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { isOrganic: Boolean(isOrganic) } },
      { returnDocument: "after" }
    );

    if (!product) {
      return res.status(404).json(new ApiError(404, "Product not found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          product,
          product.isOrganic
            ? "✅ Product added to organic list"
            : "❌ Product removed from organic list"
        )
      );
  } catch (error) {
    return res.status(500).json(new ApiError(500, error.message));
  }
});

app.listen(port, () => {
  console.log(`${port}`);
});
