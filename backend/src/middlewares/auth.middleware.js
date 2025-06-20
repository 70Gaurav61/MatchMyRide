import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";

const verifyJWT = async(req, res, next) => {

    try {
        const accessToken = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if(!accessToken)
            throw new ApiError(401, "Unauthorised Access No Token")
        
        const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)
        if(!decodedToken)
            throw new ApiError(401, "Unauthorised Access Invalid Token")
    
        const user = await User.findById(decodedToken._id).select("-password -refreshToken")
    
        req.user = user
    
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token")
    }

}

export { verifyJWT }