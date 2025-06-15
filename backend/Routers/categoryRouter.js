const express = require('express');
const router = express.Router();
const categoryControllers = require('../controllers/categoryControllers')
const authenticate = require('../middleWare/authenticate');
const upload = require('../config/multerConfig');
// for admin
router.post('/', authenticate, upload.single('categoryImage'), categoryControllers.addCategory);
router.get('/get-by-admin', authenticate, categoryControllers.getAllCategoryByAdmin);
router.get('/get-by-admin/:categoryId', authenticate, categoryControllers.getCategoryByIdByAdmin);
router.put('/:categoryId', authenticate, upload.single('categoryImage'), categoryControllers.updateCategory);
router.patch('/:categoryId', authenticate, categoryControllers.deletecategory);



// for user
router.get('/', categoryControllers.getAllcategory);
router.get('/:categoryId', categoryControllers.getcategoryById);

module.exports = router;
