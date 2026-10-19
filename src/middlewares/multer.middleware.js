// import multer from "multer";



// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "./public/temp")
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.originalname) // should change in future to unique file name
//   }
// })

// export const upload = multer({ 
//     storage: storage 
// })


// i have to change this file to the below code since this multer file works fine on localhost but not on vercel because vercel have read-only filesystem.
// Why it works locally but fails on Vercel:
// - Localhost: Your backend can write uploaded files to ./public/temp.
// - Vercel: Serverless functions have a read-only filesystem, except for temporary storage in /tmp.

// below code works on vercel
import multer from "multer";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, os.tmpdir());
  },

  filename: function (req, file, cb) {
    cb(null, `${randomUUID()}${path.extname(file.originalname)}`);
  },
});

export const upload = multer({
  storage,
});