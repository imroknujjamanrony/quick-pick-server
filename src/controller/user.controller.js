import { User } from "../model/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = async (req, res) => {
  const { username, fullname, email, password } = req.body;
  console.log(username);

  if (!username || !fullname || !email || !password)
    throw new ApiError(400, "all fields are required");

  const isExisted = await User.findOne({ email });

  if (isExisted) throw new ApiError(409, "user allready exist! please login");

  const newUser = await User.create({
    username,
    fullname,
    email,
    password,
  });

  const createdUser = await User.findById(newUser?._id).select("-password");
  console.log(createdUser);

  if (!createdUser) throw new ApiError(500, "something went wrong");
  return res
    .status(200)
    .json(new ApiResponse(200, createdUser, "user register successfull"));
};




export { registerUser };
