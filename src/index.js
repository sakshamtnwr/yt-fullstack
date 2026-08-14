//require('dotenv').config({path : "./env"})
import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path : './env'
})

const portt = process.env.PORT || 8000;

connectDB()
.then(()=>{
    app.on("errror", (error) => {
        console.log("ERRR:",error);
        throw error;
    })
    app.listen(portt, ()=>{
        console.log(`server is running at port : ${prott}`);
        
    })
})
.catch((err) =>{
    console.log("MONGODB connection failed !!!", err);
})