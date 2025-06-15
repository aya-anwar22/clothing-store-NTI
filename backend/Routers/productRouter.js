const express = require('express');
const router = express.Router();
const productControllers = require('../controllers/productControllers');
const authenticate = require('../middleWare/authenticate');
const upload = require('../config/multerConfig');
// for admin
router.post('/', authenticate, upload.single('productImages'), productControllers.addProduct);
router.get('/get-by-admin',authenticate,  productControllers.getAllProduct);
router.get('/get-by-admin/:productId',authenticate,  productControllers.getProductById);
router.put('/:productId',authenticate,upload.single('productImages'),  productControllers.updateProduct);
router.delete('/:productId',authenticate,  productControllers.deleteProduct);

// // for user
router.get('/', productControllers.getAllProductByUser);
router.get('/:productId',  productControllers.getProductByIdByUser);

module.exports = router;
