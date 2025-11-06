const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Enable compression for better performance
app.use(compression());

// Rate limiting
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests from this IP') => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Apply different rate limits for different endpoints
app.use('/api/', createRateLimiter(15 * 60 * 1000, 100)); // General API
app.use('/api/auth/', createRateLimiter(15 * 60 * 1000, 5)); // Auth endpoints
app.use('/api/reviews/', createRateLimiter(15 * 60 * 1000, 50)); // Review endpoints

// FIXED: CORS configuration - removed trailing spaces and simplified
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Alternative CORS configuration if the above doesn't work:
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// FIXED: Sample movie data - removed trailing spaces from URLs and poster paths
const movies = [
  {
    id: 1,
    title: "The Shawshank Redemption",
    year: 1994,
    rating: 9.3,
    genre: "Drama",
    director: "Frank Darabont",
    duration: 142,
    poster: "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
    description: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency."
  },
  {
    id: 2,
    title: "The Godfather",
    year: 1972,
    rating: 9.2,
    genre: "Crime",
    director: "Francis Ford Coppola",
    duration: 175,
    poster: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    description: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son."
  },
  {
    id: 3,
    title: "The Dark Knight",
    year: 2008,
    rating: 9.0,
    genre: "Action",
    director: "Christopher Nolan",
    duration: 152,
    poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice."
  },
  {
    id: 4,
    title: "Pulp Fiction",
    year: 1994,
    rating: 8.9,
    genre: "Crime",
    director: "Quentin Tarantino",
    duration: 154,
    poster: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    description: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption."
  },
  {
    id: 5,
    title: "Forrest Gump",
    year: 1994,
    rating: 8.8,
    genre: "Drama",
    director: "Robert Zemeckis",
    duration: 142,
    poster: "https://image.tmdb.org/t/p/w500/saHP97rTPS5eLwERh_sVru84Gbp.jpg",
    description: "The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man with an IQ of 75."
  }
];

// Sample reviews data
let reviews = [
  {
    id: 1,
    movieId: 1,
    userId: "user123",
    userName: "John Doe",
    rating: 5,
    text: "Amazing movie! A true masterpiece that stands the test of time. The story of hope and friendship is incredibly moving.",
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 2,
    movieId: 1,
    userId: "user456",
    userName: "Jane Smith",
    rating: 4,
    text: "Great story and excellent acting. Morgan Freeman's narration is perfect. A bit long but worth every minute.",
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: 3,
    movieId: 2,
    userId: "user789",
    userName: "Mike Johnson",
    rating: 5,
    text: "The best crime drama ever made. Marlon Brando's performance is legendary. Every scene is perfectly crafted.",
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  }
];

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Movie Review Platform API is running!',
    version: '1.0.0'
  });
});

