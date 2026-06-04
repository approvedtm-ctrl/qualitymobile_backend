const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET || "secret", (err, decoded) => {
        if (err) {
            console.error("JWT Verify Error:", err);
            return res.status(401).json({ message: "Unauthorized: Invalid token" });
        }
        req.user = decoded; // Contains id and role
        next();
    });
};

module.exports = authMiddleware;
