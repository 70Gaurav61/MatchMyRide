import mongoose, {Schema} from "mongoose"

const groupSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        admin: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        invites: [
            {
                user: { 
                    type: Schema.Types.ObjectId, 
                    ref: "User", 
                    required: true 
                },
                ride: {
                    type: Schema.Types.ObjectId,
                    ref: "Ride",
                    required: true
                },
                status: { 
                    type: String, 
                    enum: ["pending", "accepted", "rejected"], 
                    default: "pending" 
                }
            }
        ],
        requests: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                    required: true
                },
                ride: {
                    type: Schema.Types.ObjectId,
                    ref: "Ride",
                    required: true
                },
                status: {
                    type: String,
                    enum: ["pending", "accepted", "rejected"],
                    default: "pending"
                }
            }
        ],
        members: [
            {
                user: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                    required: true
                },
                ride: {
                    type: Schema.Types.ObjectId,
                    ref: "Ride",
                    required: true
                },
                status: {
                    type: String,
                    enum: ["not ready", "ready"],
                    default: "not ready"
                }
            }
        ],
        status: {
            type: String,
            enum: ["open", "closed", "locked"],
            default: "open"
        }
    },
    {
        timestamps: true
    }
)

export const Group = mongoose.model("Group", groupSchema)