export function emitInviteUserToGroup(io, userId, group) {
    io.to(String(userId)).emit('group-invite', {
        groupId: group._id,
        groupName: group.name,
        admin: group.admin,
    });

}

export function emitRequestToJoinGroup(io, user, group) {

    io.to(String(group.admin)).emit('join-request', {
        groupId: group._id,
        groupName: group.name,
        user: user
    });

}