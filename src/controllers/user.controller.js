import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


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


export {registerUser}