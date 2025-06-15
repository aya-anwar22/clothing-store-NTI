const express = require('express');
const router = express.Router();
const brandControllers = require('../controllers/brandControllers');
const authenticate = require('../middleWare/authenticate');
const upload = require('../config/multerConfig');
// for admin
router.post('/', authenticate, upload.single('brandImage'), brandControllers.addBrand);
router.get('/get-by-admin',authenticate,  brandControllers.getAllBrandByAdmin);
router.get('/get-by-admin/:brandId',authenticate,  brandControllers.getBrandByIdByAdmin);
router.put('/:brandId',authenticate,upload.single('brandImage'),  brandControllers.updateBrand);
router.patch('/:brandId',authenticate,  brandControllers.deleteBrand);



// for user
router.get('/', brandControllers.getAllBrand);
router.get('/:brandId',  brandControllers.getBrandById);

module.exports = router;
