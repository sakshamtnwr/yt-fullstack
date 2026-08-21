import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asynchandler } from "../utils/asynchandler.js";
import { User } from "../models/user.model.js";





export const verifyJWT = asynchandler( async(req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        console.log("token", token);
        if (!token) {
            throw new ApiError(401, "unauthorized token")
            
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        )
    
        if (!user) {
            throw new ApiError(401,"Invalid Access Token")
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(500, error?.message || "Invalid ACCESS TOKEN")
        
    }

})


