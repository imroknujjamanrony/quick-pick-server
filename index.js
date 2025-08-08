import express from "express";
import cors from "cors";
import dotenv from "dotenv";
const port = process.env.PORT || 5000;
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import { ApiResponse } from "./utils/ApiResponse.js";
import { ApiError } from "./utils/ApiError.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.zb1tr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;



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
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


    //blogs related APIs
    const jinStoreBlogsCollection = client.db('Jinstore').collection('jinStoreBlogsCollection')

    app.get('/jinStoreBlogsCollection', async(req, res)=>{
      const cursor = jinStoreBlogsCollection.find()
      const result = await cursor.toArray();
      res.send(result)

    })





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
app.post("/products", async (req, res) => {
  const {
    productname,
    title,
    sku,
    description,
    price,
    quantity,
    image,
    isOrganic,
    seller,
  } = req.body;

  try {
    const product = {
      productname,
      title,
      sku,
      description,
      price,
      quantity,
      images: [image],
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

//get all products
app.get("/products", async (req, res) => {
  const result = await productDb.find().toArray();

  return res
    .status(200)
    .json(new ApiResponse(200, result, "all products fatched"));
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
