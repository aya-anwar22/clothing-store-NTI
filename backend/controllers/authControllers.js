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
        { userId: user.id,role: user.role, userName:user.userName },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
    );

    let refreshToken = user.refreshToken;
    let refreshTokenExpiry = user.refreshTokenExpiry;

    if (regenerateRefreshToken || !refreshToken || new Date() > refreshTokenExpiry) {
        refreshToken = jwt.sign(
            { userId: user.id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "10d" }
        );
        refreshTokenExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

        user.set({ refreshToken, refreshTokenExpiry });
        await user.save(); 
    }

    return { accessToken, refreshToken, refreshTokenExpiry };
}

// sendVerificationEmail 
const sendVerificationEmail = async (user) => {
  const mailOptions = {
    from: process.env.ADMIN_EMAIL,
    to: user.email,
    subject: 'Email Verification',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <h2 style="color: #4CAF50;">Verify Your Email</h2>
          <p style="font-size: 16px; color: #333;">
            Hello <strong>${user.userName || 'User'}</strong>,
          </p>
          <p style="font-size: 16px; color: #333;">
            Thank you for registering with us! Please use the verification code below to verify your email address:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; font-size: 24px; font-weight: bold; color: #fff; background-color: #4CAF50; padding: 12px 20px; border-radius: 5px;">
              ${user.emailVerificationCode}
            </span>
          </div>
          <p style="font-size: 14px; color: #888;">If you didn’t request this, you can safely ignore this email.</p>
          <p style="font-size: 14px; color: #aaa;">— The Team</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

//sendCodeEmail
const sendCodeEmail = async (user) => {
  const mailOptions = {
    from: process.env.ADMIN_EMAIL,
    to: user.email,
    subject: 'Password Reset Code',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
          <h2 style="color: #d9534f;">Reset Your Password</h2>
          <p style="font-size: 16px; color: #333;">
            Hello <strong>${user.userName || 'User'}</strong>,
          </p>
          <p style="font-size: 16px; color: #333;">
            We received a request to reset your password. Use the verification code below to proceed:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; font-size: 24px; font-weight: bold; color: #fff; background-color: #d9534f; padding: 12px 20px; border-radius: 5px;">
              ${user.resetPasswordCode}
            </span>
          </div>
          <p style="font-size: 14px; color: #888;">
            If you didn’t request this, you can ignore this email safely.
          </p>
          <p style="font-size: 14px; color: #aaa;">— The Support Team</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Login With Google 
exports.googleAuthCallback = async (req, res) => {
  try {
    const user = req.user;

    const { accessToken, refreshToken } = await generateTokens(user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "development",
      sameSite: "Strict",
      maxAge: 10 * 24 * 60 * 60 * 1000
    });


    return res.redirect(`http://localhost:4200/oauth-callback?token=${accessToken}`);

  } catch (error) {
    console.error("Google Auth Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong during Google login",
    });
  }
};





// register
exports.register = asyncHandler(async (req, res) => {
  const { userName, email, password, confirmPassword, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({
      status: "faild",
      message: "Please provide either an email or a phone number.",
    });
  }

  if (!password || !confirmPassword) {
    return res.status(400).json({
    status: "faild",
      message: "Please enter both password and confirm password.",
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      status: "faild",
      message: "Password and confirm password do not match.",
    });
  }

  if (email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res
          .status(409)
          .json({ status: "faild", message: "This email is already registered and verified." });
      } else {
        const newCode = generateCode();
        existingUser.emailVerificationCode = newCode;
        existingUser.verificationCodeExpiry = new Date(
          Date.now() + EMAIL_VERIFICATION_TIMEOUT
        );
        await existingUser.save();
        await sendVerificationEmail(existingUser);
        return res.status(200).json({
          status: "faild",
          message: "A new verification code has been sent to your email.",
        });
      }
    }
  }

  if (phoneNumber) {
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res
          .status(409)
          .json({ status: "faild", message: "This phone number is already registered and verified." });
      } else {
        const newCode = generateCode();
        existingUser.emailVerificationCode = newCode;
        existingUser.verificationCodeExpiry = new Date(Date.now() + 10 * 60 * 1000); 
        await existingUser.save();

        // await sendSMS(
        //   existingUser.phoneNumber,
        //   `Your verification code is: ${newCode}`
        // );

        return res.status(200).json({status: "success", message: 'A new verification code has been sent to your phone.' });
      }
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newCode = generateCode();

  const newUser = new User({
    userName,
    email: email|| null,
    phoneNumber: phoneNumber|| null,
    password: hashedPassword,
    isVerified: false,
    emailVerificationCode: newCode,
    verificationCodeExpiry: new Date(Date.now() + EMAIL_VERIFICATION_TIMEOUT),
    role: email === process.env.ADMIN_EMAIL ? "admin" : "user",
  });

  await newUser.save();

  if (email) {
    await sendVerificationEmail(newUser);
  } 
  // else if (phoneNumber) {
  //   await sendSMS(
  //     newUser.phoneNumber,
  //     `Your verification code is: ${newCode}`
  //   );
  // }

  res.status(201).json({
    status: "success",
    message: "Registration successful. A verification code has been sent. Please verify your account.",
  });
});

