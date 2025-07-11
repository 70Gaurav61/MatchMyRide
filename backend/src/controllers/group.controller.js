import { Group } from "../models/group.model.js";
import { Message } from "../models/message.model.js";
import { Ride } from "../models/ride.model.js";

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

        // Emit socket.io event for all invited users (if socket.io is available)
        if (req.io) {
            for (const invite of group.invites) {
                req.io.to(invite.user.toString()).emit('group-invited', {
                    groupId: group._id,
                    groupName: group.name,
                    admin: req.user.fullName,
                    ride: invite.ride
                });
            }
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

        // Emit real-time invite notification
        if (req.io) {            
            req.io.to(userId.toString()).emit('group-invite', {
                groupId: group._id,
                groupName: group.name,
                admin: req.user.fullName,
                ride: rideId
            });
        }

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

// Get group chat history
const getGroupMessages = async (req, res) => {
    const { groupId } = req.params;
    try {
        const messages = await Message.find({ group: groupId })
            .populate('sender', 'fullName avatar')
            .sort({ createdAt: 1 });
        res.status(200).json({ messages });
    } catch (error) {
        console.error("Error fetching group messages:", error);
        res.status(500).json({ message: "Internal server error while fetching messages" });
    }
};

// Socket.io event handler for sending a message
// This is a placeholder for use in the Socket.io setup in index.js
const handleSendMessage = async (io, socket, data) => {
    // data: { groupId, content }
    try {
        const message = await Message.create({
            group: data.groupId,
            sender: socket.user._id,
            content: data.content
        });
        const populatedMsg = await message.populate('sender', 'fullName avatar');
        io.to(data.groupId).emit('receive-message', populatedMsg);
    } catch (error) {
        console.error("Error sending message:", error);
        socket.emit('error', { message: 'Failed to send message' });
    }
};

const getUserGroups = async (req, res) => {
    try {
        const userId = req.user._id;
        const groups = await Group.find({
            $or: [
                { admin: userId },
                { 'members.user': userId }
            ]
        }).select('name');
        return res.status(200).json({ groups });
    } catch (error) {
        console.error('Error fetching user groups:', error);
        return res.status(500).json({ message: 'Internal server error while fetching user groups' });
    }
};

const getGroupById = async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const group = await Group.findById(groupId)
            .populate({
                path: 'members.user',
                select: 'fullName avatar'
            })
            .lean();
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        group.confirmedMembers = (group.members || []).map(m => ({
            user: m.user._id,
            fullName: m.user.fullName,
            avatar: m.user.avatar,
            ready: m.status === 'ready',
        }));
        return res.status(200).json({ group });
    } catch (error) {
        console.error('Error fetching group by id:', error);
        return res.status(500).json({ message: 'Internal server error while fetching group' });
    }
};

// Toggle ready status for a group member and emit real-time update
const toggleReadyStatus = async (io, socket, data) => {
    // data: { groupId }
    try {        
        const group = await Group.findById(data.groupId).populate({
            path: 'members.user',
            select: 'fullName avatar'
        });
        if (!group) {
            return socket.emit('error', { message: 'Group not found' });
        }
        // Find the member
        const memberIndex = group.members.findIndex(m => m.user._id.toString() === socket.user._id.toString());
        if (memberIndex === -1) {
            return socket.emit('error', { message: 'You are not a member of this group' });
        }
        // Toggle status
        group.members[memberIndex].status = group.members[memberIndex].status === 'ready' ? 'not ready' : 'ready';
        await group.save();
        // Prepare updated members info
        const updatedMembers = group.members.map(m => ({
            user: m.user._id,
            fullName: m.user.fullName,
            avatar: m.user.avatar,
            ready: m.status === 'ready',
        }));
        // Emit to all group members
        io.to(data.groupId).emit('group-ready-status-updated', {
            groupId: data.groupId,
            members: updatedMembers
        });
    } catch (error) {
        console.error('Error toggling ready status:', error);
        socket.emit('error', { message: 'Failed to toggle ready status' });
    }
};

// Socket.io event handler for starting the ride countdown
const handleStartRideCountdown = async (io, socket, data) => {
    // data: { groupId }
    try {
        const group = await Group.findById(data.groupId).populate({
            path: 'members.user',
            select: 'fullName avatar'
        });
        if (!group) {
            return socket.emit('error', { message: 'Group not found' });
        }

        if (group.admin.toString() !== socket.user._id.toString()) {
            return socket.emit('error', { message: 'Only admin can start the ride' });
        }

        // Prevent multiple countdowns
        if (group.status !== 'open') {
            return socket.emit('error', { message: 'Ride has already been started or locked.' });
        }

        group.status = 'locked';
        await group.save();

        const endTime = Date.now() + 10000;
        io.to(data.groupId).emit('countdown-started', { endTime });

        await new Promise(resolve => setTimeout(resolve, 10000));

        const freshGroup = await Group.findById(data.groupId).populate({
            path: 'members.user',
            select: 'fullName avatar'
        });
        if (!freshGroup) {
            return socket.emit('error', { message: 'Group not found after countdown' });
        }

        const readyMembers = freshGroup.members.filter(m => m.status === 'ready');
        // Remove not ready members
        freshGroup.members = readyMembers;

        for (const member of readyMembers) {
            if (member.ride) {
                await Ride.findByIdAndUpdate(member.ride, { status: 'Matched' });
            }
        }

        freshGroup.status = 'closed';
        await freshGroup.save();

        const finalMembers = readyMembers.map(m => ({
            user: m.user._id,
            fullName: m.user.fullName,
            avatar: m.user.avatar,
            ready: m.status === 'ready',
        }));

        io.to(data.groupId).emit('ride-started', {
            groupId: data.groupId,
            members: finalMembers
        });
    } catch (error) {
        console.error('Error in start ride countdown:', error);
        socket.emit('error', { message: 'Failed to start ride countdown' });
    }
};

// Get all group invites for the current user
const getUserInvites = async (req, res) => {
    try {
        const userId = req.user._id;
        // Find groups where invites.user matches current user
        const groups = await Group.find({
            'invites.user': userId
        })
        .populate('invites.ride', 'name')
        .populate('admin', 'fullName')
        .select('name invites admin');

        // Filter invites to only those for the current user
        const invites = [];
        for (const group of groups) {
            for (const invite of group.invites) {
                if (invite.user.toString() === userId.toString()) {
                    invites.push({
                        groupId: group._id,
                        groupName: group.name,
                        admin: group.admin,
                        ride: invite.ride,
                    });
                }
            }
        }
        return res.status(200).json({ invites });
    } catch (error) {
        console.error('Error fetching user invites:', error);
        return res.status(500).json({ message: 'Internal server error while fetching invites' });
    }
};

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
    updateMemberStatus,
    getGroupMessages,
    handleSendMessage,
    getUserGroups,
    getGroupById,
    toggleReadyStatus,
    handleStartRideCountdown,
    getUserInvites
}