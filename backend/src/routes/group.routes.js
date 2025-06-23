import { Router } from 'express'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { 
    createNewGroup
} from '../controllers/group.controller.js'

const router = Router()

router.route("/create").post(verifyJWT, createNewGroup)


export default router