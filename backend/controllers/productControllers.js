const SubCategory = require('../models/Subcategory');
const asyncHandler = require('express-async-handler');
const cloudinary = require('../config/cloudinary');
const { default: slugify } = require('slugify');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');
const Product = require('../models/Product');
const Brand = require('../models/Brand');

// // for admin
exports.addProduct = asyncHandler(async(req, res) =>{
    const { productName,subcategoryId, brandId, price, quantity,gender, stockAlertThreshold} = req.body;
    if(!productName|| !subcategoryId || !brandId || !price|| !quantity|| !gender|| !stockAlertThreshold){
        return res.status(400).json({
            message: "All filed required"
        })
    }
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }

    const subcategory = await SubCategory.findById(subcategoryId);
    if(!subcategory){
        return res.status(404).json({message : "subcategory not found"})
    }

    const brand = await Brand.findById(brandId);
    if(!brand){
        return res.status(404).json({message : "brand not found"})
    }
    try{
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'product'
        });

        const productSlug = slugify(productName, {lower: true});
        const newProduct = await Product.create({
            productName,productSlug, subcategoryId, brandId, price, quantity,gender, stockAlertThreshold,
        
            productImages: result.secure_url
        })
        res.status(201).json({
            message: "Product create Successfully",
            Product: newProduct
        })
    } catch(error){
        return res.status(501).json({message: error.message})
    }
});

exports.getAllProduct = asyncHandler(async(req, res) =>{
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || '';
    const searchRegex = new RegExp(search, 'i');
    const totalProductes = await Product.countDocuments({productName: searchRegex});
    const productes = await Product.find({productName: searchRegex})
    .skip(skip)
    .limit(limit)
    .sort({ createAt: -1});

    return res.status(200).json({
        totalProductes,
        currentPage: page,
        totalPage: Math.ceil(totalProductes),
        productes
    })
    
});

exports.getProductById = asyncHandler(async(req, res) =>{
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const productId = req.params.productId
    const product = await Product.findById(productId);
    if(!product){
        return res.status(404).json({message : "product not found"})
    }
    return res.status(200).json({
        message: product
    })
})

exports.updateProduct = asyncHandler(async (req, res) => {
    const productId = req.params.productId;
    const { productName,subcategoryId, brandId, price, quantity,gender, stockAlertThreshold} = req.body;
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const product = await Product.findById(productId);
    if (!product) {
        return res.status(404).json({ message: "product not found" });
    }
    const brand = await Brand.findById(brandId);
    if(!brand){
        return res.status(404).json({message : "Brand not found"})
    }
    const subCategory = await SubCategory.findById(subcategoryId);
    if (!subCategory) {
        return res.status(404).json({ message: "SubCategory not found" });
    }


    

    try {
        let imageUrl = product.productImages;
        if (req.file && req.file.path) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'product'
            });
            imageUrl = result.secure_url;
        }

        const productSlug = productName
            ? slugify(productName, { lower: true })
            : product.productSlug;

        const updateData = {
            productName: productName || product.productName,
            productSlug,
            productImages: imageUrl,
            subcategoryId: subcategoryId || product.subcategoryId,
            brandId: brandId || product.brandId,
            price: price || product.price,
            quantity: quantity || product.quantity,
            gender: gender || product.gender,
            stockAlertThreshold: stockAlertThreshold || product.stockAlertThreshold,
        };

        const updateProduct = await Product.findByIdAndUpdate(
            productId,
            updateData,
            { new: true }
        );

        res.status(200).json({
            message: "Product updated successfully",
            product: updateProduct
        });
    } catch (error) {
        return res.status(500).json({ message: "Error updating category", error });
    }
});

exports.deleteProduct = asyncHandler(async(req, res) =>{
    const productId = req.params.productId;
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }

    const product = await Product.findById(productId);
    if(!product){
        return res.status(404).json({
            message: "product not found"
        })
    }
    if(product.isDeleted){
        return res.status(400).json({
            message : "product Deleted Successfully"
        })
    }
    product.isDeleted = true;
    product.deletedAt = new Date();
    product.deletedBy = req.user._id

    await product.save();
    res.status(200).json({
        message : "product soft-deleted successfully"
    })
})

// // for user
exports.getAllProductByUser = asyncHandler(async(req, res) =>{

    // pagination
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1 ) * limit;

    // search
    const search = req.query.search || '';
    const searchRegex = new RegExp(search, 'i');
    const totalProductes = await Product.countDocuments({productName:searchRegex, isDeleted: false} )
    const products = await Product.find({productName: searchRegex, isDeleted: false}).select('-_id -isDeleted -deletedAt -deletedBy')    .skip(skip)
    .limit(limit)
    .sort({ createdAt : -1}

    
    )
    return res.status(200).json({
        totalProductes,
        currentPage: page,
        totalPage: Math.ceil(totalProductes / limit),
        products
    })

    })

exports.getProductByIdByUser = asyncHandler(async(req, res) =>{
    const productId = req.params.productId
    const product = await Product.findOne({
    _id: productId,
    isDeleted: false
    }).select('-_id -isDeleted -deletedAt -deletedBy');
    if(!product){
        return res.status(404).json({
            message: "productnot found"
        })
    }
    return res.status(200).json(product)

})