const Cart = require('../models/Cart');
const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Order = require('../models/Order');

exports.addToCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId, quantity } = req.body;

  if (!productId) {
    return res.status(400).json({ message: "Product is required" });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const originalPrice = product.price;
  const currentPrice = product.price; 

  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = new Cart({
      userId,
      items: [{
        productId,
        quantity,
        addedAt: new Date(),
        originalPrice,
        currentPrice
      }]
    });
  } else {
    const existingItemIndex = cart.items.findIndex(item =>
      item.productId.toString() === productId
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].addedAt = new Date();
      cart.items[existingItemIndex].originalPrice = originalPrice;
      cart.items[existingItemIndex].currentPrice = currentPrice;
    } else {
      cart.items.push({
        productId,
        quantity,
        addedAt: new Date(),
        originalPrice,
        currentPrice
      });
    }
  }

  await cart.save();
  res.status(200).json({ message: 'Product added to cart successfully', cart });
});


// GET /cart
exports.getCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const cart = await Cart.findOne({ userId }).populate('items.productId');

  if (!cart || cart.items.length === 0) {
    return res.status(200).json({ validItems: [], outdatedItems: [] });
  }

  const validItems = [];
  const outdatedItems = [];

  for (const item of cart.items) {
    const product = item.productId;

    if (!product) continue;

    const latestPrice = product.price;

    if (item.currentPrice !== latestPrice) {
      // Move to outdated
      outdatedItems.push({
        productId: product,
        quantity: item.quantity,
        originalPrice: item.currentPrice,
        currentPrice: latestPrice,
        note: 'The price has changed'
      });
    } else {
      validItems.push({
        productId: product,
        quantity: item.quantity,
        currentPrice: item.currentPrice,
        originalPrice: item.originalPrice
      });
    }
  }

  res.status(200).json({ validItems, outdatedItems });
});




// update cart    لا يُسمح بالتعديل لو الأوردر في حالة shipped.
exports.updateCartItem = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId, quantity } = req.body;

  if (!productId || !quantity || quantity < 1) {
    return res.status(400).json({ message: 'Valid productId and quantity are required' });
  }

  // check if the product is part of a shipped order
  const shippedOrder = await Order.findOne({
    userId,
    'items.productId': productId,
    status: 'shipped'
  });

  if (shippedOrder) {
    return res.status(403).json({ message: 'Cannot update quantity. Product already shipped in an order.' });
  }

  const cart = await Cart.findOne({ userId });

  if (!cart) {
    return res.status(404).json({ message: 'Cart not found' });
  }

  const itemIndex = cart.items.findIndex(item =>
    item.productId.toString() === productId
  );

  if (itemIndex === -1) {
    return res.status(404).json({ message: 'Product not found in cart' });
  }

  cart.items[itemIndex].quantity = quantity;
  await cart.save();

  res.status(200).json({ message: 'Cart item updated successfully', cart });
});

//DELETE cart
exports.removeFromCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;

  if (!productId) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  const cart = await Cart.findOne({ userId });

  if (!cart) {
    return res.status(404).json({ message: 'Cart not found' });
  }

  const itemIndex = cart.items.findIndex(
    item => item.productId.toString() === productId
  );

  if (itemIndex === -1) {
    return res.status(404).json({ message: 'Product not found in cart' });
  }

  cart.items.splice(itemIndex, 1);
  await cart.save();

  res.status(200).json({ message: 'Product removed from cart', cart });
});
