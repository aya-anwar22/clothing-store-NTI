const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require('../models/User.js');
const sendSMS = require('../utils/sendSMS.js');
const asyncHandler = require("express-async-handler");
const transporter = require('../config/mailConfig');
const EMAIL_VERIFICATION_TIMEOUT = 10 * 60 * 1000;
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();
// generateTokens 
async function generateTokens(user, regenerateRefreshToken = false) {
    const accessToken = jwt.sign(
        { userId: user.id },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "30d" }
    );

    let refreshToken = user.refreshToken;
    let refreshTokenExpiry = user.refreshTokenExpiry;

    if (regenerateRefreshToken || !refreshToken || new Date() > refreshTokenExpiry) {
        refreshToken = jwt.sign(
            { userId: user.id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "40d" }
        );
        refreshTokenExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

        user.set({ refreshToken, refreshTokenExpiry });
        await user.save(); 
    }

    return { accessToken, refreshToken, refreshTokenExpiry };
}

// sendVerificationEmail 
const sendVerificationEmail = async(user) => {
    const mailOptions = {
        from: process.env.ADMIN_EMAIL,
        to: user.email,
        subject:'verfication',
        html :`${user.emailVerificationCode}`

    }
    await transporter.sendMail(mailOptions)
}
//sendCodeEmail
const sendCodeEmail = async(user) =>{
  const mailOptions = {
    from: process.env.ADMIN_EMAIL,
    to: user.email,
    subject: 'Forget email',
    html: `${user.resetPasswordCode}`
  }
      await transporter.sendMail(mailOptions)

}
// register
exports.register = asyncHandler(async (req, res) => {
  const { userName, email, password, phoneNumber } = req.body;

  if( (!email && !phoneNumber) || password) {
    return res.status(400).json({
      message: "You must provide at least an email or a phone number",
    });
  }

  // Check for existing email
  if (email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res
          .status(409)
          .json({ message: "User already exists and is verified" });
      } else {
        const newCode = generateCode();
        existingUser.emailVerificationCode = newCode;
        existingUser.verificationCodeExpiry = new Date(
          Date.now() + EMAIL_VERIFICATION_TIMEOUT
        );
        await existingUser.save();
        await sendVerificationEmail(existingUser);
        return res.status(200).json({
          message: "Verification code resent. Please verify your email.",
        });
      }
    }
  }

  // Check for existing phone number
  if (phoneNumber) {
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res
          .status(409)
          .json({ message: "User already exists and is verified" });
      } else {
        const newCode = generateCode();
        existingUser.emailVerificationCode = newCode;
        existingUser.verificationCodeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 دقائق
        await existingUser.save();

        // Send SMS
        await sendSMS(
          existingUser.phoneNumber,
          `Your verification code is: ${newCode}`
        );

        return res.status(200).json({ message: 'Verification code resent to phone number.' });
      }
    }
  }

  // Create new user
  const hashedPassword = await bcrypt.hash(password, 10);
  const newCode = generateCode();

  const newUser = new User({
    userName,
    email,
    phoneNumber,
    password: hashedPassword,
    isVerified: false,
    emailVerificationCode: newCode,
    verificationCodeExpiry: new Date(Date.now() + EMAIL_VERIFICATION_TIMEOUT),
    role: email === process.env.ADMIN_EMAIL ? "admin" : "user",
  });

  await newUser.save();

  // Send verification
  if (email) {
    await sendVerificationEmail(newUser);
  } 
  else if (phoneNumber) {
    await sendSMS(
      newUser.phoneNumber,
      `Your verification code is: ${newCode}`
    );
  }

  res.status(201).json({
    message: "Registration successful. Please verify your account.",
  });
});

// verifyEmail
exports.verifyEmail = asyncHandler(async(req, res) =>{
  const {email, code} = req.body;
  if(!email || !code){
    return res.status(400).json({ message: "Please Provide email and code" })
  };

  const user = await User.findOne({ email });
  if(!user){
    return res.status(404).json({ message: "user not found" });
  }

  if (!user.emailVerificationCode || user.emailVerificationCode !== code || new Date() > user.verificationCodeExpiry) {
    return res.status(400).json({ message: 'Invalid or expired verification code' });
  }

  user.isVerified = true;
  user.emailVerificationCode = null;
  user.verificationCodeExpiry = null;
  await user.save();
  return res.status(201).json({message: "Email virified successfully "})
})

//login
exports.login = asyncHandler(async(req, res) =>{
  const {email, password} = req.body;
  if(!email || !password){
    return res.status(400).json({message: "Please Provied email and password"});
  }

  const user = await User.findOne({ email });
  if(!user){
    return res.status(404).json({message: "User not found"});
  }

  const isMatch = await bcrypt.compare(password, user.password);
  // if(!isMatch){
  //   return res.status(400).json({message: "Invaild email or password"});
  // }

  if(!user.isVerified){
    return res.status(400).json({message: "Please verify your email first"});
  };
  const {accessToken, refreshToken} =await generateTokens(user);
  return res.status(200).json({
    message: "login successfully",
    user: user.role,
    accessToken: accessToken,
    refreshToken: refreshToken
  })
});
// forgetPassword
exports.forgetPassword = asyncHandler(async(req, res) =>{
  const { email } = req.body;
  const user = await User.findOne({ email });
  if(!user){
    return res.status(404).json({message: "user not found"});
  }
  const code = generateCode();
  user.resetPasswordCode = code;
  user.resetPasswordExpiry =new Date(Date.now() + EMAIL_VERIFICATION_TIMEOUT);
  await user.save()
  await sendCodeEmail(user);
  res.status(200).json({message: "Reset password email sent"})


})
// resetPassword 
exports.resetPassword = asyncHandler(async(req, res) =>{
  const {email, code, newPassword} = req.body;

  const user = await User.findOne({ email });
  if(!user){
    return res.status(404).json({message: "User not found"});
  }

  if (!user.resetPasswordCode || user.resetPasswordCode !== code || new Date() > user.resetPasswordExpiry) {
    return res.status(400).json({ message: 'Invalid or expired reset Password Code' });
  }
  user.resetPasswordCode = null;
  user.resetPasswordExpiry = null;
  user.password = newPassword;
  await user.save();
  return res.status(200).json({message: "Password reset successful. You can now log in with your new password."})
});
// refreshToken 
exports.refreshToken = asyncHandler(async(req, res) =>{
  const { refreshToken } = req.body;
  const user = await User.findOne({ refreshToken })
  if(!user){
    return res.status(404).json({message:'Invaild refresh token'});
  }
    try{
      jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user, true);
      return res.status(200).json({ accessToken, refreshToken: newRefreshToken })
    } catch (error) {
        return res.status(403).json({ message: 'Invalid refresh token', error: error.message });
    }
});
// logout 
exports.logout = asyncHandler(async(req, res) =>{
  const { refreshToken } = req.body;
  const user = await User.findOne({ refreshToken });
  if(!user){
    return res.status(404).json({message: "Invaild refresh Token"});
  }
  user.refreshToken=null;
  user.refreshTokenExpiry = null
  await user.save();
  return res.status(200).json({message: "Logout sucessfully"})
});