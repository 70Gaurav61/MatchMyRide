import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";

const verifyJWT = async(req, res, next) => {

    try {
        const accessToken = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if(!accessToken)
            return res.status(401).json({ message: "Not authenticated, token not found" });
        
        let decodedToken;
        try {
            decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        } catch (jwtError) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }
    
        const user = await User.findById(decodedToken._id).select("-password -refreshToken")
    
        req.user = user
    
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token")
    }

}

export { verifyJWT }