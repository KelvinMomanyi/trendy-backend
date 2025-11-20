import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Configure CORS to allow all origins (for development)
// In production, specify your frontend domain
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));

// Initialize Google Vision client
let visionClient = null;

try {
  // Option 1: Use service account key file (recommended for production)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    visionClient = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    console.log('✅ Google Vision API initialized with service account credentials');
  }
  // Option 2: Use service account JSON from environment variable (for cloud deployments)
  else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    visionClient = new ImageAnnotatorClient({
      credentials,
    });
    console.log('✅ Google Vision API initialized with service account JSON from env');
  }
  // Option 3: Use default credentials (for GCP deployments)
  else {
    visionClient = new ImageAnnotatorClient();
    console.log('✅ Google Vision API initialized with default credentials');
  }
} catch (error) {
  console.warn('⚠️  Google Vision API not initialized:', error.message);
  console.warn('   Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_JSON to enable');
}

/**
 * Helper function to map detected labels to product categories
 */
function mapLabelToCategory(label) {
  if (!label) return 'accessories';
  
  const lowerLabel = label.toLowerCase();
  
  if (lowerLabel.includes('watch') || lowerLabel.includes('timepiece')) return 'watch';
  if (lowerLabel.includes('shoe') || lowerLabel.includes('sneaker') || lowerLabel.includes('boot')) return 'shoes';
  if (lowerLabel.includes('sunglass') || lowerLabel.includes('glasses')) return 'sunglasses';
  if (lowerLabel.includes('bag') || lowerLabel.includes('handbag') || lowerLabel.includes('purse')) return 'bag';
  if (lowerLabel.includes('shirt') || lowerLabel.includes('top') || lowerLabel.includes('blouse')) return 'clothing';
  if (lowerLabel.includes('pant') || lowerLabel.includes('jean')) return 'clothing';
  if (lowerLabel.includes('dress')) return 'clothing';
  if (lowerLabel.includes('jacket') || lowerLabel.includes('coat')) return 'clothing';
  if (lowerLabel.includes('phone') || lowerLabel.includes('smartphone')) return 'electronics';
  if (lowerLabel.includes('laptop') || lowerLabel.includes('computer')) return 'electronics';
  if (lowerLabel.includes('jewelry') || lowerLabel.includes('necklace') || lowerLabel.includes('ring')) return 'accessories';
  
  return 'accessories'; // Default category
}

/**
 * Product Detection Endpoint
 * POST /api/detect-products
 * 
 * Detects products in uploaded images using Google Cloud Vision API
 */
app.post('/api/detect-products', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Check if Google Vision client is initialized
    if (!visionClient) {
      return res.status(503).json({ 
        error: 'Google Vision API is not configured. Please set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_JSON environment variable.' 
      });
    }

    // Extract base64 data
    const base64Data = image.startsWith('data:') 
      ? image.split(',')[1] 
      : image;
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Call Google Vision API for object localization
    const [objectResult] = await visionClient.objectLocalization({
      image: { content: imageBuffer },
    });

    // Call Google Vision API for label detection (as fallback)
    const [labelResult] = await visionClient.labelDetection({
      image: { content: imageBuffer },
      maxResults: 10,
    });

    const detections = [];
    
    // Process object localizations (more accurate, includes bounding boxes)
    if (objectResult.localizedObjectAnnotations && objectResult.localizedObjectAnnotations.length > 0) {
      objectResult.localizedObjectAnnotations.forEach((obj, index) => {
        const boundingPoly = obj.boundingPoly?.normalizedVertices || [];
        
        if (boundingPoly.length >= 2) {
          const x = boundingPoly[0].x * 100;
          const y = boundingPoly[0].y * 100;
          const width = (boundingPoly[1]?.x - boundingPoly[0].x) * 100 || 20;
          const height = (boundingPoly[2]?.y - boundingPoly[0].y) * 100 || width;

          detections.push({
            id: `gv-obj-${index}`,
            name: obj.name || 'Product',
            category: mapLabelToCategory(obj.name),
            confidence: obj.score || 0.8,
            boundingBox: {
              x: Math.max(0, Math.min(100, x)),
              y: Math.max(0, Math.min(100, y)),
              width: Math.max(1, Math.min(100, width)),
              height: Math.max(1, Math.min(100, height)),
            },
            attributes: {},
          });
        }
      });
    }

    // Process labels as fallback (if no objects detected)
    if (detections.length === 0 && labelResult.labelAnnotations && labelResult.labelAnnotations.length > 0) {
      labelResult.labelAnnotations.forEach((label, index) => {
        if (label.score > 0.7) {
          detections.push({
            id: `gv-label-${index}`,
            name: label.description || 'Product',
            category: mapLabelToCategory(label.description),
            confidence: label.score,
            boundingBox: {
              x: 20 + (index * 10),
              y: 20 + (index * 10),
              width: 30,
              height: 30,
            },
            attributes: {},
          });
        }
      });
    }

    // Return detections
    res.json({ detections });
  } catch (error) {
    console.error('Error detecting products:', error);
    
    // Provide helpful error messages
    if (error.message?.includes('API keys are not supported')) {
      return res.status(400).json({ 
        error: 'Google Vision API requires OAuth2 authentication (service account), not API keys. Please configure GOOGLE_APPLICATION_CREDENTIALS with a service account key file.' 
      });
    }
    
    if (error.message?.includes('Permission denied') || error.message?.includes('authentication')) {
      return res.status(401).json({ 
        error: 'Authentication failed. Please check your Google Cloud service account credentials.' 
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to detect products in image' 
    });
  }
});

/**
 * Health check endpoint
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    visionApiConfigured: visionClient !== null,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Handle GET requests to detect-products (should be POST)
 */
app.get('/api/detect-products', (req, res) => {
  res.status(405).json({ 
    error: 'Method not allowed. This endpoint only accepts POST requests.',
    method: 'POST',
    endpoint: '/api/detect-products',
    body: {
      image: 'data:image/jpeg;base64,...'
    }
  });
});

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.json({ 
    message: 'Shop Mini Backend API',
    endpoints: {
      health: '/api/health',
      detectProducts: 'POST /api/detect-products',
    },
    visionApiConfigured: visionClient !== null,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Product detection: POST http://localhost:${PORT}/api/detect-products`);
});

