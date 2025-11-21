import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import fetch from 'node-fetch';
import sharp from 'sharp';

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
let googleCredentials = null;

// Debug: Check which credential environment variables are set
console.log('🔍 Checking for Google Cloud credentials...');
console.log('   GOOGLE_CLOUD_CREDENTIALS:', process.env.GOOGLE_CLOUD_CREDENTIALS ? 'SET (length: ' + process.env.GOOGLE_CLOUD_CREDENTIALS.length + ')' : 'NOT SET');
console.log('   GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NOT SET');
console.log('   GOOGLE_SERVICE_ACCOUNT_JSON:', process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? 'SET' : 'NOT SET');

try {
  // Parse Google Cloud credentials from environment variable (Railway deployment)
  if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
    try {
      console.log('📝 Parsing GOOGLE_CLOUD_CREDENTIALS...');
      googleCredentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
      
      // Validate required fields
      if (!googleCredentials.type || !googleCredentials.project_id || !googleCredentials.private_key || !googleCredentials.client_email) {
        throw new Error('Missing required fields in credentials. Required: type, project_id, private_key, client_email');
      }
      
      // Fix private key if it has escaped newlines (common in environment variables)
      if (googleCredentials.private_key && typeof googleCredentials.private_key === 'string') {
        googleCredentials.private_key = googleCredentials.private_key.replace(/\\n/g, '\n');
      }
      
      console.log('✅ Credentials parsed successfully');
      console.log(`   Type: ${googleCredentials.type}`);
      console.log(`   Project ID: ${googleCredentials.project_id}`);
      console.log(`   Service Account: ${googleCredentials.client_email}`);
      console.log(`   Private Key Length: ${googleCredentials.private_key?.length || 0}`);
      
      visionClient = new ImageAnnotatorClient({
        credentials: googleCredentials,
      });
      console.log('✅ Google Vision API initialized with Railway credentials');
    } catch (parseError) {
      console.error('❌ Failed to parse GOOGLE_CLOUD_CREDENTIALS:', parseError.message);
      console.error('   Error stack:', parseError.stack);
      throw parseError;
    }
  }
  // Option 1: Use service account key file (for local development)
  else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    visionClient = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    console.log('✅ Google Vision API initialized with service account file');
  }
  // Option 2: Use service account JSON from environment variable (alternative name)
  else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    googleCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    visionClient = new ImageAnnotatorClient({
      credentials: googleCredentials,
    });
    console.log('✅ Google Vision API initialized with service account JSON from env');
  }
  // Option 3: Use default credentials (for GCP deployments)
  else {
    visionClient = new ImageAnnotatorClient();
    console.log('✅ Google Vision API initialized with default credentials');
  }
} catch (error) {
  console.error('❌ Failed to initialize Google Vision API:', error.message);
  console.error('   Error details:', {
    name: error.name,
    message: error.message,
    stack: error.stack
  });
  console.warn('   Set GOOGLE_CLOUD_CREDENTIALS (Railway), GOOGLE_APPLICATION_CREDENTIALS, or GOOGLE_SERVICE_ACCOUNT_JSON to enable');
  console.warn('   Current env vars:', {
    GOOGLE_CLOUD_CREDENTIALS: process.env.GOOGLE_CLOUD_CREDENTIALS ? 'SET' : 'NOT SET',
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NOT SET',
    GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? 'SET' : 'NOT SET'
  });
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
 * Hugging Face API - Fallback detection service
 * Uses DETR model for object detection (80 COCO classes)
 */
async function detectProductsWithHuggingFace(imageBuffer) {
  console.group('🤗 Hugging Face API Call');
  console.log('Model: facebook/detr-resnet-50');
  console.log('Image buffer size:', imageBuffer.length, 'bytes');
  
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  console.log('API Key present:', !!apiKey);
  
  if (!apiKey) {
    console.error('❌ HUGGINGFACE_API_KEY not configured');
    console.groupEnd();
    throw new Error('HUGGINGFACE_API_KEY not configured');
  }

  try {
    // Use DETR model for object detection
    const model = 'facebook/detr-resnet-50';
    
    // Try router endpoint first, fallback to legacy endpoint if 404
    let apiUrl = `https://router.huggingface.co/models/${model}`;
    
    console.log('📡 Sending request to Hugging Face...');
    console.log('   URL:', apiUrl);
    console.log('   Model:', model);
    
    let response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/octet-stream',
      },
      body: imageBuffer,
    });

    console.log('📥 Response status:', response.status, response.statusText);

    // If router endpoint returns 404, try legacy endpoint
    if (response.status === 404) {
      console.log('   ⚠️  Router endpoint returned 404, trying legacy endpoint...');
      apiUrl = `https://api-inference.huggingface.co/models/${model}`;
      console.log('   Trying legacy URL:', apiUrl);
      
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/octet-stream',
        },
        body: imageBuffer,
      });
      
      console.log('📥 Legacy endpoint response status:', response.status, response.statusText);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Hugging Face API error response:', errorText);
      console.groupEnd();
      throw new Error(`Hugging Face API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('📊 Hugging Face raw response:');
    console.log('   Response type:', Array.isArray(data) ? 'Array' : typeof data);
    console.log('   Response length:', Array.isArray(data) ? data.length : 'N/A');
    if (Array.isArray(data) && data.length > 0) {
      console.log('   First item:', JSON.stringify(data[0], null, 2));
      console.log('   Total items:', data.length);
    } else {
      console.log('   Full response:', JSON.stringify(data, null, 2));
    }
    
    // Handle model loading (first request)
    if (data.error && data.error.includes('loading')) {
      console.log('⏳ Hugging Face model is loading, waiting 10 seconds...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      // Retry once
      return detectProductsWithHuggingFace(imageBuffer);
    }

    // Transform Hugging Face response to our format
    // DETR returns: [{label, score, box: {xmin, ymin, xmax, ymax}}]
    if (Array.isArray(data) && data.length > 0) {
      // Assume standard image dimensions for normalization
      // In production, you might want to get actual image dimensions
      const assumedImageWidth = 640;
      const assumedImageHeight = 480;
      
      console.log(`📊 Processing ${data.length} raw detections from Hugging Face...`);
      
      const filtered = data.filter((item) => {
        const score = item.score || 0;
        if (score > 0.3) { // Lower threshold to 0.3 for more detections
          console.log(`   ✓ ${item.label}: ${(score * 100).toFixed(1)}%`);
          return true;
        }
        return false;
      });
      
      console.log(`   Filtered to ${filtered.length} detections (threshold: 0.3)`);
      
      const detections = filtered.map((item, index) => {
          const box = item.box || {};
          const xmin = box.xmin ?? 0;
          const ymin = box.ymin ?? 0;
          const xmax = box.xmax ?? assumedImageWidth;
          const ymax = box.ymax ?? assumedImageHeight;
          
          // Check if coordinates are normalized (0-1) or in pixels
          const isNormalized = xmax <= 1 && ymax <= 1;
          
          const x = isNormalized ? xmin * 100 : (xmin / assumedImageWidth) * 100;
          const y = isNormalized ? ymin * 100 : (ymin / assumedImageHeight) * 100;
          const width = isNormalized 
            ? (xmax - xmin) * 100 
            : ((xmax - xmin) / assumedImageWidth) * 100;
          const height = isNormalized 
            ? (ymax - ymin) * 100 
            : ((ymax - ymin) / assumedImageHeight) * 100;
          
          return {
            id: `hf-${index}`,
            name: item.label || 'Product',
            category: mapLabelToCategory(item.label || 'object'),
            confidence: item.score || 0.8,
            boundingBox: {
              x: Math.max(0, Math.min(100, x)),
              y: Math.max(0, Math.min(100, y)),
              width: Math.max(1, Math.min(100, width)),
              height: Math.max(1, Math.min(100, height)),
            },
            attributes: {
              provider: 'huggingface',
              model: 'detr-resnet-50',
            },
          };
        });
    }

    console.log(`✅ Processed ${detections.length} detections from Hugging Face`);
    if (detections.length > 0) {
      console.log('   Detection details:');
      detections.forEach((det, idx) => {
        console.log(`      ${idx + 1}. ${det.name} - ${det.category} (${(det.confidence * 100).toFixed(1)}%)`);
        console.log(`         Bounding box: x=${det.boundingBox.x.toFixed(1)}%, y=${det.boundingBox.y.toFixed(1)}%, w=${det.boundingBox.width.toFixed(1)}%, h=${det.boundingBox.height.toFixed(1)}%`);
      });
    }
    console.groupEnd();
    return detections;
  } catch (error) {
    console.error('❌ Hugging Face detection error:', error.message);
    console.error('   Error stack:', error.stack);
    console.groupEnd();
    throw error;
  }
}

// ============================================
// STAGE 1: OBJECT DETECTION (OWLv2)
// ============================================

/**
 * Detect products using OWLv2 (Zero-shot object detection)
 * Best for e-commerce: Can detect specific product types with text prompts
 * 
 * NOTE: OWLv2 models may not be available via Hugging Face Inference API.
 * This function will try multiple model variants and formats.
 * If all fail, the caller should fall back to DETR.
 */
async function detectProductsWithOWL(imageBuffer, textPrompts = ["shoe", "bag", "watch", "clothing", "sneaker", "handbag", "backpack", "sunglasses"]) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    throw new Error('HUGGINGFACE_API_KEY not configured');
  }

  console.log('🦉 Attempting OWLv2 detection with prompts:', textPrompts);
  
  // Try different OWLv2 model variants
  const models = [
    'google/owlvit-base-patch32',
    'google/owlv2-base-patch16-ensemble',
    'google/owlvit-base-patch16'
  ];
  
  for (const model of models) {
    try {
      console.log(`   Trying model: ${model}`);
      
      // Try router endpoint (new)
      let apiUrl = `https://router.huggingface.co/models/${model}`;
      
      // OWLv2/OWLViT might need image as raw bytes with text prompts
      // Try format 1: Image as raw bytes with JSON parameters
      let response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {
            image: imageBuffer.toString('base64'),
            text: textPrompts
          }
        }),
      });

      // If that fails, try format 2: Multipart form data
      if (!response.ok && response.status === 404) {
        console.log(`   Model ${model} not available via router, trying alternative format...`);
        
        // Try legacy api-inference endpoint
        apiUrl = `https://api-inference.huggingface.co/models/${model}`;
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: {
              image: imageBuffer.toString('base64'),
              text: textPrompts
            }
          }),
        });
      }

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`   ⚠️  Model ${model} not available (404)`);
          continue; // Try next model
        }
        const errorText = await response.text();
        throw new Error(`OWLv2 API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      // Handle model loading
      if (data.error && data.error.includes('loading')) {
        console.log(`   ⏳ Model ${model} is loading, waiting 10 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        // Retry once
        return detectProductsWithOWL(imageBuffer, textPrompts);
      }

      // Handle error responses
      if (data.error) {
        console.log(`   ⚠️  Model ${model} returned error: ${data.error}`);
        continue; // Try next model
      }

      console.log(`   ✅ Model ${model} responded successfully`);
      console.log('   OWLv2 response format:', Array.isArray(data) ? 'Array' : typeof data);
      
      // OWLv2 returns detections in format: [{label, score, box: {xmin, ymin, xmax, ymax}}]
      if (Array.isArray(data) && data.length > 0) {
        const detections = data.map((item, idx) => ({
          id: `owl-${idx}`,
          label: item.label || item.class || 'Product',
          score: item.score || item.confidence || 0.5,
          box: item.box || item.bbox || {
            xmin: 0, ymin: 0, xmax: 1, ymax: 1
          }
        }));
        
        console.log(`   ✅ OWLv2 detected ${detections.length} products`);
        return detections;
      }
      
      // If response is not in expected format, try next model
      console.log(`   ⚠️  Model ${model} returned unexpected format`);
      continue;
      
    } catch (error) {
      console.log(`   ⚠️  Model ${model} failed: ${error.message}`);
      // Continue to next model
      continue;
    }
  }
  
  // If all models failed, throw error to trigger fallback
  throw new Error('All OWLv2 model variants failed. OWLv2 may not be available via Inference API. Falling back to DETR.');
}

