import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

app.use((req, res, next) => {
    req.io = req.app.get('io');
    next();
});

import userRouter from "./routes/user.routes.js"
import rideRouter from "./routes/ride.routes.js"
import groupRouter from "./routes/group.routes.js"

app.use("/api/v1/users", userRouter)
app.use("/api/v1/rides", rideRouter)
app.use("/api/v1/groups", groupRouter)

export default app