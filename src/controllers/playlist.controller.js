import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asynchandler} from "../utils/asynchandler.js"


const createPlaylist = asynchandler(async (req, res) => {
    //TODO: create playlist
    const {name, description} = req.body

    const playlist = await Playlist.create({
        title: name,
        description,
        owner: req.user._id
    })

    return res.status(200).json(new ApiResponse(200, playlist, "Playlist created successfully"))

})

const getUserPlaylists = asynchandler(async (req, res) => {
    //TODO: get user playlists
    const {userId} = req.params

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }

    const playlists = await Playlist.find({ owner: userId })

    return res.status(200).json(
        new ApiResponse(200, playlists, "User playlists fetched successfully")
    )
})

const getPlaylistById = asynchandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    const playlist = await Video.findById(playlistId)
    
})

const addVideoToPlaylist = asynchandler(async (req, res) => {
    const {playlistId, videoId} = req.params
})

const removeVideoFromPlaylist = asynchandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

})

const deletePlaylist = asynchandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
})

const updatePlaylist = asynchandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
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