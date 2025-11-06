// middleware/validation.middleware.js
const validateReview = (req, res, next) => {
  const { movieId, rating, text } = req.body;
  
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
  
  next();
};

module.exports = { validateReview };