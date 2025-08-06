import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../model/user.model.js";

const verifyJwt = async (req, res, next) => {
  const token = req?.cookies?.accessToken;
  if (!token) throw new ApiError(404, "unautoruzed action");

  const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

  const user = await User.findById(decodeToken?._id);

  if (!user) throw new ApiError(401, "invaild access token");

  req.user = user;
  next();
};

export {verifyJwt}