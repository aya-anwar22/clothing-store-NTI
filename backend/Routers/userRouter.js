const express = require('express');
const router = express.Router()
const userControllers = require('../controllers/userControllers')
const authenticate = require('../middleWare/authenticate');

// for user
router.get('/profile', authenticate, userControllers.getUserProfile)
router.put('/profile', authenticate, userControllers.updateProfile)
router.delete('/profile', authenticate, userControllers.deleteProfile)

// for admin
router.post('/', authenticate, userControllers.addUser)
router.get('/', authenticate, userControllers.getAllUser)
router.get('/:userId', authenticate, userControllers.getUserById)
router.put('/:userId', authenticate, userControllers.updateUser)
router.delete('/:userId', authenticate, userControllers.deleteUser)



module.exports = router;