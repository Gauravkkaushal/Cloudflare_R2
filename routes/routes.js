import { Router } from "express";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import r2Client from "../r2.js";
import dotenv from "dotenv";
dotenv.config()

const router = Router();

const ALLOWED_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
};

const MAX_FILE_SIZE = 100 * 1024 * 1024;

router.post("/presigned-url", async (req, res) => {
    try {
        const { fileName, fileType, fileSize, userId } = req.body;
        if (!fileName || !fileType || !fileSize || !userId) {
            return res.status(400).json({ error: "fileName, fileType, fileSize, userId are required" });
        }

        if (!ALLOWED_TYPES[fileType]) {
            return res.status(400).json({ error: "File type not allowed" });
        }

        if (fileSize > MAX_FILE_SIZE) {
            return res.status(400).json({ error: "File size exceeds 100MB limit" });
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const ext = ALLOWED_TYPES[fileType];
        const uniqueId = uuidv4();

        const objectKey = `uploads/${userId}/${year}/${month}/${day}/${uniqueId}.${ext}`;

        const uploadCommand = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: objectKey,
            ContentType: fileType
        });

        const uploadUrl = await getSignedUrl(r2Client, uploadCommand, {
            expiresIn: 3000
        });

        const viewCommand = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: objectKey
        });

        const viewUrl = await getSignedUrl(r2Client, viewCommand, {
            expiresIn: 3000
        });

        return res.status(200).json({
            uploadUrl,
            viewUrl,
            objectKey
        })
    } catch (error) {
        console.error("Full error:", error); // log the full error object
        console.log("R2_ACCOUNT_ID:", process.env.R2_ACCOUNT_ID);
        console.log("R2_BUCKET_NAME:", process.env.R2_BUCKET_NAME);
        console.log("R2_ACCESS_KEY_ID:", process.env.R2_ACCESS_KEY_ID);
        return res.status(500).json({
            error: "Failed to generate upload URL",
            message: error.message  // temporarily send error message to Thunder Client too
        });
    }
})

export default router;