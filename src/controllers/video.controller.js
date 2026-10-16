import mongoose, {get, isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asynchandler} from "../utils/asynchandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {v2 as cloudinary} from "cloudinary"


const publishAVideo = asynchandler(async (req, res) => {
    // TODO: get video, upload to cloudinary, create video
    const { title, description} = req.body

    const videoFilepath = req.files?.videoFile[0]?.path;
    const thumbnailFilepath = req.files?.thumbnail[0]?.path;

    if (!videoFilepath || !thumbnailFilepath) {
        throw new ApiError(400, "Video file and thumbnail are required");
    }

    const videoFile = await uploadOnCloudinary(videoFilepath);
    const thumbnailFile = await uploadOnCloudinary(thumbnailFilepath);

    if (!videoFile || !thumbnailFile) {
        throw new ApiError(500, "Failed to upload video or thumbnail to Cloudinary");
    }

    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnailFile.url,
        owner: req.user._id,
        duration: videoFile.duration || 0, // Assuming the uploadOnCloudinary function returns the duration,
        views: 0,
        isPublished: true
    })

    if (!video) {
        throw new ApiError(500, "Failed to create video");
    }

    return res.status(201).json(new ApiResponse(201, video, "Video created successfully"));
})


const getVideoById = asynchandler(async (req, res) => {
    //TODO: get video by id
    const { videoId } = req.params
    
    await Video.findByIdAndUpdate(
        videoId,
        { $inc: { views: 1 } }
    );

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
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
                            _id: 1,
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        }
    ])

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    return res.status(200).json(new ApiResponse(200, video, "Video fetched successfully"));
})


const updateVideo = asynchandler(async (req, res) => {
    const { videoId } = req.params
    
    //TODO: update video details like title, description, thumbnail

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video");
    }

    video.title = req.body.title || video.title;
    video.description = req.body.description || video.description;

    const thumbnailFilepath = req.file?.path;
    
    const OldThumbnailUrl = video.thumbnail;
    if (thumbnailFilepath) {
        const thumbnailFile = await uploadOnCloudinary(thumbnailFilepath);

        if (!thumbnailFile) {
            throw new ApiError(500, "Failed to upload thumbnail to Cloudinary");
        }

        video.thumbnail = thumbnailFile.url;

        if (OldThumbnailUrl) {
            const oldThumbnailPublicId = OldThumbnailUrl
                .split("/")
                .pop()
                .split(".")[0];
    
            await cloudinary.uploader.destroy(oldThumbnailPublicId);
        }
    }

    
    const updatedVideo = await video.save();


    return res.status(200).json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
})


const deleteVideo = asynchandler(async (req, res) => {
    //TODO: delete video
    const { videoId } = req.params

    const getVideo = await Video.findById(videoId);

    if (!getVideo) {
        throw new ApiError(404, "Video not found");
    }

    if (getVideo.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video");
    }

    const videoFileUrl = getVideo.videoFile;
    const thumbnailUrl = getVideo.thumbnail;

    if (videoFileUrl) {
        const oldVideoPublicId = videoFileUrl
            .split("/")
            .pop()
            .split(".")[0];

        await cloudinary.uploader.destroy(oldVideoPublicId, {
            resource_type: "video"
        });
    }

    if (thumbnailUrl) {
        const oldThumbnailPublicId = thumbnailUrl
            .split("/")
            .pop()
            .split(".")[0];

        await cloudinary.uploader.destroy(oldThumbnailPublicId, {
            resource_type: "image"
        });
    }

    await getVideo.deleteOne();

    return res.status(200).json(new ApiResponse(200, null, "Video deleted successfully"));
})


const togglePublishStatus = asynchandler(async (req, res) => {
    const { videoId } = req.params

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to toggle publish status of this video");
    }

    video.isPublished = !video.isPublished;
    const updatedVideo = await video.save();

    return res.status(200).json(new ApiResponse(200, updatedVideo, "Publish status toggled successfully"));
})

const getAllVideos = asynchandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query = "",
        sortBy = "views",
        sortType = "desc"
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const searchTerm = query.trim();

    const matchStage = {
        isPublished: true
    };

    if (searchTerm) {
        // Check whether the search term matches a username
        const username = searchTerm.startsWith("@")
            ? searchTerm.slice(1)
            : searchTerm;

        const escapedUsername = username.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        const usernameMatch = {
            username: {
                $regex: `^${escapedUsername}$`,
                $options: "i"
            }
        };
        const userLookup = searchTerm.startsWith("@")
            ? usernameMatch
            : {
                $or: [
                    usernameMatch,
                    {
                        fullName: {
                            $regex: `^${escapedUsername}$`,
                            $options: "i"
                        }
                    }
                ]
            };
        const matchingUsers = await User.find(userLookup).select("_id");

        if (matchingUsers.length > 0) {
            // Exact username or full-name match: return videos from those creators.
            matchStage.owner = { $in: matchingUsers.map((matchedUser) => matchedUser._id) };
        } else {
            // No username found: search video title and description
            const escapedQuery = searchTerm.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            matchStage.$or = [
                {
                    title: {
                        $regex: escapedQuery,
                        $options: "i"
                    }
                },
                {
                    description: {
                        $regex: escapedQuery,
                        $options: "i"
                    }
                }
            ];
        }
    }

    const videos = await Video.aggregate([
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
                as: "ownerDetails",
                pipeline: [
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
            $addFields: {
                ownerDetails: { $first: "$ownerDetails" }
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            videos,
            "Videos fetched successfully"
        )
    );
});


export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}