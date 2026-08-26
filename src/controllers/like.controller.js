import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asynchandler} from "../utils/asynchandler.js"

const toggleVideoLike = asynchandler(async (req, res) => {
    //TODO: toggle like on video
    const {videoId} = req.params
    const userId = req.user._id

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: userId
    })

    if (existingLike) {
        await existingLike.deleteOne()
        return res.status(200).json(new ApiResponse(200, null, "Like removed successfully"))
    } else {
        const newLike = await Like.create({
            video: videoId,
            likedBy: userId
        })
        return res.status(201).json(new ApiResponse(201, newLike, "Like added successfully"))
    }

})

const toggleCommentLike = asynchandler(async (req, res) => {
    //TODO: toggle like on comment
    const {commentId} = req.params
    const userId = req.user._id

    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: userId
    })

    if (existingLike) {
        await existingLike.deleteOne()
        return res.status(200).json(new ApiResponse(200, null, "Like removed successfully"))
    } else {
        const newLike = await Like.create({
            comment: commentId,
            likedBy: userId
        })
        return res.status(201).json(new ApiResponse(201, newLike, "Like added successfully"))
    }

})

const toggleTweetLike = asynchandler(async (req, res) => {
    const {tweetId} = req.params
    const userId = req.user._id

    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: userId
    })

    if (existingLike) {
        await existingLike.deleteOne()
        return res.status(200).json(new ApiResponse(200, null, "Like removed successfully"))
    } else {
        const newLike = await Like.create({
            tweet: tweetId,
            likedBy: userId
        })
        return res.status(201).json(new ApiResponse(201, newLike, "Like added successfully"))
    }
})

const getVideoLikesCount = asynchandler(async (req, res) => {
    const {videoId} = req.params

    const likeCount = await Like.countDocuments({
        video: videoId
    })

    return res.status(200).json(new ApiResponse(200, { count: likeCount }, "Video like count retrieved successfully"))
})

const getCommentLikesCount = asynchandler(async (req, res) => {
    const {commentId} = req.params

    const likeCount = await Like.countDocuments({
        comment: commentId
    })

    return res.status(200).json(new ApiResponse(200, { count: likeCount }, "Comment like count retrieved successfully"))
})

const getTweetLikesCount = asynchandler(async (req, res) => {
    const {tweetId} = req.params

    const likeCount = await Like.countDocuments({
        tweet: tweetId
    })

    return res.status(200).json(new ApiResponse(200, { count: likeCount }, "Tweet like count retrieved successfully"))
})

const getLikedVideos = asynchandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req.user._id
    const { page = 1, limit = 10 } = req.query

    const pageNumber = Number(page)
    const limitNumber = Number(limit)

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId),
                video: { $ne: null }
            }
        },
        {
            $lookup: {
                from: 'videos',
                localField: 'video',
                foreignField: '_id',
                as: 'videoDetails'
            }
        },
        {
            $unwind: '$videoDetails'
        },
        {
            $skip: (pageNumber - 1) * limitNumber
        },
        {
            $limit : limitNumber
        },
        {
            $project: {
                _id: 0,
                videoDetails: 1
            }
        }
    ])
    
    return res.status(200).json(new ApiResponse(200, likedVideos, "Liked videos retrieved successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getVideoLikesCount,
    getCommentLikesCount,
    getTweetLikesCount,
    getLikedVideos
}