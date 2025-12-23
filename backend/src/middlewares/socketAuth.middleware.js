import cookie from "cookie";
import { verifyAccessToken } from "./auth.helper.js";

const socketAuth = async (socket, next) => {
  try {
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");

    const accessToken =
      socket.handshake?.auth?.token ||
      socket.handshake.headers.authorization?.replace("Bearer ", "") ||
      cookies.accessToken;

    if (!accessToken) {
      throw new Error("Authentication error: No access token provided");
    } else {
      console.log(
        "Socket access token found",
        accessToken.slice(0, 10) + "..."
      );
    }

    const { user, decoded } = await verifyAccessToken(accessToken);
    socket.user = user;
    setupAutoDisconnect(socket, decoded.exp);

    next();
  } catch (error) {
    next(error);
  }
};

const setupAutoDisconnect = (socket, expTimeUnix) => {
  if (socket._refreshTimer) clearTimeout(socket._refreshTimer);
  if (socket._killTimer) clearTimeout(socket._killTimer);

  const expInMs = expTimeUnix * 1000 - Date.now();
  if (expInMs <= 0) return socket.disconnect(true);

  const bufferTime = (process.env.ACCESS_TOKEN_EXPIRY_BUFFER 
    ? parseInt(process.env.ACCESS_TOKEN_EXPIRY_BUFFER) 
    : 1 * 60 * 1000); // fallback to 1 minute before expiry
  const warningTime = expInMs - bufferTime;

  // Set the "Warning Timer"
  const delay = warningTime > 0 ? warningTime : 0;

  socket._refreshTimer = setTimeout(() => {
    socket.emit("auth:token-expiring");

    // Start the "Kill Timer"
    socket._killTimer = setTimeout(() => {
      console.log(
        `Socket ${socket.id} failed to refresh in time. Disconnecting.`
      );
      socket.disconnect(true);
    }, bufferTime);
  }, delay);
};

export default socketAuth;
export { setupAutoDisconnect };