import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:5173'];

app.use(cors({
    origin: function (origin, callback) {
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            return callback(new Error('Not allowed by CORS'));
        }
    },
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