import { Group } from "../models/group.model.js";

const createNewGroup = async (req, res) => {

    const { name, invites = [] } = req.body;

    try {
        const group = await Group.create({
            name: name?.trim() || req.user.fullName + "'s Group",
            admin: req.user._id,
            invites: invites.map(invite => ({
                user: invite.user,
                ride: invite.ride,
                status: "pending"
            }))
        });
    
        if (!group) {
            return res.status(500).json({ message: "Failed to create group" });
        }
    
        return res.status(200).json({
            group,
            message: "Group created successfully",
        });
    } catch (error) {
        console.error("Error creating group:", error);
        return res.status(500).json({ message: "Internal server error while creating group" });        
    }
}

export {
    createNewGroup
}