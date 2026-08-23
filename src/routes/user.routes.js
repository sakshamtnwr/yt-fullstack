import { Router } from "express";
import { loginUser, logoutUser, registerUser, refreshAccessToken, changeCurrentPassword, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getCurrentUser, getUserChannelProfile, getUserWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { get } from "mongoose";

const router = Router()


router.route("/register").post(
    upload.fields([   // not array because that require homogenous one type
        //fields because different and multiple like array
        //single means single file upload and etc...
        {
            name : "avatar",
            maxCount : 1
        },
        {
            name : "coverImage",
            maxCount : 1 
        }
    ]),
    registerUser
)
//example - router.route("/login").post(loginUser)

router.route("/login").post(loginUser)

//secured routes (meaning user should be logged in to access these routes)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-accessToken").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/update-cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)
router.route("/c/:username").get(verifyJWT, getUserChannelProfile)
router.route("/watch-history").get(verifyJWT, getUserWatchHistory)



export default router

