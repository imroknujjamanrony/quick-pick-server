import express from "express";
import cors from "cors";
import dotenv from "dotenv";
const port = process.env.PORT || 5000;
import { MongoClient, ObjectId, ServerApiVersion, Timestamp } from "mongodb";
import { ApiResponse } from "./utils/ApiResponse.js";
import { ApiError } from "./utils/ApiError.js";
import multer from "multer";
import { uploadOnCloudinary } from "./utils/cloudninary.js";
import { generateToken } from "./utils/generateToken.js";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

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

app.use(cookieParser());
const allowedOrigins = [
  "https://quickpick-49e4b.web.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: ["https://quickpick-49e4b.web.app/", "http://localhost:5173"],
    origin: allowedOrigins,
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
      res.send(result);
    });

    app.get("/jinStoreBlogsCollection/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jinStoreBlogsCollection.findOne(query);
      res.send(result);
    });

    app.get("/blogsCollectionCount", async (req, res) => {
      const count = await jinStoreBlogsCollection.estimatedDocumentCount();
      res.send({ count });
    });

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
const reviewDb = database.collection("reviews");
const usersCollection = database.collection("users");

app.get("/", (req, res) => {
  res.send("Hello Team Nexus");
});

// JWT Middleware
const verifyJWT = async (req, res, next) => {
  try {
    const token = req?.cookies?.accessToken;
    console.log('from verify jwt',token);
    if (!token) {
      throw new ApiError(401, "Unauthorized access");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //clg(decoded?.email, decoded?._id);

    const user = await usersCollection.findOne({
      $or: [{ _id: new ObjectId(decoded?._id) }, { email: decoded?.email }],
    });

    //clg(user);

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

//verify admin
const verifyAdmin = async (req, res, next) => {
  try {
    const user = req?.user;
    const isAdmin = user?.role == "ADMIN";

    if (!isAdmin == 'ADMIN') {
      return res.status(401).json(new ApiError(401, "Invalid access"));
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Register
app.post("/register", async (req, res, next) => {
  try {
    const { name, email } = req.body;
    //clg(email);

    const userData = {
      name,
      email,
      role: "CUSTOMER",
      createdAt: new Date(),
    };

    const response = await usersCollection.insertOne(userData);
    const user = await usersCollection.findOne({ _id: response.insertedId });

    const { token } = generateToken(user._id, user.email, user.name, user.role);

    const options = {
      httpOnly: true,
      secure: false,
    };

    return res
      .status(200)
      .cookie("accessToken", token, options)
      .json(new ApiResponse(201, user, "User registered successfully"));
  } catch (error) {
    throw new ApiError(401, "error while registering user");
  }
});

// Login
app.post("/login", async (req, res, next) => {
  try {
    const { email } = req.body;
    //clg(email);

    const updatedUser = await usersCollection.findOneAndUpdate(
      { email },
      { $set: { lastLoggedIn: new Date() } },
      { returnDocument: "after" }
    );
    // //clg(updatedUser)
    if (!updatedUser?._id) {
      throw new ApiError(404, "User not found");
    }

    const { _id, email: emai, name, role } = updatedUser;

    const { token } = generateToken(_id, emai, name, role);

    const options = {
      httpOnly: true,
      secure: false,
    };

    return res
      .status(200)
      .cookie("accessToken", token, options)
      .json(new ApiResponse(200, updatedUser, "User logged in successfully"));
  } catch (error) {
    throw new ApiError(401, "Invalid or expired token");
  }
});

// Logout
app.post("/logout", verifyJWT, async (req, res, next) => {
  try {
    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .clearCookie("accessToken", options)
      .status(200)
      .json(new ApiResponse(200, {}, "Logged out successfully"));
  } catch (error) {
    throw new ApiError(401, "Invalid or expired token");
  }
});

// add/post products
app.post(
  "/products",
  upload.array("images", 5),
  verifyJWT,
  verifyAdmin,
  async (req, res) => {
    const {
      productname,
      title,
      sku,
      description,
      category,
      price,
      quantity,
      isOrganic,
    } = req.body;

    const seller = req?.user?._id;
    //clg("seller id", seller);
    const imageFiles = req?.files || [];
    // //clg(imageFiles);

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
        seller: new ObjectId(seller),
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
  }
);

//get all products && filter products
app.get("/products", async (req, res) => {
  const {
    category = "",
    minPrice,
    maxPrice,
    searchValue,
    isOrganic,
    newArivals,
    featureProducts,
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

  if (newArivals) {
    const products = await productDb
      .find()
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    // //clg(products);
    return res
      .status(200)
      .json(
        new ApiResponse(200, products, "New arrivals fetched successfully")
      );
  }

  if (featureProducts) {
    const products = await productDb
      .find({ isFeatured: true })
      .limit(6)
      .toArray();

    //clg("feature prioductss", products);

    return res
      .status(200)
      .json(
        new ApiResponse(200, products, "New arrivals fetched successfully")
      );
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
  //clg("router hited");
  const { id } = req.params;
  //clg(id);
  try {
    const product = await productDb.findOne({ _id: new ObjectId(id) });
    // //clg("after 2nd update", product);
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
app.delete("/product/:id", verifyJWT, verifyAdmin, async (req, res, next) => {
  const { id } = req.params;
  //clg(id);
  try {
    const product = await productDb.findOneAndDelete({ _id: new ObjectId(id) });
    //clg(product);
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
app.put(
  "/product/:id",
  upload.array("image", 5),
  verifyJWT,
  verifyAdmin,
  async (req, res, next) => {
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
    } = req.body;

    // //clg(isOrganic);

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
  }
);

//update product image
app.patch(
  "/productImage/:id",
  upload.array("image", 5),
  verifyJWT,
  verifyAdmin,
  async (req, res) => {
    const { id } = req.params;
    console.log('prodcut id to update image',id)
    //clg(id);
    const imageFiles = req?.files || [];
    //clg(imageFiles);

    try {
      const product = await productDb.findOne({ _id: new ObjectId(id.toString()) });
      if (!product) {
        return res.status(404).json(new ApiError(404, "Product not found"));
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
  }
);

//delete product image
app.patch(
  "/productImage/:id",
  verifyJWT,
  verifyAdmin,
  async (req, res, next) => {
    const { id } = req.params;
    console.log('prodcut id to delete image',id)

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
      // //clg("after update : ", updatedProduct);

      return res.status(200).json({
        status: 200,
        data: updatedProduct,
        message: "Product image deleted",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

//add featured product
app.patch(
  `/feature-product/:id`,
  verifyJWT,
  verifyAdmin,
  async (req, res, next) => {
    const { id } = req.params;
    const { isFeatured } = req.body;
    // console.log(id)

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
  }
);

//add organic product
app.patch(
  `/orgaanic-product/:id`,
  verifyJWT,
  verifyAdmin,
  async (req, res, next) => {
    const { id } = req.params;
    const { isOrganic } = req.body;
    //clg(id, isOrganic);

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
  }
);

//post review
app.post("/review", verifyJWT, async (req, res, next) => {
  const { productId, userId, username, rating = 0, comment } = req.body;
  //clg("from review :", productId, userId, username, rating, comment);

  if (!productId || !userId) {
    return res.status(400).json(new ApiError(400, "Missing required fields"));
  }

  try {
    const review = {
      productId,
      userId,
      username,
      rating: parseFloat(rating),
      comment,
      createdAt: new Date(),
    };

    const result = await reviewDb.insertOne(review);
    // //clg(result);

    return res
      .status(201)
      .json(new ApiResponse(201, result, "Review posted successfully"));
  } catch (error) {
    console.error("Error adding review:", error);
    res.status(500).json(new ApiError(500, "Failed to add review", error));
  }
});

//get reviews by productId
app.get("/reviews", async (req, res) => {
  const { productId } = req.query;
  //clg(productId);

  try {
    const review = await reviewDb.find({ productId }).toArray();

    if (!review.length) {
      return res
        .status(404)
        .json(new ApiError(404, "No reviews found for this product"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, review, "Reviews fetched successfully"));
  } catch (error) {
    console.error(error);
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
  }
});

//all users
app.get("/admin-users", verifyJWT, verifyAdmin, async (req, res, next) => {
  try {
    const users = await usersCollection.find().toArray();
    return res
      .status(200)
      .json(new ApiResponse(200, users, "users fetched successfully"));
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiError(500, "Internal Server Error from all user"));
  }
});

//delete user
app.delete(
  "/admin-users/:id",
  verifyJWT,
  verifyAdmin,
  async (req, res, next) => {
    const { id } = req.params;
    // //clg(id);
    try {
      const user = await usersCollection.findOneAndDelete({
        _id: new ObjectId(id),
      });
      if (!user) {
        return res.status(404).json(new ApiError(404, "User not found"));
      }
      return res
        .status(200)
        .json(new ApiResponse(200, user, "User deleted successfully"));
    } catch (error) {
      console.error(error);
      return res.status(500).json(new ApiError(500, "Failed to delete user"));
    }
  }
);

// update user role
app.patch("/admin-users", verifyJWT, verifyAdmin, async (req, res, next) => {
  //clg("PATCH /admin-users hit");
  // //clg("Body:", req.body);
  const { id, role } = req.body;

  try {
    const user = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { role } },
      { returnDocument: "after" }
    );
    // //clg(user);

    if (!user) {
      return res.status(404).json(new ApiError(404, "User not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, user, "User role updated successfully"));
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiError(500, "Failed to update user role"));
  }
});

app.listen(port, () => {
  //clg(`${port}`);
  console.log(`Server is running on port ${port}`);
});
