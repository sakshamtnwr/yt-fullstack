import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asynchandler} from "../utils/asynchandler.js"

const getVideoComments = asynchandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const pageNumber = Number(page)
    const limitNumber = Number(limit)

    const allComments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "user",
                pipeline:[
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$user"
        },
        {
            $skip: (pageNumber - 1) * limitNumber
        },
        {
            $limit: limitNumber
        }
    ])
    
    return res.status(200).json(new ApiResponse(200, allComments, "Comments fetched successfully"))
})

const addComment = asynchandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params
    const {content} = req.body
    
    const comment = await Comment.create({
        content,
        video: new mongoose.Types.ObjectId(videoId),
        owner: req.user._id
    })

    return res.status(201).json(new ApiResponse(201, comment, "Comment added successfully"))
})

const updateComment = asynchandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params
    const {content} = req.body

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this comment")
    }

    comment.content = content || comment.content
    const updatedComment = await comment.save()
    return res.status(200).json(new ApiResponse(200, updatedComment, "Comment updated successfully"))
})

const deleteComment = asynchandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this comment")
    }

    await comment.deleteOne()
    return res.status(200).json(new ApiResponse(200, {}, "Comment deleted successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }