import { User } from "../model/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateToken = async (_id) => {
  const user = await User.findById(_id);

  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();
  user.refreshToken = refreshToken;

  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

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

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    throw new ApiError(400, "all fields are must required");

  const user = await User.findOne({ email });
  console.log(user);
  if (!user) throw new ApiError(401, "user doesnot exist,please register");

  const cheackPassword = await user.isPasswordCorrect(password);
  if (!cheackPassword) throw new ApiError(404, "invalid credentilas");

  const { accessToken, refreshToken } = await generateToken(user?._id);

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken)
    .cookie("refreshToken", refreshToken)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken },
        "User logged in successfull"
      )
    );
};

const logOutUser = async (req, res) => {
  const token = req.user;

  await User.findByIdAndUpdate(
    token?._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, [], "user logged out successfull"));
};



export { registerUser, loginUser, logOutUser };
