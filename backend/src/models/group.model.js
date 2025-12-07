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
                isReady: {
                    type: Boolean,
                    default: false
                }
            }
        ],
        status: {
            type: String,
            enum: ["open", "closed", "locked"],
            default: "open"
        },
        route: {
            waypointOrder: [
                {
                    userId: {
                        type: Schema.Types.ObjectId,
                        ref: "User",
                    },
                    fullName: {
                        type: String,
                    },
                    avatar: {
                        type: String,
                    },
                    type: {
                        type: String,
                        enum: ["pickup", "drop"],
                    },
                    location:{ 
                        type: [Number],
                        default: undefined
                    }, // [longitude, latitude]
                }
            ],
            orderedCoordinates: { 
                type: [[Number]],
                default: []
            }, 
            directions: {
                type: Schema.Types.Mixed,
                default: {}
            }
        }
    },
    {
        timestamps: true
    }
)

export const Group = mongoose.model("Group", groupSchema)