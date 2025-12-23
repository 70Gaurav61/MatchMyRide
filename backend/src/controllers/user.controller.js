import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const registerUser = async(req, res) => {

    try {
        const { email, fullName, gender, contactNumber, password, location } = req.body

        let avatarLocalPath;
        if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
            avatarLocalPath = req.files.avatar[0].path
        }

        if( 
            [ email, fullName, password, gender].some((field) => (
            field?.trim() === "" || !field))
        ) {
            throw new ApiError(400, `email, fullName, password all are required`)
        }

        if(gender !== "Male" && gender !== "Female") {
            throw new ApiError(400, `gender must be either "Male" or "Female"`)
        }

        let coordinates = [0, 0];
        if (location) {
            if (Array.isArray(location)) {
                coordinates = location.map(Number);
            } else if (typeof location === 'string') {
                // Remove brackets and split by comma
                const cleaned = location.replace(/[[\]\s]/g, '');
                coordinates = cleaned.split(',').map(Number);
            }

            if (coordinates.length !== 2 || coordinates.some(isNaN)) {
                throw new ApiError(400, 'Invalid location format. Expected two numeric values.');
            }
        }

        const existingUser = await User.findOne({email})
        
        if(existingUser) {
            throw new ApiError(409, "User with same email already exists")
        }
        
        let avatar = ""
        if(avatarLocalPath) {
            avatar = await uploadOnCloudinary(avatarLocalPath)
        }

        const userLocation = { type: "Point", coordinates };

        const user = await User.create({
            email,
            fullName,
            gender,
            contactNumber,
            avatar: avatar?.url || null,
            location: userLocation,
            password        
        })

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )

        if(!createdUser) {
            throw new ApiError(500, "Internal error while registering new user")
        }

        return res
        .status(201)
        .json({
            user: createdUser,
            message: "User Created Successfully"
        })
    } catch (error) {
        return res
        .status(error.statusCode || 500)
        .json({
            message: error.message || "Internal server error"
        })
    }

}

const generateAccessAndRefreshToken = async(userId) => {

    try {

        const user = await User.findById(userId)
        
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
    
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
    
        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, error.message)        
    }
    
}

const secureCookieWithExpiry = {
    httpOnly: true, // deploy
    secure: true,
    sameSite: 'none',
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
}

const loginUser = async(req, res) => {

    try {
        const { email, password } = req.body
        
        if(!email) {
            throw new ApiError(400, "email is required")
        }

        if(!password) {
            throw new ApiError(400, "password field cannot be empty")
        }

        const user = await User.findOne({email})

        if(!user) {
            throw new ApiError(404, "user does not exists")
        }

        const isValidPassword = await user.isPasswordCorrect(password)
        if(!isValidPassword) {
            throw new ApiError(400, "Incorrect Password")
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

        const loggedInUser = user.toObject()
        delete loggedInUser.password
        delete loggedInUser.refreshToken

        return res
        .status(200)
        .cookie("accessToken", accessToken, secureCookieWithExpiry)
        .cookie("refreshToken", refreshToken, secureCookieWithExpiry)
        .json({
            user: loggedInUser,
            accessToken,
            refreshToken,
            message: "User Logged In Successfully"
        })
    } catch (error) {
        return res
        .status(error.statusCode || 500)
        .json({
            message: error.message || "Internal server error"
        })
    }

}

const logoutUser = async(req, res) => {

    try {
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $unset: {
                    refreshToken: 1
                }
            },
            {
                new: true
            }
        )

        const secureCookie = {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
        }

        return res
        .status(200)
        .clearCookie("accessToken", secureCookie)
        .clearCookie("refreshToken", secureCookie)
        .json({
            message: "User logged Out"
        })
    } catch (error) {
        return res
        .status(error.statusCode || 500)
        .json({
            message: error.message || "Internal server error"
        })
    }

}

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password -refreshToken")

    if (!user) {
      throw new ApiError(404, "User not found")
    }

    return res.status(200).json({ user })
  } catch (error) {
    return res
    .status(error.statusCode || 500)
    .json({
      message: error.message || "Internal server error"
    })
  }
}

const refreshAccessToken = async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

        if(!incomingRefreshToken) {
            throw new ApiError(401, "Refresh Token not found, please login again")
        }

        let decoded;
        try {
            decoded = jwt.verify( incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET )
        } catch (error) {
            throw new ApiError(401, "Invalid Refresh Token, please login again")
        }

        const user = await User.findById(decoded._id)

        if(!user || user.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Refresh Token mismatch, please login again")
        }

        const accessToken = user.generateAccessToken()

        return res
            .status(200)
            .cookie("accessToken", accessToken, secureCookieWithExpiry)
            .json({
                accessToken,
                message: "Access Token refreshed successfully"
            })
    } catch (error) {
        return res
        .status(error.statusCode || 500)
        .json({
            message: error.message || "Internal server error"
        })
    }
}

export { 
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    refreshAccessToken
}