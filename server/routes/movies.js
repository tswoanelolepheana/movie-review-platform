const express = require('express');
const router = express.Router();
const axios = require('axios');

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

// Get popular movies
router.get('/popular', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const response = await axios.get(`${BASE_URL}/movie/popular`, {
      params: {
        api_key: API_KEY,
        page: parseInt(page),
      },
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    res.status(500).json({ error: 'Failed to fetch popular movies' });
  }
});

// Search movies
router.get('/search', async (req, res) => {
  try {
    const { query, page = 1 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const response = await axios.get(`${BASE_URL}/search/movie`, {
      params: {
        api_key: API_KEY,
        query,
        page: parseInt(page),
        include_adult: false,
      },
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error searching movies:', error);
    res.status(500).json({ error: 'Failed to search movies' });
  }
});

// Get movie details
router.get('/:movieId', async (req, res) => {
  try {
    const { movieId } = req.params;
    const response = await axios.get(`${BASE_URL}/movie/${movieId}`, {
      params: {
        api_key: API_KEY,
        append_to_response: 'credits,videos',
      },
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching movie details:', error);
    if (error.response?.status === 404) {
      res.status(404).json({ error: 'Movie not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch movie details' });
    }
  }
});

// Get movie recommendations
router.get('/:movieId/recommendations', async (req, res) => {
  try {
    const { movieId } = req.params;
    const { page = 1 } = req.query;
    
    const response = await axios.get(`${BASE_URL}/movie/${movieId}/recommendations`, {
      params: {
        api_key: API_KEY,
        page: parseInt(page),
      },
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching movie recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch movie recommendations' });
  }
});

module.exports = router;