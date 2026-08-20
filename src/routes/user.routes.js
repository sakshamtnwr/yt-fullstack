import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"

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




export default router