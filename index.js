const { PrismaClient } = require("@prisma/client");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
require('dotenv').config(); // For loading environment variables

const app = express();
const port = 3000;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Middleware to verify JWT
const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer token format
  if (!token) {
    return res.status(403).json({ error: 'No token provided' });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to authenticate token' });
    }
    req.userId = decoded.id; // Save user ID for future use
    next();
  });
};

// GET request to fetch all cards with associated items
app.get('/cards', async (req, res) => {
  try {
    const cardData = await prisma.card.findMany({
      include: {
        items: true,  // Fetch associated CardItems
      },
    });
    res.json({ msg: "Cards fetched successfully", data: cardData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// GET request to fetch a single card by ID with associated items
app.get('/cards/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const card = await prisma.card.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: true,  // Fetch associated CardItems
      },
    });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ msg: "Card fetched successfully", data: card });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});


app.post('/cart', authenticate, async (req, res) => {
  const { cardItemId, quantity } = req.body;

  try {
    const cardItem = await prisma.cardItem.findUnique({
      where: { id: cardItemId },
    });

    if (!cardItem) {
      return res.status(404).json({ error: 'Card item not found' });
    }

    const newCartItem = await prisma.addToCart.create({
      data: {
        quantity,
        cardItemId,
        authId: req.userId, // Use authenticated user ID
      },
    });

    res.status(201).json({ msg: "Item added to cart successfully", data: newCartItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// GET request to fetch all cart items for the authenticated user
app.get('/cart-items', authenticate, async (req, res) => {
  try {
    const userId = req.userId; // Get userId from JWT token

    const cartItems = await prisma.addToCart.findMany({
      where: { authId: userId },
      include: {
        cardItem: true, // Include the details of the associated CardItem
      },
    });

    if (cartItems.length === 0) {
      return res.status(404).json({ message: "No items found in the cart" });
    }

    res.status(200).json({ msg: "Cart items fetched successfully", data: cartItems });
  } catch (err) {
    console.error("[GET_CART_ITEMS_ERROR]", err.message);
    res.status(500).json({ error: 'Failed to fetch cart items' });
  }
});

// DELETE request to remove a cart item
app.delete('/cart-item', authenticate, async (req, res) => {
  const { id } = req.body; // Get the cart item ID from the request body

  try {
    // Find the cart item by ID and ensure it belongs to the authenticated user
    const cartItem = await prisma.addToCart.findUnique({
      where: { id },
    });

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Ensure the cart item belongs to the authenticated user
    if (cartItem.authId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this cart item' });
    }

    // Delete the cart item
    await prisma.addToCart.delete({
      where: { id },
    });

    res.status(200).json({ msg: "Item removed from cart successfully" });
  } catch (err) {
    console.error("[DELETE_CART_ITEM_ERROR]", err.message);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});



// POST request to create a new card with items
app.post('/cards', async (req, res) => {
  const { title, para, image, items } = req.body;

  try {
    const newCard = await prisma.card.create({
      data: {
        title,
        para,
        image,
        items: {
          create: items,  // Assumes `items` is an array of objects with properties matching `CardItem` model
        },
      },
    });

    res.status(201).json({ msg: "Card created successfully", data: newCard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// POST request to handle user login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.auth.findUnique({
      where: { email },
    });

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to authenticate user' });
  }
});

// POST request to handle user sign-up
app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await prisma.auth.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.auth.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, {
      expiresIn: '24h',
    });

    res.status(201).json({ msg: "User registered successfully", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST request to handle adding items to cart (protected route)
app.post('/cart', authenticate, async (req, res) => {
  const { cardItemId, quantity } = req.body;

  try {
    const newItem = await prisma.cartItem.create({
      data: {
        quantity,
        cardItemId,
        userId: req.userId, // Use authenticated user ID
      },
    });
    res.status(201).json({ msg: "Item added to cart successfully", data: newItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// GET request to fetch user data (protected route)
app.get('/user', authenticate, async (req, res) => {
  try {
    const user = await prisma.auth.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    res.status(200).json({
      user: {
        userId: user.id,
        userName: user.name,
        userProfile: user.imageUrl,
        userEmail: user.email,
        userProfileCompleted: user.isProfileComplete,
      },
    });
  } catch (error) {
    console.error("[GET_USER_INFO_ERROR]", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post('/reviews', authenticate, async (req, res) => {
  const { cardId, rating, comment } = req.body;

  try {
    // Check if the card exists
    const card = await prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Create the review
    const newReview = await prisma.review.create({
      data: {
        rating,
        comment,
        cardId,
        authId: req.userId, // Use authenticated user ID
      },
    });

    res.status(201).json({ msg: "Review added successfully", data: newReview });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

app.get('/cards/:id/reviews', async (req, res) => {
  const { id: cardId } = req.params;

  try {
    // Check if the card exists
    const card = await prisma.card.findUnique({
      where: { id: parseInt(cardId) },
    });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Fetch all reviews for the specified card
    const reviews = await prisma.review.findMany({
      where: { cardId: parseInt(cardId) },
      include: {
        auth: { select: { name: true } }, // Include user details like name
      },
    });

    res.status(200).json({ msg: "Reviews fetched successfully", data: reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.post('/create-payment-intent', authenticate, async (req, res) => {
  const { amount } = req.body; // Receive amount in cents

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'inr', // Change currency if needed
      payment_method_types: ['card'],
      metadata: { userId: req.userId }, // Attach user info for tracking
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("[PAYMENT_INTENT_ERROR]", err.message);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// POST request to record successful payments in the database
app.post('/payments', authenticate, async (req, res) => {
  const { paymentId, amount } = req.body;

  try {
    const payment = await prisma.payment.create({
      data: {
        paymentId,
        amount,
        authId: req.userId,
      },
    });

    res.status(201).json({ msg: "Payment recorded successfully", data: payment });
  } catch (err) {
    console.error("[RECORD_PAYMENT_ERROR]", err.message);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Custom error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
