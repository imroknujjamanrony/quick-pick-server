import { Router } from "express";
import { loginUser, logOutUser, registerUser } from "../controller/user.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/log-out").post(verifyJwt, logOutUser);

export default router;