// verifyEmail
exports.verifyEmail = asyncHandler(async(req, res) =>{
  const {email, code} = req.body;
  if(!email || !code){
    return res.status(400).json({ status: "faild", message: "Please Provide email and code" })
  };

  const user = await User.findOne({ email });
  if(!user){
    return res.status(404).json({status: "faild", message: "user not found" });
  }

  if (!user.emailVerificationCode || user.emailVerificationCode !== code || new Date() > user.verificationCodeExpiry) {
    return res.status(400).json({ status: "faild",message: 'Invalid or expired verification code' });
  }

  user.isVerified = true;
  user.emailVerificationCode = null;
  user.verificationCodeExpiry = null;
  await user.save();
  return res.status(201).json({
  status: "success",
    message: "Email virified successfully "
  })
})

//login
exports.login = asyncHandler(async(req, res) =>{
  const {email, password, phoneNumber} = req.body;
  if (!email && !phoneNumber) {
    return res.status(400).json({
      status: "faild",
      message: "Please provide either an email or a phone number.",
    });
  }


   if (!password ) {
    return res.status(400).json({
      status: "faild",
      message: "Please enter password ",
    });
  }
  if(email){
    const user = await User.findOne({ email });
    if(!user){
      return res.status(404).json({status: "faild",message: "User not found"});
    }

    const isMatch = await bcrypt.compare(password, user.password);
    // if(!isMatch){
    //   return res.status(400).json({status: "faild",message: "Invaild email or password"});
    // }

    if(!user.isVerified){
      return res.status(400).json({status: "faild",message: "Please verify your email first"});
    };

    const {accessToken, refreshToken} =await generateTokens(user,true );
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "development", 
    sameSite: "Strict",
    maxAge: 10 * 24 * 60 * 60 * 1000 
});
  return res.status(200).json({
    status: "success",
    message: "login successfully",
    accessToken: accessToken,
  })

  }
  if(phoneNumber){


    const user = await User.findOne({ phoneNumber });
    if(!user){
      return res.status(404).json({message: "User not found"});
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`isMatc: ${isMatch} password: ${password}, user.password ${user.password}`)
    // if(!isMatch){
    //   return res.status(400).json({message: "Invaild email or password"});
    // }

    const hashedPassword = await bcrypt.hash(password, 10);
console.log("Hashed password at registration:", hashedPassword);

    const {accessToken, refreshToken} =await generateTokens(user);

    res.cookie("refreshToken", refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "development", 
  sameSite: "Strict",
  maxAge: 10 * 24 * 60 * 60 * 1000 
});

  return res.status(200).json({
    message: "login successfully",
    user: user.role,
    accessToken: accessToken,
  })
  }
  
});
// forgetPassword
exports.forgetPassword = asyncHandler(async(req, res) =>{
  const { email } = req.body;
  const user = await User.findOne({ email });
  if(!user){
    return res.status(404).json({status: "faild",message: "user not found"});
  }
  const code = generateCode();
  user.resetPasswordCode = code;
  user.resetPasswordExpiry =new Date(Date.now() + EMAIL_VERIFICATION_TIMEOUT);
  await user.save()
  await sendCodeEmail(user);
  res.status(200).json({status: "success",message: "Reset password email sent"})


})
// resetPassword 
exports.resetPassword = asyncHandler(async(req, res) =>{
  const {email, code, newPassword} = req.body;

  const user = await User.findOne({ email });
  if(!user){
    return res.status(404).json({status: "faild",message: "User not found"});
  }

  if (!user.resetPasswordCode || user.resetPasswordCode !== code || new Date() > user.resetPasswordExpiry) {
    return res.status(400).json({status: "faild", message: 'Invalid or expired reset Password Code' });
  }
  user.resetPasswordCode = null;
  user.resetPasswordExpiry = null;
  user.password = newPassword;
  await user.save();
  return res.status(200).json({status: "success",message: "Password reset successful. You can now log in with your new password."})
});
// refreshToken 
exports.refreshToken = asyncHandler(async(req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(400).json({ message: 'No refresh token provided' });
  }

  const user = await User.findOne({ refreshToken });
  if (!user) {
    return res.status(404).json({ message: 'Invalid refresh token' });
  }

  try {
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user);

     res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "development", 
      sameSite: "Strict",
      maxAge: 10 * 24 * 60 * 60 * 1000 
});

    return res.status(200).json({ accessToken });
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