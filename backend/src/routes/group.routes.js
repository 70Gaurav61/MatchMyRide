import { Router } from 'express'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { 
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
    getUserGroups,
    getGroupById,
    getUserInvites
} from '../controllers/group.controller.js'

const router = Router()

router.route("/create").post(verifyJWT, createNewGroup)
router.route("/delete").delete(verifyJWT, deleteGroup)

router.route("/invite").post(verifyJWT, inviteInGroup)
router.route("/accept-invite").post(verifyJWT, acceptInvite)
router.route("/reject-invite").post(verifyJWT, rejectInvite)

router.route("/join-request").post(verifyJWT, requestToJoinGroup)
router.route("/accept-join-request").post(verifyJWT, acceptGroupJoinRequest)
router.route("/reject-join-request").post(verifyJWT, rejectGroupJoinRequest)

router.route("/remove").post(verifyJWT, removeFromGroup)
router.route("/leave").post(verifyJWT, leaveGroup)
router.route("/update-member-status").patch(verifyJWT, updateMemberStatus)

router.route("/:groupId/messages").get(verifyJWT, getGroupMessages)
router.route('/my-groups').get(verifyJWT, getUserGroups)
router.route('/my-invites').get(verifyJWT, getUserInvites)
router.route('/:groupId').get(verifyJWT, getGroupById)

export default router