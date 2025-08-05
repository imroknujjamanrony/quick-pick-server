// do the rest of the code

import dotenv from "dotenv";
import connectDb from "./db/connectDb.js";
import { app } from "./app.js";

dotenv.config();

connectDb()
  .then(() => {
    app.listen(process.env.PORT || 5000, () => {
      console.log(`server running on : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("mongodb connection error", err);
  });
