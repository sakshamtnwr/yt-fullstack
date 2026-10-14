import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asynchandler } from "../utils/asynchandler.js"

const createTweet = asynchandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body
    if (!content || !content.trim()) {
        throw new ApiError(400, "Tweet content is required")
    }

    const tweet = await Tweet.create({
        content: content.trim(),
        owner: req.user._id
    })

    if (!tweet?._id) {
        throw new ApiError(500, "Failed to create tweet")
    }

    res.status(201).json(
        new ApiResponse(201, tweet, "Tweet created successfully")
    )
})

const getAllTweets = asynchandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query = "",
        sortBy = "createdAt",
        sortType = "desc"
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const searchTerm = query.trim();

    let matchStage = {};

    if (searchTerm) {
        // Check whether the search term is a username
        const username = searchTerm.startsWith("@")
            ? searchTerm.slice(1)
            : searchTerm;

        const escapedUsername = username.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        const matchingUser = await User.findOne({
            username: {
                $regex: `^${escapedUsername}$`,
                $options: "i"
            }
        }).select("_id");

        if (matchingUser) {
            // Username found: fetch that user's tweets
            matchStage.owner = matchingUser._id;
        } else {
            // No username found: search tweet content
            const escapedQuery = searchTerm.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            matchStage.content = {
                $regex: escapedQuery,
                $options: "i"
            };
        }
    }

    const tweets = await Tweet.aggregate([
        {
            $match: matchStage
        },
        {
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        },
        {
            $skip: (pageNumber - 1) * limitNumber
        },
        {
            $limit: limitNumber
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
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
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            tweets,
            "Tweets fetched successfully"
        )
    );
});

const getUserTweets = asynchandler(async (req, res) => {
    // TODO: get user tweets

    const { userId } = req.params
    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        }
    ]
    )

    if (!tweets?.length) {
        throw new ApiError(404, "No tweets found")
    }

    res.status(200).json(
        new ApiResponse(200, tweets, "Tweets fetched successfully")
    )
})

const updateTweet = asynchandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params
    const { content } = req.body

    if (!content || !content.trim()) {
        throw new ApiError(400, "Tweet content is required")
    }

    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }

    const tweet = await Tweet.findByIdAndUpdate(
        {
            _id: tweetId,
            owner: req.user._id
        },
        {
            $set: {
                content
            }
        },
        {
            new: true
        }
    )

    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    res.status(200).json(
        new ApiResponse(200, tweet, "Tweet updated successfully")
    )
})

const deleteTweet = asynchandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params
    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }

    const tweetDelete = await Tweet.findOneAndDelete({
        _id: tweetId,
        owner: req.user._id
    })

    if (!tweetDelete) {
        throw new ApiError(404, "Tweet not found")
    }

    res.status(200).json(
        new ApiResponse(200, tweetDelete, "Tweet deleted successfully")
    )
})



export {
    createTweet,
    getAllTweets,
    getUserTweets,
    updateTweet,
    deleteTweet,
}