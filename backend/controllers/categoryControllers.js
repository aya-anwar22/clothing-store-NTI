const Category = require('../models/Category');
const asyncHandler = require('express-async-handler');
const cloudinary = require('../config/cloudinary');
const { default: slugify } = require('slugify');
// for admin
exports.addCategory = asyncHandler(async(req, res) =>{
    const { categoryName } = req.body;
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }
    try{

        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'categorys'
        });

        const categorySlug = slugify(categoryName, {lower: true});
        const newCategory = await Category.create({
            categoryName,
            categoryImage: result.secure_url,
            categorySlug
        })
        res.status(201).json({
            message: "Category created Sucessfully",
            category: newCategory
        })
    }catch(error){

        console.error('Error Creating Category: ', error);
        return res.status(500).json({message: 'Error Creating Category: ', error})
    }

});

exports.getAllCategoryByAdmin = asyncHandler(async(req, res) =>{
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // search
    const search = req.query.search || '';
    const searchRegex = new RegExp(search, 'i');

    const totalCategories = await Category.countDocuments({categoryName: searchRegex});
    const categories = await Category.find({categoryName: searchRegex})
    .skip(skip)
    .limit(limit)
    .sort({ createdAt : -1})

    return res.status(200).json({
        totalCategories,
        currentpage: page,
        totalPages: Math.ceil(totalCategories / limit),
        categories

    })
});

exports.getCategoryByIdByAdmin = asyncHandler(async(req, res) =>{
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }
    const categoryId = req.params.categoryId;
    const category = await Category.findById(categoryId)
    if(!category){
        return res.status(404).json({message: "Category not found"});
    }
    return res.status(200).json({
        message: category
    })

})


exports.updateCategory = asyncHandler(async (req, res) => {
    const categoryId = req.params.categoryId;
    const { categoryName } = req.body;

    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
        return res.status(404).json({ message: "category not found" });
    }

    try {
        let imageUrl = category.categoryImage;

        if (req.file && req.file.path) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'categorys'
            });
            imageUrl = result.secure_url;
        }

        const categorySlug = slugify(categoryName, { lower: true });

        const updatedcategory = await Category.findByIdAndUpdate(
            categoryId,
            {
                categoryName,
                categorySlug,
                categoryImage: imageUrl
            },
            { new: true }
        );

        res.status(200).json({
            message: "category updated successfully",
            category: updatedcategory
        });
    } catch (error) {
        console.error('Error updating category:', error);
        return res.status(500).json({ message: "Error updating category" });
    }
});

exports.deletecategory = asyncHandler(async (req, res) => {
    const categoryId = req.params.categoryId;

    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
        return res.status(404).json({ message: 'category not found' });
    }

    if (category.isDeleted) {
        return res.status(400).json({ message: 'category already deleted' });
    }

    category.isDeleted = true;
    category.deletedAt = new Date();
    category.deletedBy = req.user._id;

    await category.save();

    res.status(200).json({ message: 'category soft-deleted successfully' });
});

// for user
exports.getAllcategory = asyncHandler(async(req, res) =>{
   

    // pagination
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skip = (page - 1) * limit;
    // search
    const search = req.query.search || '';
    const searchRegex = new RegExp(search, 'i')

    const totalcategorys = await Category.countDocuments({categoryName:searchRegex, isDeleted: false} )
    const categorys = await Category.find({categoryName: searchRegex, isDeleted: false}).select('-_id -isDeleted -deletedAt -deletedBy')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt : -1})

    return res.status(200).json({
        totalcategorys,
         currentPage: page,
        totalPages: Math.ceil(totalcategorys / limit),
        categorys
    })
})

exports.getcategoryById = asyncHandler(async(req, res) => {
    const categoryId = req.params.categoryId;
    
    const category = await Category.findOne({
    _id: categoryId,
    isDeleted: false
    }).select('-_id -isDeleted -deletedAt -deletedBy');

    if(!category){
        return res.status(404).json({message: "category not found"});
    }
    return res.status(200).json({category})
})