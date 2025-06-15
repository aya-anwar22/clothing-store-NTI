const express = require('express');
const router = express.Router()
const authControllers = require('../controllers/authControllers')
router.post('/sign-up', authControllers.register)
router.post('/verify-email', authControllers.verifyEmail)
router.post('/login', authControllers.login)
router.post('/forget-password', authControllers.forgetPassword)
router.post('/rest-password', authControllers.resetPassword)
router.post('/refresh-token', authControllers.refreshToken)
router.post('/logout', authControllers.logout)


module.exports = router;