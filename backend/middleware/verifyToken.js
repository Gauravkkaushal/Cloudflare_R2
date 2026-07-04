import { adminAuth } from "../firebaseAdmin.js";

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "No token provided" });
        }

        const idToken = authHeader.split("Bearer ")[1];

        const decodedToken = await adminAuth.verifyIdToken(idToken);

        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name
        };

        next();

    } catch (error) {
        console.error("Token verification failed:", error.message);
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};

export default verifyToken;
