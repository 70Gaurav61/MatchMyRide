import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema({
    group: {
        type: Schema.Types.ObjectId,
        ref: "Group",
        required: true
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 864000 // 10 days in seconds
    }
});

export const Message = mongoose.model("Message", messageSchema); 