import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();


export const generateToken =  (_id, email, name, role) => {
//  console.log(process.env.JWT_SECRET)
  const token = jwt.sign(
    {
      _id,
      name,
      email,
      role,
    },
    process.env.JWT_SECRET,
    {expiresIn : '7d'}
  );

  console.log(token)

  return {token};
};
