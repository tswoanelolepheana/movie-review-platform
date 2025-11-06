const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all reviews for a movie
router.get('/movie/:movieId', async (req, res) => {
  try {
    const { movieId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const reviewsQuery = db.collection('reviews')
      .where('movieId', '==', movieId)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));
    
    const snapshot = await reviewsQuery.get();
    
    const reviews = [];
    snapshot.forEach(doc => {
      const reviewData = doc.data();
      reviews.push({
        id: doc.id,
        ...reviewData,
        createdAt: reviewData.createdAt?.toDate(),
        updatedAt: reviewData.updatedAt?.toDate()
      });
    });
    
    // Get user details for each review
    const reviewsWithUserDetails = await Promise.all(
      reviews.map(async (review) => {
        try {
          const userRecord = await admin.auth().getUser(review.userId);
          return {
            ...review,
            userName: userRecord.displayName || userRecord.email,
            userPhoto: userRecord.photoURL
          };
        } catch (error) {
          // If user not found, return review without user details
          return review;
        }
      })
    );
    
    res.json(reviewsWithUserDetails);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get a specific review
router.get('/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const reviewDoc = await db.collection('reviews').doc(reviewId).get();
    
    if (!reviewDoc.exists) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    const reviewData = reviewDoc.data();
    
    // Get user details
    let userDetails = null;
    try {
      const userRecord = await admin.auth().getUser(reviewData.userId);
      userDetails = {
        userName: userRecord.displayName || userRecord.email,
        userPhoto: userRecord.photoURL
      };
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
    
    res.json({
      id: reviewDoc.id,
      ...reviewData,
      ...userDetails,
      createdAt: reviewData.createdAt?.toDate(),
      updatedAt: reviewData.updatedAt?.toDate()
    });
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

// Create a new review
router.post('/', verifyToken, async (req, res) => {
  try {
    const { movieId, rating, text } = req.body;
    
    // Validate input
    if (!movieId || !rating || !text) {
      return res.status(400).json({ 
        error: 'Movie ID, rating, and text are required' 
      });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 5' 
      });
    }
    
    // Check if user already reviewed this movie
    const existingReviewQuery = await db.collection('reviews')
      .where('movieId', '==', movieId)
      .where('userId', '==', req.user.uid)
      .get();
    
    if (!existingReviewQuery.empty) {
      return res.status(400).json({ 
        error: 'You have already reviewed this movie' 
      });
    }
    
    const reviewData = {
      movieId,
      userId: req.user.uid,
      rating,
      text: text.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const reviewRef = await db.collection('reviews').add(reviewData);
    
    res.status(201).json({
      id: reviewRef.id,
      ...reviewData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Update a review
router.put('/:reviewId', verifyToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, text } = req.body;
    
    // Validate input
    if (!rating || !text) {
      return res.status(400).json({ 
        error: 'Rating and text are required' 
      });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 5' 
      });
    }
    
    const reviewRef = db.collection('reviews').doc(reviewId);
    const reviewDoc = await reviewRef.get();
    
    if (!reviewDoc.exists) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    const reviewData = reviewDoc.data();
    
    // Check if user owns this review
    if (reviewData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'You can only update your own reviews' });
    }
    
    await reviewRef.update({
      rating,
      text: text.trim(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ message: 'Review updated successfully' });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete a review
router.delete('/:reviewId', verifyToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    
    const reviewRef = db.collection('reviews').doc(reviewId);
    const reviewDoc = await reviewRef.get();
    
    if (!reviewDoc.exists) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    const reviewData = reviewDoc.data();
    
    // Check if user owns this review
    if (reviewData.userId !== req.user.uid) {
      return res.status(403).json({ error: 'You can only delete your own reviews' });
    }
    
    await reviewRef.delete();
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// Get user's reviews
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const reviewsQuery = db.collection('reviews')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));
    
    const snapshot = await reviewsQuery.get();
    
    const reviews = [];
    snapshot.forEach(doc => {
      const reviewData = doc.data();
      reviews.push({
        id: doc.id,
        ...reviewData,
        createdAt: reviewData.createdAt?.toDate(),
        updatedAt: reviewData.updatedAt?.toDate()
      });
    });
    
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ error: 'Failed to fetch user reviews' });
  }
});

module.exports = router;