// ============================================
// STAGE 2: VISUAL SEARCH / EMBEDDING
// ============================================

/**
 * Generate embeddings using DINOv2
 * BEST for finding similar products in catalog
 */
async function generateEmbeddingDINO(imageBuffer) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const model = 'facebook/dinov2-base';
  
  if (!apiKey) {
    throw new Error('HUGGINGFACE_API_KEY not configured');
  }

  console.log('🧬 Generating DINOv2 embedding');
  
  try {
    // Try router endpoint first, fallback to legacy endpoint if 404
    let apiUrl = `https://router.huggingface.co/models/${model}`;
    
    let response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'image/jpeg',
      },
      body: imageBuffer,
    });

    // If router endpoint returns 404, try legacy endpoint
    if (response.status === 404) {
      console.log('   ⚠️  Router endpoint returned 404, trying legacy endpoint...');
      apiUrl = `https://api-inference.huggingface.co/models/${model}`;
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'image/jpeg',
        },
        body: imageBuffer,
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DINOv2 API error: ${response.status} ${errorText}`);
    }

    const embedding = await response.json();
    
    // Handle model loading
    if (embedding.error && embedding.error.includes('loading')) {
      console.log('⏳ DINOv2 model is loading, waiting 10 seconds...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      return generateEmbeddingDINO(imageBuffer);
    }

    // Ensure embedding is an array
    if (!Array.isArray(embedding)) {
      throw new Error('DINOv2 returned unexpected format');
    }

    return embedding; // Returns a vector (e.g., 768 dimensions)
  } catch (error) {
    console.error('❌ DINOv2 embedding error:', error.message);
    throw error;
  }
}

/**
 * Generate embeddings using CLIP
 * BEST for text+image matching ("red nike shoe")
 */
async function generateEmbeddingCLIP(imageBuffer) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  const model = 'openai/clip-vit-large-patch14';
  
  if (!apiKey) {
    throw new Error('HUGGINGFACE_API_KEY not configured');
  }

  console.log('🖼️ Generating CLIP embedding');
  
  try {
    // Try router endpoint first, fallback to legacy endpoint if 404
    let apiUrl = `https://router.huggingface.co/models/${model}`;
    
    let response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'image/jpeg',
      },
      body: imageBuffer,
    });

    // If router endpoint returns 404, try legacy endpoint
    if (response.status === 404) {
      console.log('   ⚠️  Router endpoint returned 404, trying legacy endpoint...');
      apiUrl = `https://api-inference.huggingface.co/models/${model}`;
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'image/jpeg',
        },
        body: imageBuffer,
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CLIP API error: ${response.status} ${errorText}`);
    }

    const embedding = await response.json();
    
    // Handle model loading
    if (embedding.error && embedding.error.includes('loading')) {
      console.log('⏳ CLIP model is loading, waiting 10 seconds...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      return generateEmbeddingCLIP(imageBuffer);
    }

    // Ensure embedding is an array
    if (!Array.isArray(embedding)) {
      throw new Error('CLIP returned unexpected format');
    }

    return embedding;
  } catch (error) {
    console.error('❌ CLIP embedding error:', error.message);
    throw error;
  }
}

// ============================================
// STAGE 3: CATALOG MATCHING
// ============================================

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB)) {
    throw new Error('Vectors must be arrays');
  }
  
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Match detected product with catalog
 */
async function matchWithCatalog(productEmbedding, catalogEmbeddings, topK = 5) {
  console.log('🔗 Matching with catalog...');
  
  if (!Array.isArray(catalogEmbeddings) || catalogEmbeddings.length === 0) {
    console.log('⚠️  No catalog embeddings available');
    return [];
  }
  
  // Calculate similarity scores
  const similarities = catalogEmbeddings.map((item) => {
    try {
      return {
        productId: item.id,
        productName: item.name,
        score: cosineSimilarity(productEmbedding, item.embedding),
        price: item.price,
        imageUrl: item.imageUrl,
        url: item.url,
        category: item.category,
        ...item
      };
    } catch (error) {
      console.warn(`⚠️  Error calculating similarity for ${item.id}:`, error.message);
      return null;
    }
  }).filter(item => item !== null);
  
  // Sort by similarity (highest first)
  similarities.sort((a, b) => b.score - a.score);
  
  // Return top K matches
  return similarities.slice(0, topK);
}

// ============================================
// IMAGE PROCESSING HELPERS
// ============================================

/**
 * Helper: Crop image based on bounding box
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {Object} box - Bounding box {xmin, ymin, xmax, ymax} (normalized 0-1 or pixels)
 * @returns {Buffer} - Cropped image buffer
 */
async function cropImage(imageBuffer, box) {
  try {
    if (!box || Object.keys(box).length === 0) {
      return imageBuffer; // Return original if no box provided
    }

    // Get image metadata to determine actual dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    if (!imageWidth || !imageHeight) {
      console.warn('⚠️  Could not determine image dimensions, returning original');
      return imageBuffer;
    }

    // Determine if coordinates are normalized (0-1) or in pixels
    const isNormalized = (box.xmax || box.xmax === 0) && box.xmax <= 1 && 
                         (box.ymax || box.ymax === 0) && box.ymax <= 1;

    let left, top, width, height;

    if (isNormalized) {
      // Normalized coordinates (0-1)
      left = Math.max(0, Math.floor((box.xmin || 0) * imageWidth));
      top = Math.max(0, Math.floor((box.ymin || 0) * imageHeight));
      const right = Math.min(imageWidth, Math.floor((box.xmax || 1) * imageWidth));
      const bottom = Math.min(imageHeight, Math.floor((box.ymax || 1) * imageHeight));
      width = right - left;
      height = bottom - top;
    } else {
      // Pixel coordinates
      left = Math.max(0, Math.floor(box.xmin || 0));
      top = Math.max(0, Math.floor(box.ymin || 0));
      const right = Math.min(imageWidth, Math.floor(box.xmax || imageWidth));
      const bottom = Math.min(imageHeight, Math.floor(box.ymax || imageHeight));
      width = right - left;
      height = bottom - top;
    }

    // Ensure valid dimensions
    if (width <= 0 || height <= 0) {
      console.warn('⚠️  Invalid bounding box dimensions, returning original');
      return imageBuffer;
    }

    // Crop the image
    const cropped = await sharp(imageBuffer)
      .extract({ left, top, width, height })
      .toBuffer();

    return cropped;
  } catch (error) {
    console.error('❌ Error cropping image:', error.message);
    return imageBuffer; // Return original on error
  }
}

// ============================================
// CATALOG MANAGEMENT
// ============================================

// In-memory storage for catalog embeddings (replace with database in production)
let catalogEmbeddings = [];

/**
 * Get catalog embeddings from storage
 * In production, replace with database query
 */
async function getCatalogEmbeddings() {
  // TODO: Replace with database query
  // return await db.query('SELECT * FROM product_embeddings');
  return catalogEmbeddings;
}

/**
 * Save catalog embeddings to storage
 * In production, replace with database insert
 */
async function saveCatalogEmbeddings(embeddings) {
  // TODO: Replace with database insert
  // await db.query('INSERT INTO product_embeddings ...');
  catalogEmbeddings = embeddings;
  console.log(`💾 Saved ${embeddings.length} catalog embeddings to memory`);
}

/**
 * Product Detection Endpoint
 * POST /api/detect-products
 * 
 * Detects products in uploaded images using Google Cloud Vision API
 */
app.post('/api/detect-products', async (req, res) => {
  console.group('📸 Image Detection Request Received');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request body size:', JSON.stringify(req.body).length, 'bytes');
  console.log('Image data present:', !!req.body.image);
  console.log('Image data length:', req.body.image ? req.body.image.length : 0);
  
  try {
    const { image } = req.body;
    
    if (!image) {
      console.error('❌ No image data provided');
      console.groupEnd();
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Extract base64 data
    const base64Data = image.startsWith('data:') 
      ? image.split(',')[1] 
      : image;
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    console.log('Image buffer size:', imageBuffer.length, 'bytes');
    
    let detections = [];
    let usedProvider = 'none';

    // Try Google Vision API first (if configured)
    if (visionClient) {
      try {
        console.log('\n🔍 Attempting Google Vision API detection...');
        console.log('   Client initialized:', !!visionClient);
        
        // Call Google Vision API for object localization
        console.log('   📍 Calling objectLocalization...');
        const [objectResult] = await visionClient.objectLocalization({
          image: { content: imageBuffer },
        });
        
        console.log('   📊 Object Localization Results:');
        console.log('      Objects found:', objectResult.localizedObjectAnnotations?.length || 0);
        if (objectResult.localizedObjectAnnotations && objectResult.localizedObjectAnnotations.length > 0) {
          objectResult.localizedObjectAnnotations.forEach((obj, idx) => {
            console.log(`      ${idx + 1}. ${obj.name} (confidence: ${(obj.score * 100).toFixed(1)}%)`);
          });
        }

        // Call Google Vision API for label detection (as fallback)
        console.log('   🏷️  Calling labelDetection...');
        const [labelResult] = await visionClient.labelDetection({
          image: { content: imageBuffer },
          maxResults: 10,
        });
        
        console.log('   📊 Label Detection Results:');
        console.log('      Labels found:', labelResult.labelAnnotations?.length || 0);
        if (labelResult.labelAnnotations && labelResult.labelAnnotations.length > 0) {
          labelResult.labelAnnotations.slice(0, 5).forEach((label, idx) => {
            console.log(`      ${idx + 1}. ${label.description} (${(label.score * 100).toFixed(1)}%)`);
          });
        }

        // Process object localizations (more accurate, includes bounding boxes)
        if (objectResult.localizedObjectAnnotations && objectResult.localizedObjectAnnotations.length > 0) {
          console.log('   🔄 Processing object localizations...');
          objectResult.localizedObjectAnnotations.forEach((obj, index) => {
            const boundingPoly = obj.boundingPoly?.normalizedVertices || [];
            
            if (boundingPoly.length >= 2) {
              const x = boundingPoly[0].x * 100;
              const y = boundingPoly[0].y * 100;
              const width = (boundingPoly[1]?.x - boundingPoly[0].x) * 100 || 20;
              const height = (boundingPoly[2]?.y - boundingPoly[0].y) * 100 || width;

              const detection = {
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
                attributes: {
                  provider: 'google-vision',
                },
              };
              
              console.log(`      ✓ Detection ${index + 1}:`, {
                name: detection.name,
                category: detection.category,
                confidence: `${(detection.confidence * 100).toFixed(1)}%`,
                boundingBox: detection.boundingBox,
              });
              
              detections.push(detection);
            }
          });
        }

        // Process labels as fallback (if no objects detected)
        if (detections.length === 0 && labelResult.labelAnnotations && labelResult.labelAnnotations.length > 0) {
          console.log('   🔄 Processing labels (fallback mode - no bounding boxes)...');
          labelResult.labelAnnotations.forEach((label, index) => {
            if (label.score > 0.5) { // Lower threshold from 0.7 to 0.5
              const detection = {
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
                attributes: {
                  provider: 'google-vision',
                },
              };
              
              console.log(`      ✓ Label ${index + 1}: ${label.description} (${(label.score * 100).toFixed(1)}%)`);
              detections.push(detection);
            }
          });
        }

        if (detections.length > 0) {
          usedProvider = 'google-vision';
          console.log(`\n✅ Google Vision Success:`);
          console.log(`   Total detections: ${detections.length}`);
          console.log(`   Provider: ${usedProvider}`);
        }
      } catch (visionError) {
        console.warn('⚠️  Google Vision API failed:', visionError.message);
        console.log('🔄 Falling back to Hugging Face...');
      }
    }

    // Fallback to Hugging Face if Google Vision failed or not configured
    if (detections.length === 0 && process.env.HUGGINGFACE_API_KEY) {
      try {
        console.log('\n🔍 Attempting Hugging Face detection...');
        console.log('   API Key present:', !!process.env.HUGGINGFACE_API_KEY);
        detections = await detectProductsWithHuggingFace(imageBuffer);
        usedProvider = 'huggingface';
        console.log(`\n✅ Hugging Face Success:`);
        console.log(`   Total detections: ${detections.length}`);
        console.log(`   Provider: ${usedProvider}`);
        if (detections.length > 0) {
          console.log('   Detections:');
          detections.forEach((det, idx) => {
            console.log(`      ${idx + 1}. ${det.name} (${(det.confidence * 100).toFixed(1)}%) - ${det.category}`);
          });
        }
      } catch (hfError) {
        console.error('❌ Hugging Face API also failed:', hfError.message);
        console.error('   Error details:', hfError);
        // Continue to error handling below
      }
    }

    // If still no detections and no providers available
    if (detections.length === 0) {
      if (!visionClient && !process.env.HUGGINGFACE_API_KEY) {
        return res.status(503).json({ 
          error: 'No detection services configured. Please set GOOGLE_CLOUD_CREDENTIALS or HUGGINGFACE_API_KEY environment variable.' 
        });
      }
      // Return empty detections if services are configured but found nothing
      console.log('ℹ️  No products detected in image');
      console.log('   Debug info:', {
        visionClientConfigured: visionClient !== null,
        huggingFaceConfigured: !!process.env.HUGGINGFACE_API_KEY,
        usedProvider: usedProvider
      });
    }

    // Return detections
    res.json({ 
      detections,
      provider: usedProvider,
      count: detections.length
    });
  } catch (error) {
    console.error('Error detecting products:', error);
    
    // Provide helpful error messages
    if (error.message?.includes('API keys are not supported')) {
      return res.status(400).json({ 
        error: 'Google Vision API requires OAuth2 authentication (service account), not API keys. Please configure GOOGLE_CLOUD_CREDENTIALS with a service account JSON.' 
      });
    }
    
    if (error.message?.includes('Permission denied') || error.message?.includes('authentication') || error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('Could not load the default credentials')) {
      console.error('❌ Google Vision API authentication error:', error.message);
      console.error('   Error details:', {
        code: error.code,
        message: error.message,
        hasCredentials: !!googleCredentials,
        hasEnvVar: !!process.env.GOOGLE_CLOUD_CREDENTIALS,
        serviceAccount: googleCredentials?.client_email,
        projectId: googleCredentials?.project_id,
        visionClientInitialized: visionClient !== null
      });
      
      // Check if credentials are missing
      if (!process.env.GOOGLE_CLOUD_CREDENTIALS && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        return res.status(503).json({ 
          error: 'Google Cloud credentials not configured. Please set GOOGLE_CLOUD_CREDENTIALS environment variable in Railway.',
          details: {
            message: 'No credential environment variables found',
            availableVars: Object.keys(process.env).filter(key => key.includes('GOOGLE'))
          }
        });
      }
      
      return res.status(401).json({ 
        error: 'Authentication failed. Please check your Google Cloud service account credentials.',
        details: {
          message: error.message,
          code: error.code,
          hasCredentials: !!googleCredentials,
          hasEnvVar: !!process.env.GOOGLE_CLOUD_CREDENTIALS,
          serviceAccount: googleCredentials?.client_email || 'not loaded',
          projectId: googleCredentials?.project_id || 'not loaded'
        }
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to detect products in image' 
    });
  }
});

// ============================================
// MAIN DETECT AND MATCH ENDPOINT
// ============================================

/**
 * Detect products and match with catalog
 * POST /api/detect-and-match
 * 
 * Complete workflow: Detect → Embed → Match
 */
app.post('/api/detect-and-match', async (req, res) => {
  console.group('🔍 Detect and Match Request');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    const { image, textPrompts, useCLIP } = req.body;
    
    if (!image) {
      console.error('❌ No image data provided');
      console.groupEnd();
      return res.status(400).json({ error: 'Image data required' });
    }

    // Convert base64 to buffer
    const base64Data = image.startsWith('data:') ? image.split(',')[1] : image;
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    console.log('\n📸 Starting product detection and matching...');
    console.log('Image buffer size:', imageBuffer.length, 'bytes');
    
    // STEP 1: Detect products in image
    let detections = [];
    
    if (!process.env.HUGGINGFACE_API_KEY) {
      return res.status(503).json({ 
        error: 'HUGGINGFACE_API_KEY not configured. Required for detect-and-match endpoint.' 
      });
    }
    
    // Use DETR as primary method (more reliable via Inference API)
    // OWLv2 is not consistently available via Inference API
    try {
      console.log('🔍 Using DETR for product detection...');
      detections = await detectProductsWithHuggingFace(imageBuffer);
      
      // Transform DETR format to match expected format
      detections = detections.map((det, idx) => ({
        id: det.id,
        label: det.name,
        score: det.confidence,
        box: {
          xmin: (det.boundingBox.x / 100),
          ymin: (det.boundingBox.y / 100),
          xmax: ((det.boundingBox.x + det.boundingBox.width) / 100),
          ymax: ((det.boundingBox.y + det.boundingBox.height) / 100)
        }
      }));
      
      console.log(`✅ DETR detected ${detections.length} products`);
      
      // Optional: Try OWLv2 as enhancement (non-blocking)
      if (detections.length === 0 && textPrompts) {
        console.log('   Trying OWLv2 as enhancement...');
        try {
          const owlDetections = await detectProductsWithOWL(imageBuffer, textPrompts);
          if (owlDetections.length > 0) {
            console.log(`   ✅ OWLv2 found ${owlDetections.length} additional products`);
            detections = owlDetections;
          }
        } catch (owlError) {
          console.log(`   ⚠️  OWLv2 not available: ${owlError.message}`);
          // Continue with DETR results (or empty if DETR also found nothing)
        }
      }
    } catch (detrError) {
      console.error('❌ DETR detection failed:', detrError.message);
      
      // Last resort: Try OWLv2
      if (textPrompts) {
        try {
          console.log('   Attempting OWLv2 as fallback...');
          detections = await detectProductsWithOWL(imageBuffer, textPrompts);
          console.log(`   ✅ OWLv2 detected ${detections.length} products`);
        } catch (owlError) {
          console.error('❌ Both DETR and OWLv2 failed');
          throw new Error(`Product detection failed. DETR error: ${detrError.message}. OWLv2 error: ${owlError.message}`);
        }
      } else {
        throw detrError;
      }
    }
    
    if (detections.length === 0) {
      console.log('ℹ️  No products detected');
      console.groupEnd();
      return res.json({ 
        message: 'No products detected',
        detections: [],
        matches: []
      });
    }
    
    console.log(`✅ Detected ${detections.length} products`);
    
    // STEP 2: Generate embeddings for each detected product
    const results = [];
    
    for (const detection of detections) {
      console.log(`\n🔍 Processing: ${detection.label} (confidence: ${(detection.score * 100).toFixed(1)}%)`);
      
      try {
        // Crop the detected product region
        const croppedImage = await cropImage(imageBuffer, detection.box);
        
        // Generate embedding for the cropped product image
        const embedding = useCLIP 
          ? await generateEmbeddingCLIP(croppedImage)
          : await generateEmbeddingDINO(croppedImage);
        
        // STEP 3: Match with catalog
        const catalogEmbeddings = await getCatalogEmbeddings();
        const matches = await matchWithCatalog(embedding, catalogEmbeddings, 5);
        
        results.push({
          detection: {
            label: detection.label,
            confidence: detection.score,
            boundingBox: detection.box
          },
          matches: matches.map(match => ({
            productId: match.productId,
            name: match.productName,
            similarity: match.score,
            price: match.price,
            imageUrl: match.imageUrl,
            url: match.url,
            category: match.category
          }))
        });
        
        console.log(`   ✓ Found ${matches.length} matches`);
      } catch (error) {
        console.error(`   ❌ Error processing ${detection.label}:`, error.message);
        // Continue with other detections
        results.push({
          detection: {
            label: detection.label,
            confidence: detection.score,
            boundingBox: detection.box
          },
          matches: [],
          error: error.message
        });
      }
    }
    
    console.log(`\n✅ Processing complete! Found matches for ${results.length} products`);
    console.groupEnd();
    
    res.json({
      success: true,
      detections: results.length,
      results
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.groupEnd();
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CATALOG EMBEDDING MANAGEMENT
// ============================================

/**
 * Pre-compute embeddings for product catalog
 * POST /api/catalog/compute-embeddings
 * 
 * Run this once when you add new products to your catalog
 */
app.post('/api/catalog/compute-embeddings', async (req, res) => {
  console.group('📦 Compute Catalog Embeddings');
  
  try {
    const { products, useCLIP } = req.body; // Array of {id, name, imageUrl, price, url, category}
    
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Products array is required' });
    }
    
    if (!process.env.HUGGINGFACE_API_KEY) {
      return res.status(503).json({ 
        error: 'HUGGINGFACE_API_KEY not configured' 
      });
    }
    
    console.log(`📦 Computing embeddings for ${products.length} products...`);
    console.log(`   Using model: ${useCLIP ? 'CLIP' : 'DINOv2'}`);
    
    const embeddings = [];
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      if (!product.id || !product.imageUrl) {
        console.warn(`⚠️  Skipping product ${i + 1}: missing id or imageUrl`);
        continue;
      }
      
      try {
        console.log(`   [${i + 1}/${products.length}] Processing: ${product.name || product.id}`);
        
        // Fetch product image
        const imageResponse = await fetch(product.imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }
        
        const imageBuffer = await imageResponse.buffer();
        
        // Generate embedding
        const embedding = useCLIP 
          ? await generateEmbeddingCLIP(imageBuffer)
          : await generateEmbeddingDINO(imageBuffer);
        
        embeddings.push({
          id: product.id,
          name: product.name || 'Unknown Product',
          embedding: embedding,
          imageUrl: product.imageUrl,
          price: product.price,
          url: product.url,
          category: product.category
        });
        
        console.log(`      ✓ ${product.name || product.id}`);
      } catch (error) {
        console.error(`      ❌ Error processing ${product.name || product.id}:`, error.message);
        // Continue with other products
      }
    }
    
    // Save embeddings
    await saveCatalogEmbeddings(embeddings);
    
    console.log(`✅ Successfully computed ${embeddings.length} embeddings`);
    console.groupEnd();
    
    res.json({ 
      success: true,
      computed: embeddings.length,
      total: products.length,
      failed: products.length - embeddings.length
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.groupEnd();
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get catalog embeddings
 * GET /api/catalog/embeddings
 */
app.get('/api/catalog/embeddings', async (req, res) => {
  try {
    const embeddings = await getCatalogEmbeddings();
    res.json({
      success: true,
      count: embeddings.length,
      products: embeddings.map(e => ({
        id: e.id,
        name: e.name,
        imageUrl: e.imageUrl,
        price: e.price,
        url: e.url,
        category: e.category
        // Note: embedding vector is not included in response for size reasons
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    huggingFaceConfigured: !!process.env.HUGGINGFACE_API_KEY,
    catalogEmbeddingsCount: catalogEmbeddings.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Test authentication endpoint
 * GET /test-auth
 * Verifies Google Cloud credentials are loaded correctly
 */
app.get('/test-auth', async (req, res) => {
  try {
    const hasCredentials = !!process.env.GOOGLE_CLOUD_CREDENTIALS;
    let creds = null;
    
    if (hasCredentials) {
      try {
        creds = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
      } catch (parseError) {
        return res.status(500).json({ 
          error: 'Failed to parse GOOGLE_CLOUD_CREDENTIALS',
          details: parseError.message 
        });
      }
    }
    
    res.json({
      hasCredentials,
      visionClientInitialized: visionClient !== null,
      serviceAccount: creds?.client_email || null,
      projectId: creds?.project_id || null,
      credentialType: creds?.type || null,
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
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
      health: 'GET /api/health',
      detectProducts: 'POST /api/detect-products',
      detectAndMatch: 'POST /api/detect-and-match',
      computeEmbeddings: 'POST /api/catalog/compute-embeddings',
      getEmbeddings: 'GET /api/catalog/embeddings',
    },
    visionApiConfigured: visionClient !== null,
    huggingFaceConfigured: !!process.env.HUGGINGFACE_API_KEY,
    catalogEmbeddingsCount: catalogEmbeddings.length,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: GET http://localhost:${PORT}/api/health`);
  console.log(`🔍 Product detection: POST http://localhost:${PORT}/api/detect-products`);
  console.log(`🎯 Detect & Match: POST http://localhost:${PORT}/api/detect-and-match`);
  console.log(`📦 Compute embeddings: POST http://localhost:${PORT}/api/catalog/compute-embeddings`);
  console.log(`📋 Get embeddings: GET http://localhost:${PORT}/api/catalog/embeddings`);
});

