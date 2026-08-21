import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

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
router.route("/refresh-AccessToken").post(refreshAccessToken)

export default router