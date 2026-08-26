import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens =  async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        
        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
        
    }
}


const registerUser = asynchandler( async(req,res) => {
    // get user detail from frontend
    // validation - not empty
    // check if user already exists : username, email
    // check for images : check for avatar(compulsory image)
    // upload them to cloudinary
    // create user object - create entry in db
    // remove password and refresh token fields in response
    // check for user creation
    // return response


    const { fullName, email, username, password } = req.body //form and json - req.body , url - {urlencoder?}
    console.log("email", email);
    
    
    /// completely ok but basic
    // if (fullName === "") {
    //     throw new ApiError(400, "fullName is required")
    // }  

    // advanced
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) 
    {
        throw new ApiError(400, "All fields are required")
    }
    // in professional environment there's seperate file for validation we simply call and check and in some startup we have to make the validation we want which is also simple code like like this mostly if else conditions

    //User.findOne({username})
    //User.findOne({email})
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with username or email already exists")
    }

    //console.log(req.files)

    const avatarLocalPath = req.files?.avatar[0]?.path; 
    // const coverImageLocalPath = req.files?.coverImage[0]?.path; TypeError: Cannot read properties of undefined
    let coverImageLocalPath; //CLASSIC WAY TO WRITE THE SAME THING AS ABOVE
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400,"Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })                                                                       

    const createduser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createduser) {
        throw new ApiError(500, "Something went wrong while registering ")    
    }

    return res.status(201).json(
        new ApiResponse(200, createduser,"User registered Successfully" )
    )



})


const loginUser = asynchandler( async(req,res) => {
    // req body -> data
    // username or email
    // find the user
    // check the password
    // Access and Refresh token
    // send cookie

    const {email, username, password} = req.body 

    // if (!(username || email)) {  alternative way to write the same thing as below
    //     throw new ApiError(400, "username or password is required")
    // }
    if (!username && !email) {
        throw new ApiError(400, "username or password is required")
    }

    // User.findOne({email})
    // User.findOne({username})
    const user = await User.findOne({
        $or: [{email}, {username}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exists")
    }
    
    const isPasswordValid = await user.isPasswordCorrect(password)
    
    if (!isPasswordValid) {
        throw new ApiError(401, "Password is invalid")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser, accessToken, refreshToken
            },
            "user loggedin successfully"
        )
    )

})

const logoutUser = asynchandler( async(req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 //this removes the field from the document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User logged out Successfully"))


})

const refreshAccessToken = asynchandler( async(req,res) => {
    const incomingrefreshToken = req.cookies?.refreshToken || req.header("Authorization")?.replace("Bearer ", "") || req.body?.refreshToken //why body? because some uses mobile and can be sent to us in body

    if (!incomingrefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingrefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (user?.refreshToken !== incomingrefreshToken) {
            throw new ApiError(401, "Refresh Token is expired or invalid")
        }
    
        const {accessToken, newRefreshToken} = await user.generateAccessTokenAndRefreshToken(user._id)
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken: newRefreshToken
                },
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, "Error while refreshing access token: " + error?.message)
    }

    //made by copilot by autosuggestion so damn cool but we will use our style too in between
    // User.findById(decodedToken?._id).select("-password -refreshToken").then((user) => {
    //     if (!user) {
    //         throw new ApiError(401, "Invalid refresh token")
    //     }

    //     if (user.refreshToken !== incomingrefreshToken) {
    //         throw new ApiError(401, "Invalid refresh token")
    //     }

    //     const accessToken = user.generateAccessToken()

    //     const options = {
    //         httpOnly: true,
    //         secure: true
    //     }

    //     return res
    //     .status(200)
    //     .cookie("accessToken", accessToken, options)
    //     .json(
    //         new ApiResponse(
    //             200,
    //             {
    //                 user, accessToken
    //             },
    //             "Access token generated successfully"
    //         )
    //     )   
})

const changeCurrentPassword = asynchandler( async(req,res) => {
    const {currentPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(currentPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Current password is incorrect")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Password changed successfully"))
})

