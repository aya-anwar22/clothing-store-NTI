const bcrypt = require("bcryptjs");
const User = require('../models/User.js');
const asyncHandler = require("express-async-handler");
// for admin
exports.addUser = asyncHandler(async(req, res) =>{
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const {userName, email, password, phoneNumber, role, addresses} = req.body
    const user = await User.findOne({ email })
    if(user && user.isVerified){
        return res.status(400).json({
            message: "User already in DB"
        })
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
        userName,
        email,
        phoneNumber,
        password: hashedPassword,
        isVerified: true,
        addresses,
        role
      });
    
      await newUser.save();
      res.status(201).json({
        message: "User Create Successfully"
      })
})

// get all user
exports.getAllUser = asyncHandler(async(req, res) =>{
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }
    // pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit ;

    // search
    const search = req.query.search || '';
    const searchRegex = new RegExp(search, 'i')

    const totalUsers = await User.countDocuments({userName: searchRegex});
    const users = await User.find({ userName: searchRegex })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt : -1})
        .select('-password -emailVerificationCode -verificationCodeExpiry -resetPasswordCode -resetPasswordExpiry -refreshToken -refreshTokenExpiry')
    // get data
    return res.status(200).json({
        totalUsers,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        users
    })
})

// get userById
exports.getUserById = asyncHandler(async(req, res) => {
    const userId = req.params.userId;
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const user = await User.findById(userId).select('-password -emailVerificationCode -verificationCodeExpiry -resetPasswordCode -resetPasswordExpiry -refreshToken -refreshTokenExpiry');
    if(!user){
        return res.status(404).json({message: "user not found"})
    }
    res.status(200).json(user)

})

// update user
exports.updateUser = asyncHandler(async(req, res) =>{
    const userId = req.params.userId;
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const { role } = req.body;
    const user = await User.findById(userId);
    if(!user){
        return res.status(404).json({
            message: "User Not Found"
        })
    }
    user.role = role;
    await user.save();
    res.status(200).json({
        message: "user Update Successfully"
    })


})

//delete User
exports.deleteUser = asyncHandler(async(req, res) =>{
    const userId = req.params.userId;
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const user = await User.findById(userId);
    if(!user){
        return res.status(404).json({
            message: "User Not Found"
        })
    }
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = req.user._id;
    await user.save()
    res.status(200).json({ message: 'user soft-deleted successfully' });
    

})
// for user

// get User Profile
// Get User Profile
exports.getUserProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id; 
    const user = await User.findById(userId).select('-emailVerificationCode -verificationCodeExpiry -resetPasswordCode -resetPasswordExpiry -refreshToken -refreshTokenExpiry -deletedBy')
    if (!user) {
        return res.status(404).json({
            message: "User not found"
        });
    }
    res.status(200).json(user);
});

//update User Profile
exports.updateProfile = asyncHandler(async(req, res) =>{
    const userId = req.user._id; 
    const user = await User.findById(userId)
    if (!user) {
        return res.status(404).json({
            message: "User not found"
        });
    }
    const {userName, password, phoneNumber, addresses} = req.body
    const hashedPassword = await bcrypt.hash(password, 10);
    user.userName = userName;
    user.password = hashedPassword;
    user.phoneNumber = phoneNumber;
    user.addresses = addresses;
    await user.save();
    res.status(200).json({
        message : "User Update Sucessfully"
    })

})
//delete User Profile
exports.deleteProfile = asyncHandler(async(req, res) =>{
    const userId = req.user._id;
    
    const user = await User.findById(userId);
    if(!user){
        return res.status(404).json({
            message: "User Not Found"
        })
    }
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = req.user._id;
    await user.save()
    res.status(200).json({ message: 'user soft-deleted successfully' });
    

})