import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asynchandler } from "../utils/asynchandler.js"

const getChannelStats = asynchandler(async (req, res) => {
    const channelId = req.user._id

    const videoStats = await Video.aggregate([
        {
            $match: {
                owner: channelId
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $group: {
                _id: null,
                totalVideos: { $sum: 1 },
                totalViews: { $sum: "$views" },
                totalLikes: { $sum: { $size: "$likes" } }
            }
        }
    ])

    const subscriberStats = await Subscription.aggregate([
        {
            $match: {
                channel: channelId
            }
        },
        {
            $count: "totalSubscribers"
        }
    ])

    const stats = {
        totalVideos: videoStats[0]?.totalVideos || 0,
        totalViews: videoStats[0]?.totalViews || 0,
        totalLikes: videoStats[0]?.totalLikes || 0,
        totalSubscribers: subscriberStats[0]?.totalSubscribers || 0
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                stats,
                "Channel stats fetched successfully"
            )
        )

})

const getChannelVideos = asynchandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = Number(page)
    const limitNumber = Number(limit)

    const allVideos = await Video.aggregate([
        {
            $match: {
                owner: req.user?._id
            }
        },
        {
            $skip: (pageNumber - 1) * limitNumber
        },
        {
            $limit: limitNumber
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $project: {
                _id: 1,
                title: 1,
                description: 1,
                thumbnail: 1,
                videoFile: 1,
                views: 1,
                likes: 1,
                isPublished: 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ])

    res.status(200).json(new ApiResponse(200, allVideos, "Videos fetched successfully"))
})

export {
    getChannelStats,
    getChannelVideos
}