const getCurrentUser = asynchandler( async(req,res) => {
    const user = await User.findById(req.user?._id).select("-password -refreshToken")

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Current user retrieved successfully"))
})

const updateAccountDetails = asynchandler( async(req,res) => {
    const { fullName, email } = req.body

    if (!(fullName) || !(email)) {
        throw new ApiError(400, "Full name and email are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set:{ 
            fullName, 
            email 
        }
    }, { new: true }).select("-password -refreshToken")

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
})  

const updateUserAvatar = asynchandler( async(req,res) => {  
    const avatarLocalPath = req.file?.path; //req.file and req.files are different and we used here req.file instead of req.files because we are using single file upload for avatar and cover image in multer middleware and for single file upload we use req.file and for multiple file upload we use req.files, both the req.files and req.file are provided by multer middleware and we can access the uploaded file's path using req.file.path or req.files.path depending on whether we are using single or multiple file upload in multer middleware


    // const avatarLocalPath = req.files?.avatar[0]?.path; //why avatar[0]? because we have set maxCount: 1 in multer middleware so it will be an array of one element and we need to access that element

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar) {
        throw new ApiError(400,"Avatar file is required")
    }

    const oldAvatarUrl = req.user?.avatar;

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set:{
            avatar : avatar.url
        }
    }, { new: true }).select("-password -refreshToken")

    if (!user) {
        throw new ApiError(404, "User not found")
    }


    // MongoDB update succeeded → now delete old image
    if (oldAvatarUrl) {
        const oldAvatarPublicId = oldAvatarUrl
            .split("/")
            .pop()
            .split(".")[0];

        await cloudinary.uploader.destroy(oldAvatarPublicId, {
            resource_type: "image"
        });
    }


    return res
        .status(200)
        .json(new ApiResponse(200, user, "User avatar updated successfully"))
})

const updateUserCoverImage = asynchandler( async(req,res) => {
    const CoverImageLocalPath = req.file?.path;

    if (!CoverImageLocalPath) {
        throw new ApiError(400,"Cover image file is required")
    }

    const CoverImage = await uploadOnCloudinary(CoverImageLocalPath)

    if (!CoverImage) {
        throw new ApiError(400,"Cover image file is required")
    }
    const oldCoverImageUrl = req.user?.coverImage;

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set:{
            coverImage : CoverImage.url
        }
    }, { new: true }).select("-password -refreshToken")

    if (!user) {
        throw new ApiError(404, "User not found")
    }


    if (oldCoverImageUrl) {
        const oldCoverImagePublicId = oldCoverImageUrl
            .split("/")
            .pop()
            .split(".")[0];

        await cloudinary.uploader.destroy(oldCoverImagePublicId, {
            resource_type: "image"
        });
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "User cover image updated successfully"))
})

const getUserChannelProfile = asynchandler( async(req,res) => {
    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing in request params")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
                subscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1
            }
        }
    ])

    //what datatype does aggregate return and console.log(channel) to check the datatype and it returns an array of objects and we need to check if the array is empty or not to check if the channel exists or not and if it exists then we need to return the first object of the array because we are matching the username which is unique and will return only one object in the array

    if (!channel?.length) {
        throw new ApiError(404, "Channel not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "Channel profile fetched successfully"))
})

const getUserWatchHistory = asynchandler( async(req,res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner" }
                        }
                    }
                ]
            }
        }
    ]) // if i have to write the above aggregate code using populate then code will be this:
    // const user = await User.findById(req.user?._id)
    //     .populate({
    //          path: "watchHistory",
    //          populate: {
    //              path: "owner",
    //              select: "fullName username avatar"
    //          }
    //     }) will this give the same result as above aggregate code? yes it will give the same result as above aggregate code but the above aggregate code is more efficient and optimized because it uses $lookup and $addFields to get the owner details in a single query instead of making multiple queries using populate which can be slow and inefficient for large datasets.


    return res
        .status(200)
        .json(new ApiResponse(200, user[0].watchHistory, "User watch history fetched successfully"))
})

export {
    registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getUserWatchHistory
}