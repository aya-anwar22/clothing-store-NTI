const cloudinary = require('../config/cloudinary');
const slugify = require('slugify');
const Brand = require('../models/Brand');
const asyncHandler = require('express-async-handler');
// for admin
exports.addBrand = asyncHandler(async (req, res) => {
    const { brandName } = req.body;

    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'brands'
        });

        const brandSlug = slugify(brandName, { lower: true });

        const newBrand = await Brand.create({
            brandName,
            brandSlug,
            brandImage: result.secure_url
        });

        res.status(201).json({
            message: "Brand created successfully",
            brand: newBrand
        });
    } catch (error) {
        console.error('Error creating brand:', error);
        return res.status(500).json({ message: "Error creating brand" });
    }
});

exports.getAllBrandByAdmin = asyncHandler(async(req, res) =>{
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

    const totalBrands = await Brand.countDocuments({brandName: searchRegex});
    const brands = await Brand.find({ brandName: searchRegex })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt : -1})

    // get data
    return res.status(200).json({
        totalBrands,
        currentPage: page,
        totalPages: Math.ceil(totalBrands / limit),
        brands
    })
})


exports.getBrandByIdByAdmin = asyncHandler(async(req, res) => {
    const brandId = req.params.brandId;
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const brand = await Brand.findById(brandId);
    if(!brand){
        return res.status(404).json({message: "Brand not found"});
    }
    return res.status(200).json({brand})
});

exports.updateBrand = asyncHandler(async (req, res) => {
    const brandId = req.params.brandId;
    const { brandName } = req.body;

    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }

    const brand = await Brand.findById(brandId);
    if (!brand) {
        return res.status(404).json({ message: "Brand not found" });
    }

    try {
        let imageUrl = brand.brandImage;

        if (req.file && req.file.path) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'brands'
            });
            imageUrl = result.secure_url;
        }

        const brandSlug = slugify(brandName, { lower: true });

        const updatedBrand = await Brand.findByIdAndUpdate(
            brandId,
            {
                brandName,
                brandSlug,
                brandImage: imageUrl
            },
            { new: true }
        );

        res.status(200).json({
            message: "Brand updated successfully",
            brand: updatedBrand
        });
    } catch (error) {
        console.error('Error updating brand:', error);
        return res.status(500).json({ message: "Error updating brand" });
    }
});


exports.deleteBrand = asyncHandler(async (req, res) => {
    const brandId = req.params.brandId;

    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }

    const brand = await Brand.findById(brandId);
    if (!brand) {
        return res.status(404).json({ message: 'Brand not found' });
    }

    if (brand.isDeleted) {
        return res.status(400).json({ message: 'Brand already deleted' });
    }

    brand.isDeleted = true;
    brand.deletedAt = new Date();
    brand.deletedBy = req.user._id;

    await brand.save();

    res.status(200).json({ message: 'Brand soft-deleted successfully' });
});

// for user
exports.getAllBrand = asyncHandler(async(req, res) =>{
   

    // pagination
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    // search
    const search = req.query.search || '';
    const searchRegex = new RegExp(search, 'i')

    const totalBrands = await Brand.countDocuments({brandName:searchRegex, isDeleted: false} )
    const brands = await Brand.find({brandName: searchRegex, isDeleted: false}).select('-_id -isDeleted -deletedAt -deletedBy')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt : -1})

    return res.status(200).json({
        totalBrands,
         currentPage: page,
        totalPages: Math.ceil(totalBrands / limit),
        brands
    })
})

exports.getBrandById = asyncHandler(async(req, res) => {
    const brandId = req.params.brandId;
    
    const brand = await Brand.findOne({
    _id: brandId,
    isDeleted: false
    }).select('-_id -isDeleted -deletedAt -deletedBy');

    if(!brand){
        return res.status(404).json({message: "Brand not found"});
    }
    return res.status(200).json({brand})
})