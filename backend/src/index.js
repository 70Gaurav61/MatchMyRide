import 'dotenv/config'
import connectDB from "./db/index.js";
import app from './app.js';
import initSocket from "./socket/index.js";
import { createServer } from 'http';

connectDB()
.then(() => {
    const port = process.env.PORT || 8000
    const httpServer = createServer(app)

    const io = initSocket(httpServer);
    app.set('io', io);

    httpServer.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
})
.catch((error) => {
    console.error("Connection error in DB", error);
    process.exit(1);
})