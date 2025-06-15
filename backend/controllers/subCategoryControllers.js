const SubCategory = require('../models/Subcategory');
const asyncHandler = require('express-async-handler');
const cloudinary = require('../config/cloudinary');
const { default: slugify } = require('slugify');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');

// for admin
exports.addSubCategory = asyncHandler(async(req, res) =>{
    const { subcategoryName, categoryId } = req.body;
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }

    const category = await Category.findById(categoryId);
    if(!category){
        return res.status(404).json({message : "Category not found"})
    }
    try{
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'subCategory'
        });

        const subCategorySlug = slugify(subcategoryName, {lower: true});
        const newSubCat = await SubCategory.create({
            subcategoryName,
            subCategorySlug,
            categoryId,
            subcategoryImage: result.secure_url
        })
        res.status(201).json({
            message: "SubCategory create Successfully",
            subCategory: newSubCat
        })
    } catch(error){
        return res.status(501).json({message: error.message})
    }
});

exports.getAllSubCategory = asyncHandler(async(req, res) =>{
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || '';
    const searchRegex = new RegExp(search, 'i');
    const totalSubCategories = await SubCategory.countDocuments({subcategoryName: searchRegex});
    const subCategories = await SubCategory.find({subcategoryName: searchRegex})
    .skip(skip)
    .limit(limit)
    .sort({ createAt: -1});

    return res.status(200).json({
        totalSubCategories,
        currentPage: page,
        totalPage: Math.ceil(totalSubCategories),
        subCategories
    })
    
});

exports.getSubCategoryById = asyncHandler(async(req, res) =>{
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const subCategoryId = req.params.subCategoryId
    const subCategory = await SubCategory.findById(subCategoryId);
    if(!subCategory){
        return res.status(404).json({message : "Sub Category not found"})
    }
    return res.status(200).json({
        message: subCategory
    })
})

exports.updateSubCategory = asyncHandler(async (req, res) => {
    const subCategoryId = req.params.subCategoryId;
    const { subcategoryName, categoryId } = req.body;
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const category = await Category.findById(categoryId);
    if(!category){
        return res.status(404).json({message : "Category not found"})
    }
    const subCategory = await SubCategory.findById(subCategoryId);
    if (!subCategory) {
        return res.status(404).json({ message: "SubCategory not found" });
    }

    try {
        let imageUrl = subCategory.subcategoryImage;
        if (req.file && req.file.path) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'sub-categorys'
            });
            imageUrl = result.secure_url;
        }

        const subcategorySlug = subcategoryName
            ? slugify(subcategoryName, { lower: true })
            : subCategory.subcategorySlug;

        const updateData = {
            subcategoryName: subcategoryName || subCategory.subcategoryName,
            subcategorySlug,
            subcategoryImage: imageUrl,
            categoryId: categoryId || subCategory.categoryId
        };

        const updateSubCategory = await SubCategory.findByIdAndUpdate(
            subCategoryId,
            updateData,
            { new: true }
        );

        res.status(200).json({
            message: "Sub-Category updated successfully",
            subCategory: updateSubCategory
        });
    } catch (error) {
        return res.status(500).json({ message: "Error updating category", error });
    }
});

exports.deleteSubCategory = asyncHandler(async(req, res) =>{
    const subCategoryId = req.params.subCategoryId;
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }

    const subCategory = await SubCategory.findById(subCategoryId);
    if(!subCategory){
        return res.status(404).json({
            message: "SubCategory not found"
        })
    }
    if(subCategory.isDeleted){
        return res.status(400).json({
            message : "SubCategory Deleted Successfully"
        })
    }
    subCategory.isDeleted = true;
    subCategory.deletedAt = new Date();
    subCategory.deletedBy = req.user._id

    await subCategory.save();
    res.status(200).json({
        message : "Sub-Category soft-deleted successfully"
    })
})

// for user
exports.getAllSubCategoryByUser = asyncHandler(async(req, res) =>{

    // pagination
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1 ) * limit;

    // search
    const search = req.query.search || '';
    const searchRegex = new RegExp(search, 'i');
    const totalSubCategory = await SubCategory.countDocuments({subcategoryName:searchRegex, isDeleted: false} )
    const subCategorys = await SubCategory.find({subcategoryName: searchRegex, isDeleted: false}).select('-_id -isDeleted -deletedAt -deletedBy')    .skip(skip)
    .limit(limit)
    .sort({ createdAt : -1}

    
    )
    return res.status(200).json({
        totalSubCategory,
        currentPage: page,
        totalPage: Math.ceil(totalSubCategory / limit),
        subCategorys
    })

    })

exports.getSubcategoryByIdByUser = asyncHandler(async(req, res) =>{
    const subCategoryId = req.params.subCategoryId
    const subCategory = await SubCategory.findOne({
    _id: subCategoryId,
    isDeleted: false
    }).select('-_id -isDeleted -deletedAt -deletedBy');
    if(!subCategory){
        return res.status(404).json({
            message: "Sub-Category not found"
        })
    }
    return res.status(200).json(subCategory)

})