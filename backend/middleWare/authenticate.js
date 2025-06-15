const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

const authenticate = asyncHandler(async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    // check the token is in the header
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

            const user = await User.findById(decoded.userId).select('-password');

            if (!user) {
                return res.status(401).json({ message: "Unauthorized: User not found" });
            }

            // Convert Mongoose document to plain object and set in request
            req.user = user.toObject();
            next();
        } catch (error) {
            console.error("error verification token", error.message);
            return res.status(401).json({ message: "Unauthorized: Invalid Token" });
        }
    } else {
        return res.status(401).json({ message: "Unauthorized: No Token Provided" });
    }
});

module.exports = authenticate;