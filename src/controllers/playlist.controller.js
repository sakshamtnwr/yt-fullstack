import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asynchandler } from "../utils/asynchandler.js"


const createPlaylist = asynchandler(async (req, res) => {
    //TODO: create playlist
    const { name, description } = req.body

    const playlist = await Playlist.create({
        title: name,
        description,
        owner: req.user._id
    })

    return res.status(200).json(new ApiResponse(200, playlist, "Playlist created successfully"))

})

const getUserPlaylists = asynchandler(async (req, res) => {
    //TODO: get user playlists
    const { userId } = req.params
    const loggedInUserId = req.user?._id

    if (userId !== loggedInUserId) {
        throw new ApiError(401, "You are not authorized to get user playlists")
    }

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }

    const playlists = await Playlist.aggregate(
        [
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "videos",
                    foreignField: "_id",
                    as: "videoDetails"
                }
            },
            {
                $project: {
                    title: 1,
                    description: 1,
                    videoDetails: 1
                }
            }
        ]
    )

    return res.status(200).json(new ApiResponse(200, playlists, "User playlists fetched successfully"))

})

const getPlaylistById = asynchandler(async (req, res) => {
    const { playlistId } = req.params
    //TODO: get playlist by id

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.aggregate(
        [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(playlistId)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "videos",
                    foreignField: "_id",
                    as: "videoDetails"
                }
            },
            {
                $project: {
                    title: 1,
                    description: 1,
                    videoDetails: 1
                }
            }
        ]
    )

    return res.status(200).json(new ApiResponse(200, playlist, "Playlist fetched successfully"))
})

const addVideoToPlaylist = asynchandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist id or video id")
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user._id
        },
        {
            $addToSet: { // if video is already there it will not add again
                videos: videoId
            }
        },
        { new: true }
    )

    if (!updatedPlaylist) {
        throw new ApiError(404, "Playlist not found")
    }
    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully"))
})

const removeVideoFromPlaylist = asynchandler(async (req, res) => {
    // TODO: remove video from playlist
    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid playlist id or video id")
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user._id
        },
        {
            $pull: {
                videos: videoId
            }
        },
        { new: true }
    )

    if (!updatedPlaylist) {
        throw new ApiError(404, "Playlist not found")
    }


    return res.status(200).json(new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully"))
})

const deletePlaylist = asynchandler(async (req, res) => {
    const { playlistId } = req.params
    // TODO: delete playlist

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId)
    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }
    if (playlist.owner !== req.user?._id) {
        throw new ApiError(401, "You are not authorized to delete this playlist")
    }

    await Playlist.findByIdAndDelete(playlistId)
    return res.status(200).json(new ApiResponse(200, "Playlist deleted successfully"))
})

const updatePlaylist = asynchandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    //TODO: update playlist

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id")
    }

    const updatedDetailsPlaylist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user._id
        },
        {
            $set: {
                title: name,
                description: description
            }
        },
        { new: true }
    )

    if (!updatedDetailsPlaylist) {
        throw new ApiError(404, "Playlist not found")
    }

    return res.status(200).json(new ApiResponse(200, updatedDetailsPlaylist, "Playlist updated successfully"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}