// Get all movies with pagination and search
app.get('/api/movies', (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', genre = '', sortBy = 'title' } = req.query;
    
    let filteredMovies = movies;
    
    // Search functionality
    if (search) {
      filteredMovies = filteredMovies.filter(movie =>
        movie.title.toLowerCase().includes(search.toLowerCase()) ||
        movie.director.toLowerCase().includes(search.toLowerCase()) ||
        movie.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Genre filter
    if (genre) {
      filteredMovies = filteredMovies.filter(movie =>
        movie.genre.toLowerCase() === genre.toLowerCase()
      );
    }
    
    // Sorting
    filteredMovies.sort((a, b) => {
      switch (sortBy) {
        case 'year':
          return b.year - a.year;
        case 'rating':
          return b.rating - a.rating;
        case 'title':
        default:
          return a.title.localeCompare(b.title);
      }
    });
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedMovies = filteredMovies.slice(startIndex, endIndex);
    
    res.json({
      movies: paginatedMovies,
      currentPage: parseInt(page),
      totalPages: Math.ceil(filteredMovies.length / limit),
      totalMovies: filteredMovies.length,
      hasNextPage: endIndex < filteredMovies.length,
      hasPrevPage: startIndex > 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

// Get a specific movie with its reviews
app.get('/api/movies/:id', (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    const movie = movies.find(m => m.id === movieId);
    
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    
    // Get reviews for this movie
    const movieReviews = reviews.filter(r => r.movieId === movieId);
    
    res.json({
      ...movie,
      reviews: movieReviews,
      reviewCount: movieReviews.length,
      averageRating: movieReviews.length > 0 
        ? (movieReviews.reduce((sum, r) => sum + r.rating, 0) / movieReviews.length).toFixed(1)
        : 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch movie details' });
  }
});

// Get reviews for a movie with pagination
app.get('/api/movies/:id/reviews', (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    const { page = 1, limit = 10 } = req.query;
    
    const movieReviews = reviews.filter(r => r.movieId === movieId);
    
    // Sort reviews by newest first
    movieReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedReviews = movieReviews.slice(startIndex, endIndex);
    
    res.json({
      reviews: paginatedReviews,
      currentPage: parseInt(page),
      totalPages: Math.ceil(movieReviews.length / limit),
      totalReviews: movieReviews.length,
      hasNextPage: endIndex < movieReviews.length,
      hasPrevPage: startIndex > 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Create a new review
app.post('/api/reviews', async (req, res) => {
  try {
    const { movieId, userId, userName, rating, text } = req.body;
    
    // Validate input
    if (!movieId || !userId || !userName || !rating || !text) {
      return res.status(400).json({ 
        error: 'Movie ID, user ID, user name, rating, and text are required' 
      });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 5' 
      });
    }
    
    // Check if movie exists
    const movieExists = movies.some(m => m.id === parseInt(movieId));
    if (!movieExists) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    
    // Check if user already reviewed this movie
    const existingReview = reviews.find(r => r.movieId === parseInt(movieId) && r.userId === userId);
    if (existingReview) {
      return res.status(400).json({ 
        error: 'You have already reviewed this movie' 
      });
    }
    
    // Create new review
    const newReview = {
      id: reviews.length > 0 ? Math.max(...reviews.map(r => r.id)) + 1 : 1,
      movieId: parseInt(movieId),
      userId,
      userName,
      rating: parseInt(rating),
      text: text.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    reviews.push(newReview);
    
    res.status(201).json(newReview);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Update a review
app.put('/api/reviews/:id', async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    const { rating, text, userId } = req.body;
    
    // Find the review
    const reviewIndex = reviews.findIndex(r => r.id === reviewId);
    
    if (reviewIndex === -1) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    // Verify user owns this review
    if (reviews[reviewIndex].userId !== userId) {
      return res.status(403).json({ error: 'You can only update your own reviews' });
    }
    
    // Validate input
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 5' 
      });
    }
    
    // Update the review
    if (rating) reviews[reviewIndex].rating = parseInt(rating);
    if (text) reviews[reviewIndex].text = text.trim();
    reviews[reviewIndex].updatedAt = new Date();
    
    res.json(reviews[reviewIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete a review
app.delete('/api/reviews/:id', async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    const { userId } = req.body;
    
    const reviewIndex = reviews.findIndex(r => r.id === reviewId);
    
    if (reviewIndex === -1) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    // Verify user owns this review
    if (reviews[reviewIndex].userId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own reviews' });
    }
    
    // Remove the review
    reviews.splice(reviewIndex, 1);
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// Search movies with advanced filtering
app.get('/api/search', (req, res) => {
  try {
    const { q, genre, year, rating, page = 1, limit = 10 } = req.query;
    
    if (!q && !genre && !year && !rating) {
      return res.status(400).json({ 
        error: 'At least one search parameter is required (q, genre, year, or rating)' 
      });
    }
    
    let searchResults = movies;
    
    // Text search
    if (q) {
      const searchTerm = q.toLowerCase();
      searchResults = searchResults.filter(movie =>
        movie.title.toLowerCase().includes(searchTerm) ||
        movie.director.toLowerCase().includes(searchTerm) ||
        movie.description.toLowerCase().includes(searchTerm) ||
        movie.genre.toLowerCase().includes(searchTerm)
      );
    }
    
    // Genre filter
    if (genre) {
      searchResults = searchResults.filter(movie =>
        movie.genre.toLowerCase() === genre.toLowerCase()
      );
    }
    
    // Year filter
    if (year) {
      searchResults = searchResults.filter(movie =>
        movie.year === parseInt(year)
      );
    }
    
    // Rating filter
    if (rating) {
      const minRating = parseFloat(rating);
      searchResults = searchResults.filter(movie =>
        movie.rating >= minRating
      );
    }
    
    // Sort by relevance (rating)
    searchResults.sort((a, b) => b.rating - a.rating);
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedResults = searchResults.slice(startIndex, endIndex);
    
    res.json({
      movies: paginatedResults,
      currentPage: parseInt(page),
      totalPages: Math.ceil(searchResults.length / limit),
      totalResults: searchResults.length,
      searchQuery: q,
      filters: { genre, year, rating }
    });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get movie statistics
app.get('/api/stats', (req, res) => {
  try {
    const totalMovies = movies.length;
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
      : 0;
    
    const genreStats = movies.reduce((acc, movie) => {
      acc[movie.genre] = (acc[movie.genre] || 0) + 1;
      return acc;
    }, {});
    
    const yearStats = movies.reduce((acc, movie) => {
      acc[movie.year] = (acc[movie.year] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      totalMovies,
      totalReviews,
      averageRating,
      genreStats,
      yearStats
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Error handling middleware (Updated for Express 5)
app.use((err, req, res, next) => {
  console.error(`${new Date().toISOString()} - Error:`, err.stack);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.message
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      details: 'Invalid or missing authentication token'
    });
  }
  
  res.status(err.status || 500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// FIXED: 404 handler for Express 5 - use proper wildcard syntax
app.get('/*splat', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`);
});

module.exports = app;