import { Group } from "../models/group.model.js";

const isGroupAdmin = (group, userId) => {
    return group.admin.toString() === userId.toString();
}

const createNewGroup = async (req, res) => {

    const { name, invites = [], rideId } = req.body;

    try {
        const group = await Group.create({
            name: name?.trim() || req.user.fullName + "'s Group",
            admin: req.user._id,
            invites: invites.map(invite => ({
                user: invite.user,
                ride: invite.ride
            })),
            members: [{
                user: req.user._id,
                ride: rideId,
            }]
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

const deleteGroup = async (req, res) => {
    const { groupId } = req.body;

    try {
        const group = await Group.findByIdAndDelete(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }
        return res.status(200).json({
            message: "Group deleted successfully",
            group
        });
    } catch (error) {
        console.error("Error deleting group:", error);
        return res.status(500).json({ message: "Internal server error while deleting group" });
    }
}
// invite expiry add in future
const inviteInGroup = async (req, res) => {
    const { groupId, userId, rideId } = req.body;

    try {
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }
        if (!isGroupAdmin(group, req.user._id)) {
            return res.status(403).json({ message: "You are not authorized to invite users to this group" });
        }

        const existingInvite = group.invites.find(invite => 
            invite.user.toString() === userId.toString()
        );

        const existingMember = group.members.find(member =>
            member.user.toString() === userId.toString()
        );

        if (existingInvite) {
            return res.status(400).json({ message: "User already invited" });
        }
        if (existingMember) {
            return res.status(400).json({ message: "User is already a member of the group" });
        }
        group.invites.push({
            user: userId,
            ride: rideId
        });

        await group.save();

        return res.status(200).json({
            message: "User invited successfully",
            group
        });
    } catch (error) {
        console.error("Error inviting user to group:", error);
        return res.status(500).json({ message: "Internal server error while inviting user" });
    }
}

const acceptInvite = async (req, res) => {
    const { groupId } = req.body;

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        const inviteIndex = group.invites.findIndex(invite => 
            invite.user.toString() === req.user._id.toString()
        );

        if (inviteIndex === -1) {
            return res.status(400).json({ message: "You have no pending invites for this group" });
        }

        const invite = group.invites[inviteIndex];

        group.invites.splice(inviteIndex, 1);
        group.members.push({
            user: invite.user,
            ride: invite.ride,
            status: "not ready"
        });
        await group.save();
        return res.status(200).json({
            message: "Invite accepted successfully",
            group
        });
    } catch (error) {
        console.error("Error accepting invite:", error);
        return res.status(500).json({ message: "Internal server error while accepting invite" });
    }
}

const rejectInvite = async (req, res) => {
    const { groupId } = req.body;

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        const inviteIndex = group.invites.findIndex(invite => 
            invite.user.toString() === req.user._id.toString()
        );

        if (inviteIndex === -1) {
            return res.status(400).json({ message: "You have no pending invites for this group" });
        }

        const invite = group.invites[inviteIndex];

        group.invites.splice(inviteIndex, 1);
        await group.save();
        return res.status(200).json({
            message: "Invite rejected successfully",
            group
        });
    } catch (error) {
        console.error("Error rejecting invite:", error);
        return res.status(500).json({ message: "Internal server error while rejecting invite" });
    }
}

const requestToJoinGroup = async (req, res) => {
    const { groupId, rideId } = req.body;
    try {
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        const existingRequest = group.requests.find(request => 
            request.user.toString() === req.user._id.toString()
        );

        if (existingRequest) {
            return res.status(200).json({ message: "You have already requested to join this group" });
        }

        const existingMember = group.members.find(member =>
            member.user.toString() === req.user._id.toString()
        );

        if(existingMember) {
            return res.status(400).json({ message: "You are already a member of this group" });
        }

        if (group.status && group.status === "closed") {
            return res.status(403).json({ message: "Group is closed for new members" });
        }

        const existingInvite = group.invites.find(invite => 
            invite.user.toString() === req.user._id.toString()
        );

        if(existingInvite) {
            return acceptInvite(req, res)
        }

        group.requests.push({
            user: req.user._id,
            ride: rideId
        });
        await group.save();

        return res.status(200).json({
            message: "Request to join group sent successfully",
            group
        });
    } catch (error) {
        console.error("Error requesting to join group:", error);
        return res.status(500).json({ message: "Internal server error while requesting to join group" });
    }
}

const acceptGroupJoinRequest = async (req, res) => {
    const { groupId, userId } = req.body

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if (!isGroupAdmin(group, req.user._id)) {
            return res.status(403).json({ message: "You are not authorized to accept join requests" });
        }

        const requestIndex = group.requests.findIndex(request => 
            request.user.toString() === userId.toString()
        );

        if (requestIndex === -1) {
            return res.status(400).json({ message: "No join request found for this user" });
        }

        const request = group.requests[requestIndex];
        group.requests.splice(requestIndex, 1);
        group.members.push({
            user: request.user,
            ride: request.ride,
            status: "not ready"
        });
        await group.save();

        return res.status(200).json({
            message: "Join request accepted successfully",
            group
        });
    } catch(error) {
        console.error(error)
        res.status(500).json({
            message: "Internal Error while accepting group join request"
        })
    }
        
}

