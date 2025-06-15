const express = require('express');
const router= express.Router()
const subCategoryControllers = require('../controllers/subCategoryControllers')
const authenticate = require('../middleWare/authenticate');
const upload = require('../config/multerConfig');
// for admin

router.post('/', authenticate, upload.single('subcategoryImage'), subCategoryControllers.addSubCategory)
router.get('/get-by-admin', authenticate, subCategoryControllers.getAllSubCategory)
router.get('/get-by-admin/:subCategoryId', authenticate, subCategoryControllers.getSubCategoryById)
router.put('/:subCategoryId', authenticate, upload.single('subcategoryImage'), subCategoryControllers.updateSubCategory);
router.delete('/:subCategoryId', authenticate, subCategoryControllers.deleteSubCategory);


// for user
router.get('/', subCategoryControllers.getAllSubCategoryByUser);
router.get('/:subCategoryId', subCategoryControllers.getSubcategoryByIdByUser);

module.exports = router;