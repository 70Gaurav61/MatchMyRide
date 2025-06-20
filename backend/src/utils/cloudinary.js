import { v2 as cloudinary } from 'cloudinary'
import fs from "fs/promises"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const uploadOnCloudinary = async (localPath) => {

    try {
        if(!localPath) return null

        const response = await cloudinary.uploader.upload(localPath, {
            resource_type: 'auto'
        })

        return response      
    } catch (error) {
        console.error("File Upload Error ", error)
        return null
    } finally {
        try {
            await fs.unlink(localPath)
        } catch (unlinkError) {
            console.error("Error deleting local file", unlinkError)
        }
    }

}

const deleteFromCloudinary = async (url) => {

    try {
        const match = url.match(/upload\/(?:v\d+\/)?([^\.]+)/)
        const public_id = match ? match[1] : null

        if(!public_id)
            throw new Error("Invalid URL format")

        const deleteStatus = await cloudinary.uploader.destroy(public_id)
        return deleteStatus
    } catch (error) {
        console.error("File Deletion Error ", error)
        return null
    }

}

export { uploadOnCloudinary, deleteFromCloudinary }