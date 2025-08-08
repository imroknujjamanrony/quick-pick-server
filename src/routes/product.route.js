import { Router } from "express";
import { createProduct } from "../controller/product.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = Router()

router.route('/post-product').post(verifyJwt,createProduct)

export default router