const rejectGroupJoinRequest = async (req, res) => {
    const { groupId, userId } = req.body

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if (!isGroupAdmin(group, req.user._id)) {
            return res.status(403).json({ message: "You are not authorized to reject join requests" });
        }

        const requestIndex = group.requests.findIndex(request => 
            request.user.toString() === userId.toString()
        );

        if (requestIndex === -1) {
            return res.status(400).json({ message: "No join request found for this user" });
        }

        group.requests.splice(requestIndex, 1);
        await group.save();

        return res.status(200).json({
            message: "Join request rejected successfully",
            group
        });
    } catch(error) {
        console.error(error)
        res.status(500).json({
            message: "Internal Error while rejecting group join request"
        })
    }
        
}

const removeFromGroup = async (req, res) => {
    const { groupId, userId } = req.body;

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if (!isGroupAdmin(group, req.user._id)) {
            return res.status(403).json({ message: "You are not authorized to remove users from this group" });
        }

        const memberIndex = group.members.findIndex(member => 
            member.user.toString() === userId.toString()
        );

        if (memberIndex === -1) {
            return res.status(400).json({ message: "User is not a member of this group" });
        }

        group.members.splice(memberIndex, 1);
        await group.save();

        return res.status(200).json({
            message: "User removed from group successfully",
            group
        });
    } catch (error) {
        console.error("Error removing user from group:", error);
        return res.status(500).json({ message: "Internal server error while removing user from group" });
    }
}

const leaveGroup = async (req, res) => {
    const { groupId } = req.body;

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        const memberIndex = group.members.findIndex(member => 
            member.user.toString() === req.user._id.toString()
        );
        if (memberIndex === -1) {
            return res.status(400).json({ message: "You are not a member of this group" });
        }
        group.members.splice(memberIndex, 1);
        await group.save();
        return res.status(200).json({
            message: "You have left the group successfully",
            group
        });
    } catch (error) {
        console.error("Error leaving group:", error);
        return res.status(500).json({ message: "Internal server error while leaving group" });
    }
}

const updateMemberStatus = async (req, res) => {
    const { groupId, userId, status } = req.body;

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        const memberIndex = group.members.findIndex(member => 
            member.user.toString() === userId.toString()
        );
        if (memberIndex === -1) {
            return res.status(400).json({ message: "User is not a member of this group" });
        }

        group.members[memberIndex].status = status;
        await group.save();
        return res.status(200).json({
            message: "Member status updated successfully",
            group
        });
    } catch (error) {
        console.error("Error updating member status:", error);
        return res.status(500).json({ message: "Internal server error while updating member status" });
    }
}

export {
    createNewGroup,
    deleteGroup,
    inviteInGroup,
    acceptInvite,
    rejectInvite,
    requestToJoinGroup,
    acceptGroupJoinRequest,
    rejectGroupJoinRequest,
    removeFromGroup,
    leaveGroup,
    updateMemberStatus
}