// // // // import express from 'express';
// // // // import cors from 'cors';
// // // // import dotenv from 'dotenv';
// // // // import { ImageAnnotatorClient } from '@google-cloud/vision';
// // // // import fetch from 'node-fetch';
// // // // import sharp from 'sharp';

// // // // // Load environment variables
// // // // dotenv.config();

// // // // const app = express();
// // // // const PORT = process.env.PORT || 3000;

// // // // // Middleware
// // // // // Configure CORS to allow all origins (for development)
// // // // // In production, specify your frontend domain
// // // // app.use(cors({
// // // //   origin: '*', // Allow all origins for development
// // // //   methods: ['GET', 'POST', 'OPTIONS'],
// // // //   allowedHeaders: ['Content-Type', 'Authorization'],
// // // //   credentials: false
// // // // }));

// // // // // Handle preflight requests
// // // // app.options('*', cors());

// // // // app.use(express.json({ limit: '10mb' }));

// // // // // Initialize Google Vision client
// // // // let visionClient = null;
// // // // let googleCredentials = null;

// // // // // Debug: Check which credential environment variables are set
// // // // console.log('🔍 Checking for Google Cloud credentials...');
// // // // console.log('   GOOGLE_CLOUD_CREDENTIALS:', process.env.GOOGLE_CLOUD_CREDENTIALS ? 'SET (length: ' + process.env.GOOGLE_CLOUD_CREDENTIALS.length + ')' : 'NOT SET');
// // // // console.log('   GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NOT SET');
// // // // console.log('   GOOGLE_SERVICE_ACCOUNT_JSON:', process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? 'SET' : 'NOT SET');

// // // // try {
// // // //   // Parse Google Cloud credentials from environment variable (Railway deployment)
// // // //   if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
// // // //     try {
// // // //       console.log('📝 Parsing GOOGLE_CLOUD_CREDENTIALS...');
// // // //       googleCredentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
      
// // // //       // Validate required fields
// // // //       if (!googleCredentials.type || !googleCredentials.project_id || !googleCredentials.private_key || !googleCredentials.client_email) {
// // // //         throw new Error('Missing required fields in credentials. Required: type, project_id, private_key, client_email');
// // // //       }
      
// // // //       // Fix private key if it has escaped newlines (common in environment variables)
// // // //       if (googleCredentials.private_key && typeof googleCredentials.private_key === 'string') {
// // // //         googleCredentials.private_key = googleCredentials.private_key.replace(/\\n/g, '\n');
// // // //       }
      
// // // //       console.log('✅ Credentials parsed successfully');
// // // //       console.log(`   Type: ${googleCredentials.type}`);
// // // //       console.log(`   Project ID: ${googleCredentials.project_id}`);
// // // //       console.log(`   Service Account: ${googleCredentials.client_email}`);
// // // //       console.log(`   Private Key Length: ${googleCredentials.private_key?.length || 0}`);
      
// // // //       visionClient = new ImageAnnotatorClient({
// // // //         credentials: googleCredentials,
// // // //       });
// // // //       console.log('✅ Google Vision API initialized with Railway credentials');
// // // //     } catch (parseError) {
// // // //       console.error('❌ Failed to parse GOOGLE_CLOUD_CREDENTIALS:', parseError.message);
// // // //       console.error('   Error stack:', parseError.stack);
// // // //       throw parseError;
// // // //     }
// // // //   }
// // // //   // Option 1: Use service account key file (for local development)
// // // //   else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
// // // //     visionClient = new ImageAnnotatorClient({
// // // //       keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
// // // //     });
// // // //     console.log('✅ Google Vision API initialized with service account file');
// // // //   }
// // // //   // Option 2: Use service account JSON from environment variable (alternative name)
// // // //   else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
// // // //     googleCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
// // // //     visionClient = new ImageAnnotatorClient({
// // // //       credentials: googleCredentials,
// // // //     });
// // // //     console.log('✅ Google Vision API initialized with service account JSON from env');
// // // //   }
// // // //   // Option 3: Use default credentials (for GCP deployments)
// // // //   else {
// // // //     visionClient = new ImageAnnotatorClient();
// // // //     console.log('✅ Google Vision API initialized with default credentials');
// // // //   }
// // // // } catch (error) {
// // // //   console.error('❌ Failed to initialize Google Vision API:', error.message);
// // // //   console.error('   Error details:', {
// // // //     name: error.name,
// // // //     message: error.message,
// // // //     stack: error.stack
// // // //   });
// // // //   console.warn('   Set GOOGLE_CLOUD_CREDENTIALS (Railway), GOOGLE_APPLICATION_CREDENTIALS, or GOOGLE_SERVICE_ACCOUNT_JSON to enable');
// // // //   console.warn('   Current env vars:', {
// // // //     GOOGLE_CLOUD_CREDENTIALS: process.env.GOOGLE_CLOUD_CREDENTIALS ? 'SET' : 'NOT SET',
// // // //     GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NOT SET',
// // // //     GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? 'SET' : 'NOT SET'
// // // //   });
// // // // }

// // // // /**
// // // //  * Helper function to map detected labels to product categories
// // // //  */
// // // // function mapLabelToCategory(label) {
// // // //   if (!label) return 'accessories';
  
// // // //   const lowerLabel = label.toLowerCase();
  
// // // //   if (lowerLabel.includes('watch') || lowerLabel.includes('timepiece')) return 'watch';
// // // //   if (lowerLabel.includes('shoe') || lowerLabel.includes('sneaker') || lowerLabel.includes('boot')) return 'shoes';
// // // //   if (lowerLabel.includes('sunglass') || lowerLabel.includes('glasses')) return 'sunglasses';
// // // //   if (lowerLabel.includes('bag') || lowerLabel.includes('handbag') || lowerLabel.includes('purse')) return 'bag';
// // // //   if (lowerLabel.includes('shirt') || lowerLabel.includes('top') || lowerLabel.includes('blouse')) return 'clothing';
// // // //   if (lowerLabel.includes('pant') || lowerLabel.includes('jean')) return 'clothing';
// // // //   if (lowerLabel.includes('dress')) return 'clothing';
// // // //   if (lowerLabel.includes('jacket') || lowerLabel.includes('coat')) return 'clothing';
// // // //   if (lowerLabel.includes('phone') || lowerLabel.includes('smartphone')) return 'electronics';
// // // //   if (lowerLabel.includes('laptop') || lowerLabel.includes('computer')) return 'electronics';
// // // //   if (lowerLabel.includes('jewelry') || lowerLabel.includes('necklace') || lowerLabel.includes('ring')) return 'accessories';
  
// // // //   return 'accessories'; // Default category
// // // // }

// // // // /**
// // // //  * Hugging Face API - Fallback detection service
// // // //  * Uses DETR model for object detection (80 COCO classes)
// // // //  */
// // // // async function detectProductsWithHuggingFace(imageBuffer) {
// // // //   console.group('🤗 Hugging Face API Call');
// // // //   console.log('Model: facebook/detr-resnet-50');
// // // //   console.log('Image buffer size:', imageBuffer.length, 'bytes');
  
// // // //   const apiKey = process.env.HUGGINGFACE_API_KEY;
// // // //   console.log('API Key present:', !!apiKey);
  
// // // //   if (!apiKey) {
// // // //     console.error('❌ HUGGINGFACE_API_KEY not configured');
// // // //     console.groupEnd();
// // // //     throw new Error('HUGGINGFACE_API_KEY not configured');
// // // //   }

// // // //   try {
// // // //     // Use DETR model for object detection
// // // //     const model = 'facebook/detr-resnet-50';
    
// // // //     // Try different router endpoint formats
// // // //     // Note: router.huggingface.co may require different authentication or model availability
// // // //     const routerFormats = [
// // // //       `https://huggingface.co/${model}`,  // Standard router format
// // // //       `https://api-inference.huggingface.co/models/${model}`,  // Legacy (deprecated, returns 410)
// // // //     ];
    
// // // //     console.log('📡 Sending request to Hugging Face...');
// // // //     console.log('   Model:', model);
    
// // // //     let response;
// // // //     let lastError;
    
// // // //     for (const apiUrl of routerFormats) {
// // // //       try {
// // // //         console.log(`   Trying URL: ${apiUrl}`);
        
// // // //         response = await fetch(apiUrl, {
// // // //           method: 'POST',
// // // //           headers: {
// // // //             'Authorization': `Bearer ${apiKey}`,
// // // //             'Content-Type': 'application/octet-stream',
// // // //           },
// // // //           body: imageBuffer,
// // // //         });

// // // //         console.log(`   Response status: ${response.status} ${response.statusText}`);

// // // //         // If we get 410 (Gone), skip this format
// // // //         if (response.status === 410) {
// // // //           console.log('   ⚠️  Endpoint returned 410 (deprecated), trying next format...');
// // // //           continue;
// // // //         }

// // // //         // If we get 404, try next format
// // // //         if (response.status === 404) {
// // // //           console.log('   ⚠️  Endpoint returned 404, trying next format...');
// // // //           continue;
// // // //         }

// // // //         // If successful or other error, break
// // // //         break;
// // // //       } catch (fetchError) {
// // // //         console.log(`   ⚠️  Fetch error: ${fetchError.message}, trying next format...`);
// // // //         lastError = fetchError;
// // // //         continue;
// // // //       }
// // // //     }

// // // //     // Check if we got a valid response
// // // //     if (!response || !response.ok) {
// // // //       const errorText = response ? await response.text() : (lastError?.message || 'All endpoints failed');
// // // //       console.error('❌ Hugging Face API error response:', errorText);
// // // //       console.groupEnd();
      
// // // //       // Provide helpful error message
// // // //       if (response?.status === 404) {
// // // //         throw new Error(`Model ${model} not found or not available via Inference API. Please check: 1) Model exists at https://huggingface.co/${model}, 2) Model supports Inference API, 3) Your API token has access. Error: ${errorText}`);
// // // //       }
      
// // // //       throw new Error(`Hugging Face API error: ${response?.status || 'NETWORK'} ${errorText}`);
// // // //     }

// // // //     const data = await response.json();
// // // //     console.log('📊 Hugging Face raw response:');
// // // //     console.log('   Response type:', Array.isArray(data) ? 'Array' : typeof data);
// // // //     console.log('   Response length:', Array.isArray(data) ? data.length : 'N/A');
// // // //     if (Array.isArray(data) && data.length > 0) {
// // // //       console.log('   First item:', JSON.stringify(data[0], null, 2));
// // // //       console.log('   Total items:', data.length);
// // // //     } else {
// // // //       console.log('   Full response:', JSON.stringify(data, null, 2));
// // // //     }
    
// // // //     // Handle model loading (first request)
// // // //     if (data.error && data.error.includes('loading')) {
// // // //       console.log('⏳ Hugging Face model is loading, waiting 10 seconds...');
// // // //       await new Promise(resolve => setTimeout(resolve, 10000));
// // // //       // Retry once
// // // //       return detectProductsWithHuggingFace(imageBuffer);
// // // //     }

// // // //     // Transform Hugging Face response to our format
// // // //     // DETR returns: [{label, score, box: {xmin, ymin, xmax, ymax}}]
// // // //     if (Array.isArray(data) && data.length > 0) {
// // // //       // Assume standard image dimensions for normalization
// // // //       // In production, you might want to get actual image dimensions
// // // //       const assumedImageWidth = 640;
// // // //       const assumedImageHeight = 480;
      
// // // //       console.log(`📊 Processing ${data.length} raw detections from Hugging Face...`);
      
// // // //       const filtered = data.filter((item) => {
// // // //         const score = item.score || 0;
// // // //         if (score > 0.3) { // Lower threshold to 0.3 for more detections
// // // //           console.log(`   ✓ ${item.label}: ${(score * 100).toFixed(1)}%`);
// // // //           return true;
// // // //         }
// // // //         return false;
// // // //       });
      
// // // //       console.log(`   Filtered to ${filtered.length} detections (threshold: 0.3)`);
      
// // // //       const detections = filtered.map((item, index) => {
// // // //           const box = item.box || {};
// // // //           const xmin = box.xmin ?? 0;
// // // //           const ymin = box.ymin ?? 0;
// // // //           const xmax = box.xmax ?? assumedImageWidth;
// // // //           const ymax = box.ymax ?? assumedImageHeight;
          
// // // //           // Check if coordinates are normalized (0-1) or in pixels
// // // //           const isNormalized = xmax <= 1 && ymax <= 1;
          
// // // //           const x = isNormalized ? xmin * 100 : (xmin / assumedImageWidth) * 100;
// // // //           const y = isNormalized ? ymin * 100 : (ymin / assumedImageHeight) * 100;
// // // //           const width = isNormalized 
// // // //             ? (xmax - xmin) * 100 
// // // //             : ((xmax - xmin) / assumedImageWidth) * 100;
// // // //           const height = isNormalized 
// // // //             ? (ymax - ymin) * 100 
// // // //             : ((ymax - ymin) / assumedImageHeight) * 100;
          
// // // //           return {
// // // //             id: `hf-${index}`,
// // // //             name: item.label || 'Product',
// // // //             category: mapLabelToCategory(item.label || 'object'),
// // // //             confidence: item.score || 0.8,
// // // //             boundingBox: {
// // // //               x: Math.max(0, Math.min(100, x)),
// // // //               y: Math.max(0, Math.min(100, y)),
// // // //               width: Math.max(1, Math.min(100, width)),
// // // //               height: Math.max(1, Math.min(100, height)),
// // // //             },
// // // //             attributes: {
// // // //               provider: 'huggingface',
// // // //               model: 'detr-resnet-50',
// // // //             },
// // // //           };
// // // //         });
// // // //     }

// // // //     console.log(`✅ Processed ${detections.length} detections from Hugging Face`);
// // // //     if (detections.length > 0) {
// // // //       console.log('   Detection details:');
// // // //       detections.forEach((det, idx) => {
// // // //         console.log(`      ${idx + 1}. ${det.name} - ${det.category} (${(det.confidence * 100).toFixed(1)}%)`);
// // // //         console.log(`         Bounding box: x=${det.boundingBox.x.toFixed(1)}%, y=${det.boundingBox.y.toFixed(1)}%, w=${det.boundingBox.width.toFixed(1)}%, h=${det.boundingBox.height.toFixed(1)}%`);
// // // //       });
// // // //     }
// // // //     console.groupEnd();
// // // //     return detections;
// // // //   } catch (error) {
// // // //     console.error('❌ Hugging Face detection error:', error.message);
// // // //     console.error('   Error stack:', error.stack);
// // // //     console.groupEnd();
// // // //     throw error;
// // // //   }
// // // // }

// // // // // ============================================
// // // // // STAGE 1: OBJECT DETECTION (OWLv2)
// // // // // ============================================

// // // // /**
// // // //  * Detect products using OWLv2 (Zero-shot object detection)
// // // //  * Best for e-commerce: Can detect specific product types with text prompts
// // // //  * 
// // // //  * NOTE: OWLv2 models may not be available via Hugging Face Inference API.
// // // //  * This function will try multiple model variants and formats.
// // // //  * If all fail, the caller should fall back to DETR.
// // // //  */
// // // // async function detectProductsWithOWL(imageBuffer, textPrompts = ["shoe", "bag", "watch", "clothing", "sneaker", "handbag", "backpack", "sunglasses"]) {
// // // //   const apiKey = process.env.HUGGINGFACE_API_KEY;
  
// // // //   if (!apiKey) {
// // // //     throw new Error('HUGGINGFACE_API_KEY not configured');
// // // //   }

// // // //   console.log('🦉 Attempting OWLv2 detection with prompts:', textPrompts);
  
// // // //   // Try different OWLv2 model variants
// // // //   const models = [
// // // //     'google/owlvit-base-patch32',
// // // //     'google/owlv2-base-patch16-ensemble',
// // // //     'google/owlvit-base-patch16'
// // // //   ];
  
// // // //   for (const model of models) {
// // // //     try {
// // // //       console.log(`   Trying model: ${model}`);
      
// // // //       // Try router endpoint (new)
// // // //       let apiUrl = `https://huggingface.co/${model}`;
      
// // // //       // OWLv2/OWLViT might need image as raw bytes with text prompts
// // // //       // Try format 1: Image as raw bytes with JSON parameters
// // // //       let response = await fetch(apiUrl, {
// // // //         method: 'POST',
// // // //         headers: {
// // // //           'Authorization': `Bearer ${apiKey}`,
// // // //           'Content-Type': 'application/json',
// // // //         },
// // // //         body: JSON.stringify({
// // // //           inputs: {
// // // //             image: imageBuffer.toString('base64'),
// // // //             text: textPrompts
// // // //           }
// // // //         }),
// // // //       });

// // // //       // If that fails, try format 2: Multipart form data
// // // //       if (!response.ok && response.status === 404) {
// // // //         console.log(`   Model ${model} not available via router, trying alternative format...`);
        
// // // //         // Try legacy api-inference endpoint
// // // //         apiUrl = `https://api-inference.huggingface.co/models/${model}`;
// // // //         response = await fetch(apiUrl, {
// // // //           method: 'POST',
// // // //           headers: {
// // // //             'Authorization': `Bearer ${apiKey}`,
// // // //             'Content-Type': 'application/json',
// // // //           },
// // // //           body: JSON.stringify({
// // // //             inputs: {
// // // //               image: imageBuffer.toString('base64'),
// // // //               text: textPrompts
// // // //             }
// // // //           }),
// // // //         });
// // // //       }

// // // //       if (!response.ok) {
// // // //         if (response.status === 404) {
// // // //           console.log(`   ⚠️  Model ${model} not available (404)`);
// // // //           continue; // Try next model
// // // //         }
// // // //         const errorText = await response.text();
// // // //         throw new Error(`OWLv2 API error: ${response.status} ${errorText}`);
// // // //       }

// // // //       const data = await response.json();
      
// // // //       // Handle model loading
// // // //       if (data.error && data.error.includes('loading')) {
// // // //         console.log(`   ⏳ Model ${model} is loading, waiting 10 seconds...`);
// // // //         await new Promise(resolve => setTimeout(resolve, 10000));
// // // //         // Retry once
// // // //         return detectProductsWithOWL(imageBuffer, textPrompts);
// // // //       }

// // // //       // Handle error responses
// // // //       if (data.error) {
// // // //         console.log(`   ⚠️  Model ${model} returned error: ${data.error}`);
// // // //         continue; // Try next model
// // // //       }

// // // //       console.log(`   ✅ Model ${model} responded successfully`);
// // // //       console.log('   OWLv2 response format:', Array.isArray(data) ? 'Array' : typeof data);
      
// // // //       // OWLv2 returns detections in format: [{label, score, box: {xmin, ymin, xmax, ymax}}]
// // // //       if (Array.isArray(data) && data.length > 0) {
// // // //         const detections = data.map((item, idx) => ({
// // // //           id: `owl-${idx}`,
// // // //           label: item.label || item.class || 'Product',
// // // //           score: item.score || item.confidence || 0.5,
// // // //           box: item.box || item.bbox || {
// // // //             xmin: 0, ymin: 0, xmax: 1, ymax: 1
// // // //           }
// // // //         }));
        
// // // //         console.log(`   ✅ OWLv2 detected ${detections.length} products`);
// // // //         return detections;
// // // //       }
      
// // // //       // If response is not in expected format, try next model
// // // //       console.log(`   ⚠️  Model ${model} returned unexpected format`);
// // // //       continue;
      
// // // //     } catch (error) {
// // // //       console.log(`   ⚠️  Model ${model} failed: ${error.message}`);
// // // //       // Continue to next model
// // // //       continue;
// // // //     }
// // // //   }
  
// // // //   // If all models failed, throw error to trigger fallback
// // // //   throw new Error('All OWLv2 model variants failed. OWLv2 may not be available via Inference API. Falling back to DETR.');
// // // // }

// // // // // ============================================
// // // // // STAGE 2: VISUAL SEARCH / EMBEDDING
// // // // // ============================================

// // // // /**
// // // //  * Generate embeddings using DINOv2
// // // //  * BEST for finding similar products in catalog
// // // //  */
// // // // async function generateEmbeddingDINO(imageBuffer) {
// // // //   const apiKey = process.env.HUGGINGFACE_API_KEY;
// // // //   const model = 'facebook/dinov2-base';
  
// // // //   if (!apiKey) {
// // // //     throw new Error('HUGGINGFACE_API_KEY not configured');
// // // //   }

// // // //   console.log('🧬 Generating DINOv2 embedding');
  
// // // //   try {
// // // //     // Try different endpoint formats
// // // //     const endpointFormats = [
// // // //       `https://huggingface.co/${model}`,
// // // //       `https://api-inference.huggingface.co/models/${model}`,  // Legacy (may return 410)
// // // //     ];
    
// // // //     let response;
// // // //     let lastError;
    
// // // //     for (const apiUrl of endpointFormats) {
// // // //       try {
// // // //         response = await fetch(apiUrl, {
// // // //           method: 'POST',
// // // //           headers: {
// // // //             'Authorization': `Bearer ${apiKey}`,
// // // //             'Content-Type': 'image/jpeg',
// // // //           },
// // // //           body: imageBuffer,
// // // //         });

// // // //         // Skip if deprecated (410) or not found (404)
// // // //         if (response.status === 410 || response.status === 404) {
// // // //           continue;
// // // //         }

// // // //         // If successful or other error, break
// // // //         break;
// // // //       } catch (fetchError) {
// // // //         lastError = fetchError;
// // // //         continue;
// // // //       }
// // // //     }

// // // //     if (!response || !response.ok) {
// // // //       const errorText = response ? await response.text() : (lastError?.message || 'All endpoints failed');
// // // //       throw new Error(`DINOv2 API error: ${response?.status || 'NETWORK'} ${errorText}`);
// // // //     }

// // // //     const embedding = await response.json();
    
// // // //     // Handle model loading
// // // //     if (embedding.error && embedding.error.includes('loading')) {
// // // //       console.log('⏳ DINOv2 model is loading, waiting 10 seconds...');
// // // //       await new Promise(resolve => setTimeout(resolve, 10000));
// // // //       return generateEmbeddingDINO(imageBuffer);
// // // //     }

// // // //     // Ensure embedding is an array
// // // //     if (!Array.isArray(embedding)) {
// // // //       throw new Error('DINOv2 returned unexpected format');
// // // //     }

// // // //     return embedding; // Returns a vector (e.g., 768 dimensions)
// // // //   } catch (error) {
// // // //     console.error('❌ DINOv2 embedding error:', error.message);
// // // //     throw error;
// // // //   }
// // // // }

// // // // /**
// // // //  * Generate embeddings using CLIP
// // // //  * BEST for text+image matching ("red nike shoe")
// // // //  */
// // // // async function generateEmbeddingCLIP(imageBuffer) {
// // // //   const apiKey = process.env.HUGGINGFACE_API_KEY;
// // // //   const model = 'openai/clip-vit-large-patch14';
  
// // // //   if (!apiKey) {
// // // //     throw new Error('HUGGINGFACE_API_KEY not configured');
// // // //   }

// // // //   console.log('🖼️ Generating CLIP embedding');
  
// // // //   try {
// // // //     // Try different endpoint formats
// // // //     const endpointFormats = [
// // // //       `https://huggingface.co/${model}`,
// // // //       `https://api-inference.huggingface.co/models/${model}`,  // Legacy (may return 410)
// // // //     ];
    
// // // //     let response;
// // // //     let lastError;
    
// // // //     for (const apiUrl of endpointFormats) {
// // // //       try {
// // // //         response = await fetch(apiUrl, {
// // // //           method: 'POST',
// // // //           headers: {
// // // //             'Authorization': `Bearer ${apiKey}`,
// // // //             'Content-Type': 'image/jpeg',
// // // //           },
// // // //           body: imageBuffer,
// // // //         });

// // // //         // Skip if deprecated (410) or not found (404)
// // // //         if (response.status === 410 || response.status === 404) {
// // // //           continue;
// // // //         }

// // // //         // If successful or other error, break
// // // //         break;
// // // //       } catch (fetchError) {
// // // //         lastError = fetchError;
// // // //         continue;
// // // //       }
// // // //     }

// // // //     if (!response || !response.ok) {
// // // //       const errorText = response ? await response.text() : (lastError?.message || 'All endpoints failed');
// // // //       throw new Error(`CLIP API error: ${response?.status || 'NETWORK'} ${errorText}`);
// // // //     }

// // // //     const embedding = await response.json();
    
// // // //     // Handle model loading
// // // //     if (embedding.error && embedding.error.includes('loading')) {
// // // //       console.log('⏳ CLIP model is loading, waiting 10 seconds...');
// // // //       await new Promise(resolve => setTimeout(resolve, 10000));
// // // //       return generateEmbeddingCLIP(imageBuffer);
// // // //     }

// // // //     // Ensure embedding is an array
// // // //     if (!Array.isArray(embedding)) {
// // // //       throw new Error('CLIP returned unexpected format');
// // // //     }

// // // //     return embedding;
// // // //   } catch (error) {
// // // //     console.error('❌ CLIP embedding error:', error.message);
// // // //     throw error;
// // // //   }
// // // // }

// // // // // ============================================
// // // // // STAGE 3: CATALOG MATCHING
// // // // // ============================================

// // // // /**
// // // //  * Calculate cosine similarity between two vectors
// // // //  */
// // // // function cosineSimilarity(vecA, vecB) {
// // // //   if (!Array.isArray(vecA) || !Array.isArray(vecB)) {
// // // //     throw new Error('Vectors must be arrays');
// // // //   }
  
// // // //   if (vecA.length !== vecB.length) {
// // // //     throw new Error('Vectors must have the same length');
// // // //   }

// // // //   const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
// // // //   const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
// // // //   const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
// // // //   if (magnitudeA === 0 || magnitudeB === 0) {
// // // //     return 0;
// // // //   }
  
// // // //   return dotProduct / (magnitudeA * magnitudeB);
// // // // }

// // // // /**
// // // //  * Match detected product with catalog
// // // //  */
// // // // async function matchWithCatalog(productEmbedding, catalogEmbeddings, topK = 5) {
// // // //   console.log('🔗 Matching with catalog...');
  
// // // //   if (!Array.isArray(catalogEmbeddings) || catalogEmbeddings.length === 0) {
// // // //     console.log('⚠️  No catalog embeddings available');
// // // //     return [];
// // // //   }
  
// // // //   // Calculate similarity scores
// // // //   const similarities = catalogEmbeddings.map((item) => {
// // // //     try {
// // // //       return {
// // // //         productId: item.id,
// // // //         productName: item.name,
// // // //         score: cosineSimilarity(productEmbedding, item.embedding),
// // // //         price: item.price,
// // // //         imageUrl: item.imageUrl,
// // // //         url: item.url,
// // // //         category: item.category,
// // // //         ...item
// // // //       };
// // // //     } catch (error) {
// // // //       console.warn(`⚠️  Error calculating similarity for ${item.id}:`, error.message);
// // // //       return null;
// // // //     }
// // // //   }).filter(item => item !== null);
  
// // // //   // Sort by similarity (highest first)
// // // //   similarities.sort((a, b) => b.score - a.score);
  
// // // //   // Return top K matches
// // // //   return similarities.slice(0, topK);
// // // // }

// // // // // ============================================
// // // // // IMAGE PROCESSING HELPERS
// // // // // ============================================

// // // // /**
// // // //  * Helper: Crop image based on bounding box
// // // //  * @param {Buffer} imageBuffer - Original image buffer
// // // //  * @param {Object} box - Bounding box {xmin, ymin, xmax, ymax} (normalized 0-1 or pixels)
// // // //  * @returns {Buffer} - Cropped image buffer
// // // //  */
// // // // async function cropImage(imageBuffer, box) {
// // // //   try {
// // // //     if (!box || Object.keys(box).length === 0) {
// // // //       return imageBuffer; // Return original if no box provided
// // // //     }

// // // //     // Get image metadata to determine actual dimensions
// // // //     const metadata = await sharp(imageBuffer).metadata();
// // // //     const imageWidth = metadata.width;
// // // //     const imageHeight = metadata.height;

// // // //     if (!imageWidth || !imageHeight) {
// // // //       console.warn('⚠️  Could not determine image dimensions, returning original');
// // // //       return imageBuffer;
// // // //     }

// // // //     // Determine if coordinates are normalized (0-1) or in pixels
// // // //     const isNormalized = (box.xmax || box.xmax === 0) && box.xmax <= 1 && 
// // // //                          (box.ymax || box.ymax === 0) && box.ymax <= 1;

// // // //     let left, top, width, height;

// // // //     if (isNormalized) {
// // // //       // Normalized coordinates (0-1)
// // // //       left = Math.max(0, Math.floor((box.xmin || 0) * imageWidth));
// // // //       top = Math.max(0, Math.floor((box.ymin || 0) * imageHeight));
// // // //       const right = Math.min(imageWidth, Math.floor((box.xmax || 1) * imageWidth));
// // // //       const bottom = Math.min(imageHeight, Math.floor((box.ymax || 1) * imageHeight));
// // // //       width = right - left;
// // // //       height = bottom - top;
// // // //     } else {
// // // //       // Pixel coordinates
// // // //       left = Math.max(0, Math.floor(box.xmin || 0));
// // // //       top = Math.max(0, Math.floor(box.ymin || 0));
// // // //       const right = Math.min(imageWidth, Math.floor(box.xmax || imageWidth));
// // // //       const bottom = Math.min(imageHeight, Math.floor(box.ymax || imageHeight));
// // // //       width = right - left;
// // // //       height = bottom - top;
// // // //     }

// // // //     // Ensure valid dimensions
// // // //     if (width <= 0 || height <= 0) {
// // // //       console.warn('⚠️  Invalid bounding box dimensions, returning original');
// // // //       return imageBuffer;
// // // //     }

// // // //     // Crop the image
// // // //     const cropped = await sharp(imageBuffer)
// // // //       .extract({ left, top, width, height })
// // // //       .toBuffer();

// // // //     return cropped;
// // // //   } catch (error) {
// // // //     console.error('❌ Error cropping image:', error.message);
// // // //     return imageBuffer; // Return original on error
// // // //   }
// // // // }

// // // // // ============================================
// // // // // CATALOG MANAGEMENT
// // // // // ============================================

// // // // // In-memory storage for catalog embeddings (replace with database in production)
// // // // let catalogEmbeddings = [];

// // // // /**
// // // //  * Get catalog embeddings from storage
// // // //  * In production, replace with database query
// // // //  */
// // // // async function getCatalogEmbeddings() {
// // // //   // TODO: Replace with database query
// // // //   // return await db.query('SELECT * FROM product_embeddings');
// // // //   return catalogEmbeddings;
// // // // }

// // // // /**
// // // //  * Save catalog embeddings to storage
// // // //  * In production, replace with database insert
// // // //  */
// // // // async function saveCatalogEmbeddings(embeddings) {
// // // //   // TODO: Replace with database insert
// // // //   // await db.query('INSERT INTO product_embeddings ...');
// // // //   catalogEmbeddings = embeddings;
// // // //   console.log(`💾 Saved ${embeddings.length} catalog embeddings to memory`);
// // // // }

// // // // /**
// // // //  * Product Detection Endpoint
// // // //  * POST /api/detect-products
// // // //  * 
// // // //  * Detects products in uploaded images using Google Cloud Vision API
// // // //  */
// // // // app.post('/api/detect-products', async (req, res) => {
// // // //   console.group('📸 Image Detection Request Received');
// // // //   console.log('Timestamp:', new Date().toISOString());
// // // //   console.log('Request body size:', JSON.stringify(req.body).length, 'bytes');
// // // //   console.log('Image data present:', !!req.body.image);
// // // //   console.log('Image data length:', req.body.image ? req.body.image.length : 0);
  
// // // //   try {
// // // //     const { image } = req.body;
    
// // // //     if (!image) {
// // // //       console.error('❌ No image data provided');
// // // //       console.groupEnd();
// // // //       return res.status(400).json({ error: 'Image data is required' });
// // // //     }

// // // //     // Extract base64 data
// // // //     const base64Data = image.startsWith('data:') 
// // // //       ? image.split(',')[1] 
// // // //       : image;
    
// // // //     // Convert base64 to buffer
// // // //     const imageBuffer = Buffer.from(base64Data, 'base64');
// // // //     console.log('Image buffer size:', imageBuffer.length, 'bytes');
    
// // // //     let detections = [];
// // // //     let usedProvider = 'none';

// // // //     // Try Google Vision API first (if configured)
// // // //     if (visionClient) {
// // // //       try {
// // // //         console.log('\n🔍 Attempting Google Vision API detection...');
// // // //         console.log('   Client initialized:', !!visionClient);
        
// // // //         // Call Google Vision API for object localization
// // // //         console.log('   📍 Calling objectLocalization...');
// // // //         const [objectResult] = await visionClient.objectLocalization({
// // // //           image: { content: imageBuffer },
// // // //         });
        
// // // //         console.log('   📊 Object Localization Results:');
// // // //         console.log('      Objects found:', objectResult.localizedObjectAnnotations?.length || 0);
// // // //         if (objectResult.localizedObjectAnnotations && objectResult.localizedObjectAnnotations.length > 0) {
// // // //           objectResult.localizedObjectAnnotations.forEach((obj, idx) => {
// // // //             console.log(`      ${idx + 1}. ${obj.name} (confidence: ${(obj.score * 100).toFixed(1)}%)`);
// // // //           });
// // // //         }

// // // //         // Call Google Vision API for label detection (as fallback)
// // // //         console.log('   🏷️  Calling labelDetection...');
// // // //         const [labelResult] = await visionClient.labelDetection({
// // // //           image: { content: imageBuffer },
// // // //           maxResults: 10,
// // // //         });
        
// // // //         console.log('   📊 Label Detection Results:');
// // // //         console.log('      Labels found:', labelResult.labelAnnotations?.length || 0);
// // // //         if (labelResult.labelAnnotations && labelResult.labelAnnotations.length > 0) {
// // // //           labelResult.labelAnnotations.slice(0, 5).forEach((label, idx) => {
// // // //             console.log(`      ${idx + 1}. ${label.description} (${(label.score * 100).toFixed(1)}%)`);
// // // //           });
// // // //         }

// // // //         // Process object localizations (more accurate, includes bounding boxes)
// // // //         if (objectResult.localizedObjectAnnotations && objectResult.localizedObjectAnnotations.length > 0) {
// // // //           console.log('   🔄 Processing object localizations...');
// // // //           objectResult.localizedObjectAnnotations.forEach((obj, index) => {
// // // //             const boundingPoly = obj.boundingPoly?.normalizedVertices || [];
            
// // // //             if (boundingPoly.length >= 2) {
// // // //               const x = boundingPoly[0].x * 100;
// // // //               const y = boundingPoly[0].y * 100;
// // // //               const width = (boundingPoly[1]?.x - boundingPoly[0].x) * 100 || 20;
// // // //               const height = (boundingPoly[2]?.y - boundingPoly[0].y) * 100 || width;

// // // //               const detection = {
// // // //                 id: `gv-obj-${index}`,
// // // //                 name: obj.name || 'Product',
// // // //                 category: mapLabelToCategory(obj.name),
// // // //                 confidence: obj.score || 0.8,
// // // //                 boundingBox: {
// // // //                   x: Math.max(0, Math.min(100, x)),
// // // //                   y: Math.max(0, Math.min(100, y)),
// // // //                   width: Math.max(1, Math.min(100, width)),
// // // //                   height: Math.max(1, Math.min(100, height)),
// // // //                 },
// // // //                 attributes: {
// // // //                   provider: 'google-vision',
// // // //                 },
// // // //               };
              
// // // //               console.log(`      ✓ Detection ${index + 1}:`, {
// // // //                 name: detection.name,
// // // //                 category: detection.category,
// // // //                 confidence: `${(detection.confidence * 100).toFixed(1)}%`,
// // // //                 boundingBox: detection.boundingBox,
// // // //               });
              
// // // //               detections.push(detection);
// // // //             }
// // // //           });
// // // //         }

// // // //         // Process labels as fallback (if no objects detected)
// // // //         if (detections.length === 0 && labelResult.labelAnnotations && labelResult.labelAnnotations.length > 0) {
// // // //           console.log('   🔄 Processing labels (fallback mode - no bounding boxes)...');
// // // //           labelResult.labelAnnotations.forEach((label, index) => {
// // // //             if (label.score > 0.5) { // Lower threshold from 0.7 to 0.5
// // // //               const detection = {
// // // //                 id: `gv-label-${index}`,
// // // //                 name: label.description || 'Product',
// // // //                 category: mapLabelToCategory(label.description),
// // // //                 confidence: label.score,
// // // //                 boundingBox: {
// // // //                   x: 20 + (index * 10),
// // // //                   y: 20 + (index * 10),
// // // //                   width: 30,
// // // //                   height: 30,
// // // //                 },
// // // //                 attributes: {
// // // //                   provider: 'google-vision',
// // // //                 },
// // // //               };
              
// // // //               console.log(`      ✓ Label ${index + 1}: ${label.description} (${(label.score * 100).toFixed(1)}%)`);
// // // //               detections.push(detection);
// // // //             }
// // // //           });
// // // //         }

// // // //         if (detections.length > 0) {
// // // //           usedProvider = 'google-vision';
// // // //           console.log(`\n✅ Google Vision Success:`);
// // // //           console.log(`   Total detections: ${detections.length}`);
// // // //           console.log(`   Provider: ${usedProvider}`);
// // // //         }
// // // //       } catch (visionError) {
// // // //         console.warn('⚠️  Google Vision API failed:', visionError.message);
// // // //         console.log('🔄 Falling back to Hugging Face...');
// // // //       }
// // // //     }

// // // //     // Fallback to Hugging Face if Google Vision failed or not configured
// // // //     if (detections.length === 0 && process.env.HUGGINGFACE_API_KEY) {
// // // //       try {
// // // //         console.log('\n🔍 Attempting Hugging Face detection...');
// // // //         console.log('   API Key present:', !!process.env.HUGGINGFACE_API_KEY);
// // // //         detections = await detectProductsWithHuggingFace(imageBuffer);
// // // //         usedProvider = 'huggingface';
// // // //         console.log(`\n✅ Hugging Face Success:`);
// // // //         console.log(`   Total detections: ${detections.length}`);
// // // //         console.log(`   Provider: ${usedProvider}`);
// // // //         if (detections.length > 0) {
// // // //           console.log('   Detections:');
// // // //           detections.forEach((det, idx) => {
// // // //             console.log(`      ${idx + 1}. ${det.name} (${(det.confidence * 100).toFixed(1)}%) - ${det.category}`);
// // // //           });
// // // //         }
// // // //       } catch (hfError) {
// // // //         console.error('❌ Hugging Face API also failed:', hfError.message);
// // // //         console.error('   Error details:', hfError);
// // // //         // Continue to error handling below
// // // //       }
// // // //     }

// // // //     // If still no detections and no providers available
// // // //     if (detections.length === 0) {
// // // //       if (!visionClient && !process.env.HUGGINGFACE_API_KEY) {
// // // //         return res.status(503).json({ 
// // // //           error: 'No detection services configured. Please set GOOGLE_CLOUD_CREDENTIALS or HUGGINGFACE_API_KEY environment variable.' 
// // // //         });
// // // //       }
// // // //       // Return empty detections if services are configured but found nothing
// // // //       console.log('ℹ️  No products detected in image');
// // // //       console.log('   Debug info:', {
// // // //         visionClientConfigured: visionClient !== null,
// // // //         huggingFaceConfigured: !!process.env.HUGGINGFACE_API_KEY,
// // // //         usedProvider: usedProvider
// // // //       });
// // // //     }

// // // //     // Return detections
// // // //     res.json({ 
// // // //       detections,
// // // //       provider: usedProvider,
// // // //       count: detections.length
// // // //     });
// // // //   } catch (error) {
// // // //     console.error('Error detecting products:', error);
    
// // // //     // Provide helpful error messages
// // // //     if (error.message?.includes('API keys are not supported')) {
// // // //       return res.status(400).json({ 
// // // //         error: 'Google Vision API requires OAuth2 authentication (service account), not API keys. Please configure GOOGLE_CLOUD_CREDENTIALS with a service account JSON.' 
// // // //       });
// // // //     }
    
// // // //     if (error.message?.includes('Permission denied') || error.message?.includes('authentication') || error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('Could not load the default credentials')) {
// // // //       console.error('❌ Google Vision API authentication error:', error.message);
// // // //       console.error('   Error details:', {
// // // //         code: error.code,
// // // //         message: error.message,
// // // //         hasCredentials: !!googleCredentials,
// // // //         hasEnvVar: !!process.env.GOOGLE_CLOUD_CREDENTIALS,
// // // //         serviceAccount: googleCredentials?.client_email,
// // // //         projectId: googleCredentials?.project_id,
// // // //         visionClientInitialized: visionClient !== null
// // // //       });
      
// // // //       // Check if credentials are missing
// // // //       if (!process.env.GOOGLE_CLOUD_CREDENTIALS && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
// // // //         return res.status(503).json({ 
// // // //           error: 'Google Cloud credentials not configured. Please set GOOGLE_CLOUD_CREDENTIALS environment variable in Railway.',
// // // //           details: {
// // // //             message: 'No credential environment variables found',
// // // //             availableVars: Object.keys(process.env).filter(key => key.includes('GOOGLE'))
// // // //           }
// // // //         });
// // // //       }
      
// // // //       return res.status(401).json({ 
// // // //         error: 'Authentication failed. Please check your Google Cloud service account credentials.',
// // // //         details: {
// // // //           message: error.message,
// // // //           code: error.code,
// // // //           hasCredentials: !!googleCredentials,
// // // //           hasEnvVar: !!process.env.GOOGLE_CLOUD_CREDENTIALS,
// // // //           serviceAccount: googleCredentials?.client_email || 'not loaded',
// // // //           projectId: googleCredentials?.project_id || 'not loaded'
// // // //         }
// // // //       });
// // // //     }
    
// // // //     res.status(500).json({ 
// // // //       error: error.message || 'Failed to detect products in image' 
// // // //     });
// // // //   }
// // // // });

// // // // // ============================================
// // // // // MAIN DETECT AND MATCH ENDPOINT
// // // // // ============================================

// // // // /**
// // // //  * Detect products and match with catalog
// // // //  * POST /api/detect-and-match
// // // //  * 
// // // //  * Complete workflow: Detect → Embed → Match
// // // //  */
// // // // app.post('/api/detect-and-match', async (req, res) => {
// // // //   console.group('🔍 Detect and Match Request');
// // // //   console.log('Timestamp:', new Date().toISOString());
  
// // // //   try {
// // // //     const { image, textPrompts, useCLIP } = req.body;
    
// // // //     if (!image) {
// // // //       console.error('❌ No image data provided');
// // // //       console.groupEnd();
// // // //       return res.status(400).json({ error: 'Image data required' });
// // // //     }

// // // //     // Convert base64 to buffer
// // // //     const base64Data = image.startsWith('data:') ? image.split(',')[1] : image;
// // // //     const imageBuffer = Buffer.from(base64Data, 'base64');
    
// // // //     console.log('\n📸 Starting product detection and matching...');
// // // //     console.log('Image buffer size:', imageBuffer.length, 'bytes');
    
// // // //     // STEP 1: Detect products in image
// // // //     let detections = [];
    
// // // //     if (!process.env.HUGGINGFACE_API_KEY) {
// // // //       return res.status(503).json({ 
// // // //         error: 'HUGGINGFACE_API_KEY not configured. Required for detect-and-match endpoint.' 
// // // //       });
// // // //     }
    
// // // //     // Use DETR as primary method (more reliable via Inference API)
// // // //     // OWLv2 is not consistently available via Inference API
// // // //     try {
// // // //       console.log('🔍 Using DETR for product detection...');
// // // //       detections = await detectProductsWithHuggingFace(imageBuffer);
      
// // // //       // Transform DETR format to match expected format
// // // //       detections = detections.map((det, idx) => ({
// // // //         id: det.id,
// // // //         label: det.name,
// // // //         score: det.confidence,
// // // //         box: {
// // // //           xmin: (det.boundingBox.x / 100),
// // // //           ymin: (det.boundingBox.y / 100),
// // // //           xmax: ((det.boundingBox.x + det.boundingBox.width) / 100),
// // // //           ymax: ((det.boundingBox.y + det.boundingBox.height) / 100)
// // // //         }
// // // //       }));
      
// // // //       console.log(`✅ DETR detected ${detections.length} products`);
      
// // // //       // Optional: Try OWLv2 as enhancement (non-blocking)
// // // //       if (detections.length === 0 && textPrompts) {
// // // //         console.log('   Trying OWLv2 as enhancement...');
// // // //         try {
// // // //           const owlDetections = await detectProductsWithOWL(imageBuffer, textPrompts);
// // // //           if (owlDetections.length > 0) {
// // // //             console.log(`   ✅ OWLv2 found ${owlDetections.length} additional products`);
// // // //             detections = owlDetections;
// // // //           }
// // // //         } catch (owlError) {
// // // //           console.log(`   ⚠️  OWLv2 not available: ${owlError.message}`);
// // // //           // Continue with DETR results (or empty if DETR also found nothing)
// // // //         }
// // // //       }
// // // //     } catch (detrError) {
// // // //       console.error('❌ DETR detection failed:', detrError.message);
      
// // // //       // Last resort: Try OWLv2
// // // //       if (textPrompts) {
// // // //         try {
// // // //           console.log('   Attempting OWLv2 as fallback...');
// // // //           detections = await detectProductsWithOWL(imageBuffer, textPrompts);
// // // //           console.log(`   ✅ OWLv2 detected ${detections.length} products`);
// // // //         } catch (owlError) {
// // // //           console.error('❌ Both DETR and OWLv2 failed');
// // // //           throw new Error(`Product detection failed. DETR error: ${detrError.message}. OWLv2 error: ${owlError.message}`);
// // // //         }
// // // //       } else {
// // // //         throw detrError;
// // // //       }
// // // //     }
    
// // // //     if (detections.length === 0) {
// // // //       console.log('ℹ️  No products detected');
// // // //       console.groupEnd();
// // // //       return res.json({ 
// // // //         message: 'No products detected',
// // // //         detections: [],
// // // //         matches: []
// // // //       });
// // // //     }
    
// // // //     console.log(`✅ Detected ${detections.length} products`);
    
// // // //     // STEP 2: Generate embeddings for each detected product
// // // //     const results = [];
    
// // // //     for (const detection of detections) {
// // // //       console.log(`\n🔍 Processing: ${detection.label} (confidence: ${(detection.score * 100).toFixed(1)}%)`);
      
// // // //       try {
// // // //         // Crop the detected product region
// // // //         const croppedImage = await cropImage(imageBuffer, detection.box);
        
// // // //         // Generate embedding for the cropped product image
// // // //         const embedding = useCLIP 
// // // //           ? await generateEmbeddingCLIP(croppedImage)
// // // //           : await generateEmbeddingDINO(croppedImage);
        
// // // //         // STEP 3: Match with catalog
// // // //         const catalogEmbeddings = await getCatalogEmbeddings();
// // // //         const matches = await matchWithCatalog(embedding, catalogEmbeddings, 5);
        
// // // //         results.push({
// // // //           detection: {
// // // //             label: detection.label,
// // // //             confidence: detection.score,
// // // //             boundingBox: detection.box
// // // //           },
// // // //           matches: matches.map(match => ({
// // // //             productId: match.productId,
// // // //             name: match.productName,
// // // //             similarity: match.score,
// // // //             price: match.price,
// // // //             imageUrl: match.imageUrl,
// // // //             url: match.url,
// // // //             category: match.category
// // // //           }))
// // // //         });
        
// // // //         console.log(`   ✓ Found ${matches.length} matches`);
// // // //       } catch (error) {
// // // //         console.error(`   ❌ Error processing ${detection.label}:`, error.message);
// // // //         // Continue with other detections
// // // //         results.push({
// // // //           detection: {
// // // //             label: detection.label,
// // // //             confidence: detection.score,
// // // //             boundingBox: detection.box
// // // //           },
// // // //           matches: [],
// // // //           error: error.message
// // // //         });
// // // //       }
// // // //     }
    
// // // //     console.log(`\n✅ Processing complete! Found matches for ${results.length} products`);
// // // //     console.groupEnd();
    
// // // //     res.json({
// // // //       success: true,
// // // //       detections: results.length,
// // // //       results
// // // //     });
    
// // // //   } catch (error) {
// // // //     console.error('❌ Error:', error);
// // // //     console.groupEnd();
// // // //     res.status(500).json({ error: error.message });
// // // //   }
// // // // });

// // // // // ============================================
// // // // // CATALOG EMBEDDING MANAGEMENT
// // // // // ============================================

// // // // /**
// // // //  * Pre-compute embeddings for product catalog
// // // //  * POST /api/catalog/compute-embeddings
// // // //  * 
// // // //  * Run this once when you add new products to your catalog
// // // //  */
// // // // app.post('/api/catalog/compute-embeddings', async (req, res) => {
// // // //   console.group('📦 Compute Catalog Embeddings');
  
// // // //   try {
// // // //     const { products, useCLIP } = req.body; // Array of {id, name, imageUrl, price, url, category}
    
// // // //     if (!Array.isArray(products) || products.length === 0) {
// // // //       return res.status(400).json({ error: 'Products array is required' });
// // // //     }
    
// // // //     if (!process.env.HUGGINGFACE_API_KEY) {
// // // //       return res.status(503).json({ 
// // // //         error: 'HUGGINGFACE_API_KEY not configured' 
// // // //       });
// // // //     }
    
// // // //     console.log(`📦 Computing embeddings for ${products.length} products...`);
// // // //     console.log(`   Using model: ${useCLIP ? 'CLIP' : 'DINOv2'}`);
    
// // // //     const embeddings = [];
    
// // // //     for (let i = 0; i < products.length; i++) {
// // // //       const product = products[i];
      
// // // //       if (!product.id || !product.imageUrl) {
// // // //         console.warn(`⚠️  Skipping product ${i + 1}: missing id or imageUrl`);
// // // //         continue;
// // // //       }
      
// // // //       try {
// // // //         console.log(`   [${i + 1}/${products.length}] Processing: ${product.name || product.id}`);
        
// // // //         // Fetch product image
// // // //         const imageResponse = await fetch(product.imageUrl);
// // // //         if (!imageResponse.ok) {
// // // //           throw new Error(`Failed to fetch image: ${imageResponse.status}`);
// // // //         }
        
// // // //         const imageBuffer = await imageResponse.buffer();
        
// // // //         // Generate embedding
// // // //         const embedding = useCLIP 
// // // //           ? await generateEmbeddingCLIP(imageBuffer)
// // // //           : await generateEmbeddingDINO(imageBuffer);
        
// // // //         embeddings.push({
// // // //           id: product.id,
// // // //           name: product.name || 'Unknown Product',
// // // //           embedding: embedding,
// // // //           imageUrl: product.imageUrl,
// // // //           price: product.price,
// // // //           url: product.url,
// // // //           category: product.category
// // // //         });
        
// // // //         console.log(`      ✓ ${product.name || product.id}`);
// // // //       } catch (error) {
// // // //         console.error(`      ❌ Error processing ${product.name || product.id}:`, error.message);
// // // //         // Continue with other products
// // // //       }
// // // //     }
    
// // // //     // Save embeddings
// // // //     await saveCatalogEmbeddings(embeddings);
    
// // // //     console.log(`✅ Successfully computed ${embeddings.length} embeddings`);
// // // //     console.groupEnd();
    
// // // //     res.json({ 
// // // //       success: true,
// // // //       computed: embeddings.length,
// // // //       total: products.length,
// // // //       failed: products.length - embeddings.length
// // // //     });
    
// // // //   } catch (error) {
// // // //     console.error('❌ Error:', error);
// // // //     console.groupEnd();
// // // //     res.status(500).json({ error: error.message });
// // // //   }
// // // // });

// // // // /**
// // // //  * Get catalog embeddings
// // // //  * GET /api/catalog/embeddings
// // // //  */
// // // // app.get('/api/catalog/embeddings', async (req, res) => {
// // // //   try {
// // // //     const embeddings = await getCatalogEmbeddings();
// // // //     res.json({
// // // //       success: true,
// // // //       count: embeddings.length,
// // // //       products: embeddings.map(e => ({
// // // //         id: e.id,
// // // //         name: e.name,
// // // //         imageUrl: e.imageUrl,
// // // //         price: e.price,
// // // //         url: e.url,
// // // //         category: e.category
// // // //         // Note: embedding vector is not included in response for size reasons
// // // //       }))
// // // //     });
// // // //   } catch (error) {
// // // //     res.status(500).json({ error: error.message });
// // // //   }
// // // // });

// // // // /**
// // // //  * Health check endpoint
// // // //  * GET /api/health
// // // //  */
// // // // app.get('/api/health', (req, res) => {
// // // //   res.json({ 
// // // //     status: 'ok',
// // // //     visionApiConfigured: visionClient !== null,
// // // //     huggingFaceConfigured: !!process.env.HUGGINGFACE_API_KEY,
// // // //     catalogEmbeddingsCount: catalogEmbeddings.length,
// // // //     timestamp: new Date().toISOString(),
// // // //   });
// // // // });

// // // // /**
// // // //  * Test authentication endpoint
// // // //  * GET /test-auth
// // // //  * Verifies Google Cloud credentials are loaded correctly
// // // //  */
// // // // app.get('/test-auth', async (req, res) => {
// // // //   try {
// // // //     const hasCredentials = !!process.env.GOOGLE_CLOUD_CREDENTIALS;
// // // //     let creds = null;
    
// // // //     if (hasCredentials) {
// // // //       try {
// // // //         creds = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
// // // //       } catch (parseError) {
// // // //         return res.status(500).json({ 
// // // //           error: 'Failed to parse GOOGLE_CLOUD_CREDENTIALS',
// // // //           details: parseError.message 
// // // //         });
// // // //       }
// // // //     }
    
// // // //     res.json({
// // // //       hasCredentials,
// // // //       visionClientInitialized: visionClient !== null,
// // // //       serviceAccount: creds?.client_email || null,
// // // //       projectId: creds?.project_id || null,
// // // //       credentialType: creds?.type || null,
// // // //     });
// // // //   } catch (error) {
// // // //     res.status(500).json({ 
// // // //       error: error.message,
// // // //       stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
// // // //     });
// // // //   }
// // // // });

// // // // /**
// // // //  * Handle GET requests to detect-products (should be POST)
// // // //  */
// // // // app.get('/api/detect-products', (req, res) => {
// // // //   res.status(405).json({ 
// // // //     error: 'Method not allowed. This endpoint only accepts POST requests.',
// // // //     method: 'POST',
// // // //     endpoint: '/api/detect-products',
// // // //     body: {
// // // //       image: 'data:image/jpeg;base64,...'
// // // //     }
// // // //   });
// // // // });

// // // // /**
// // // //  * Root endpoint
// // // //  */
// // // // app.get('/', (req, res) => {
// // // //   res.json({ 
// // // //     message: 'Shop Mini Backend API',
// // // //     endpoints: {
// // // //       health: 'GET /api/health',
// // // //       detectProducts: 'POST /api/detect-products',
// // // //       detectAndMatch: 'POST /api/detect-and-match',
// // // //       computeEmbeddings: 'POST /api/catalog/compute-embeddings',
// // // //       getEmbeddings: 'GET /api/catalog/embeddings',
// // // //     },
// // // //     visionApiConfigured: visionClient !== null,
// // // //     huggingFaceConfigured: !!process.env.HUGGINGFACE_API_KEY,
// // // //     catalogEmbeddingsCount: catalogEmbeddings.length,
// // // //   });
// // // // });

// // // // // Start server
// // // // app.listen(PORT, () => {
// // // //   console.log(`🚀 Backend server running on http://localhost:${PORT}`);
// // // //   console.log(`📡 Health check: GET http://localhost:${PORT}/api/health`);
// // // //   console.log(`🔍 Product detection: POST http://localhost:${PORT}/api/detect-products`);
// // // //   console.log(`🎯 Detect & Match: POST http://localhost:${PORT}/api/detect-and-match`);
// // // //   console.log(`📦 Compute embeddings: POST http://localhost:${PORT}/api/catalog/compute-embeddings`);
// // // //   console.log(`📋 Get embeddings: GET http://localhost:${PORT}/api/catalog/embeddings`);
// // // // });

// // // import express from 'express';
// // // import cors from 'cors';
// // // import dotenv from 'dotenv';
// // // import { ImageAnnotatorClient } from '@google-cloud/vision';
// // // import fetch from 'node-fetch';
// // // import sharp from 'sharp';

// // // // Load environment variables
// // // dotenv.config();

// // // const app = express();
// // // const PORT = process.env.PORT || 3000;

// // // // Middleware
// // // app.use(cors({
// // //   origin: '*',
// // //   methods: ['GET', 'POST', 'OPTIONS'],
// // //   allowedHeaders: ['Content-Type', 'Authorization'],
// // // }));
// // // app.options('*', cors());
// // // app.use(express.json({ limit: '10mb' }));

// // // // Google Vision setup (unchanged)
// // // let visionClient = null;
// // // let googleCredentials = null;

// // // // [Your existing Google Vision credential loading code — unchanged]
// // // // ... (kept exactly as you had it)

// // // // Helper: map labels to categories
// // // function mapLabelToCategory(label) {
// // //   if (!label) return 'accessories';
// // //   const l = label.toLowerCase();
// // //   if (/watch|timepiece/.test(l)) return 'watch';
// // //   if (/shoe|sneaker|boot/.test(l)) return 'shoes';
// // //   if (/sunglass|glasses/.test(l)) return 'sunglasses';
// // //   if (/bag|handbag|purse|backpack/.test(l)) return 'bag';
// // //   if (/shirt|top|blouse|pant|jean|dress|jacket|coat/.test(l)) return 'clothing';
// // //   if (/phone|smartphone|laptop|computer/.test(l)) return 'electronics';
// // //   if (/jewelry|necklace|ring/.test(l)) return 'accessories';
// // //   return 'accessories';
// // // }

// // // // FIXED: DETR Object Detection (facebook/detr-resnet-50) — WORKS NOV 2025
// // // async function detectProductsWithHuggingFace(imageBuffer) {
// // //   console.group('🤗 Hugging Face DETR Detection');
// // //   const apiKey = process.env.HUGGINGFACE_API_KEY;
// // //   if (!apiKey) throw new Error('HUGGINGFACE_API_KEY not configured');

// // //   const ENDPOINT = 'https://router.huggingface.co/hf-inference/models/facebook/detr-resnet-50/object-detection';

// // //   try {
// // //     console.log('Sending to:', ENDPOINT);
// // //     const response = await fetch(ENDPOINT, {
// // //       method: 'POST',
// // //       headers: {
// // //         'Authorization': `Bearer ${apiKey}`,
// // //         'Content-Type': 'application/octet-stream',
// // //       },
// // //       body: imageBuffer,
// // //     });

// // //     if (!response.ok) {
// // //       const err = await response.text();
// // //       console.error('HF Error:', response.status, err);
// // //       throw new Error(`DETR failed: ${response.status} ${err}`);
// // //     }

// // //     const data = await response.json();

// // //     // Handle model loading
// // //     if (data.error?.includes('loading')) {
// // //       console.log('Model loading, retrying in 10s...');
// // //       await new Promise(r => setTimeout(r, 10000));
// // //       return detectProductsWithHuggingFace(imageBuffer);
// // //     }

// // //     if (!Array.isArray(data)) throw new Error('Unexpected DETR response');

// // //     const detections = data
// // //       .filter(item => item.score > 0.3)
// // //       .map((item, i) => {
// // //         const box = item.box || {};
// // //         const isNorm = box.xmax <= 1;
// // //         const x = isNorm ? box.xmin * 100 : (box.xmin / 640) * 100;
// // //         const y = isNorm ? box.ymin * 100 : (box.ymin / 480) * 100;
// // //         const width = isNorm ? (box.xmax - box.xmin) * 100 : ((box.xmax - box.xmin) / 640) * 100;
// // //         const height = isNorm ? (box.ymax - box.ymin) * 100 : ((box.ymax - box.ymin) / 480) * 100;

// // //         return {
// // //           id: `hf-${i}`,
// // //           name: item.label || 'Product',
// // //           category: mapLabelToCategory(item.label),
// // //           confidence: item.score,
// // //           boundingBox: {
// // //             x: Math.max(0, Math.min(100, x)),
// // //             y: Math.max(0, Math.min(100, y)),
// // //             width: Math.max(1, Math.min(100, width)),
// // //             height: Math.max(1, Math.min(100, height)),
// // //           },
// // //           attributes: { provider: 'huggingface', model: 'detr-resnet-50' },
// // //         };
// // //       });

// // //     console.log(`Processed ${detections.length} detections`);
// // //     console.groupEnd();
// // //     return detections;
// // //   } catch (err) {
// // //     console.error('DETR failed:', err.message);
// // //     console.groupEnd();
// // //     throw err;
// // //   }
// // // }

// // // // FIXED: DINOv2 Embedding — WORKS NOV 2025
// // // async function generateEmbeddingDINO(imageBuffer) {
// // //   const apiKey = process.env.HUGGINGFACE_API_KEY;
// // //   if (!apiKey) throw new Error('HUGGINGFACE_API_KEY missing');

// // //   const ENDPOINT = 'https://router.huggingface.co/hf-inference/models/facebook/dinov2-base/feature-extraction';

// // //   const response = await fetch(ENDPOINT, {
// // //     method: 'POST',
// // //     headers: {
// // //       'Authorization': `Bearer ${apiKey}`,
// // //       'Content-Type': 'image/jpeg',
// // //     },
// // //     body: imageBuffer,
// // //   });

// // //   if (!response.ok) {
// // //     const err = await response.text();
// // //     throw new Error(`DINOv2 failed: ${response.status} ${err}`);
// // //   }

// // //   const data = await response.json();
// // //   if (data.error?.includes('loading')) {
// // //     await new Promise(r => setTimeout(r, 10000));
// // //     return generateEmbeddingDINO(imageBuffer);
// // //   }

// // //   return Array.isArray(data) ? data : data[0];
// // // }

// // // // FIXED: CLIP Embedding — WORKS NOV 2025
// // // async function generateEmbeddingCLIP(imageBuffer) {
// // //   const apiKey = process.env.HUGGINGFACE_API_KEY;
// // //   if (!apiKey) throw new Error('HUGGINGFACE_API_KEY missing');

// // //   const ENDPOINT = 'https://router.huggingface.co/hf-inference/models/openai/clip-vit-large-patch14/feature-extraction';

// // //   const response = await fetch(ENDPOINT, {
// // //     method: 'POST',
// // //     headers: {
// // //       'Authorization': `Bearer ${apiKey}`,
// // //       'Content-Type': 'image/jpeg',
// // //     },
// // //     body: imageBuffer,
// // //   });

// // //   if (!response.ok) {
// // //     const err = await response.text();
// // //     throw new Error(`CLIP failed: ${response.status} ${err}`);
// // //   }

// // //   const data = await response.json();
// // //   if (data.error?.includes('loading')) {
// // //     await new Promise(r => setTimeout(r, 10000));
// // //     return generateEmbeddingCLIP(imageBuffer);
// // //   }

// // //   return Array.isArray(data) ? data : data[0];
// // // }

// // // // OWLv2 is no longer reliably available on free Inference API
// // // async function detectProductsWithOWL() {
// // //   throw new Error('OWLv2 not available on free Inference API in 2025. Using DETR instead.');
// // // }

// // // // [cropImage, cosineSimilarity, matchWithCatalog, catalog functions — unchanged]
// // // async function cropImage(imageBuffer, box) {
// // //   // ... (your existing cropImage function — unchanged)
// // //   try {
// // //     if (!box || Object.keys(box).length === 0) return imageBuffer;
// // //     const metadata = await sharp(imageBuffer).metadata();
// // //     const { width: imgW, height: imgH } = metadata;
// // //     if (!imgW || !imgH) return imageBuffer;

// // //     const isNorm = box.xmax <= 1;
// // //     const left = Math.floor(isNorm ? box.xmin * imgW : box.xmin);
// // //     const top = Math.floor(isNorm ? box.ymin * imgH : box.ymin);
// // //     const w = Math.floor(isNorm ? (box.xmax - box.xmin) * imgW : box.xmax - box.xmin);
// // //     const h = Math.floor(isNorm ? (box.ymax - box.ymin) * imgH : box.ymax - box.ymin);

// // //     if (w <= 0 || h <= 0) return imageBuffer;

// // //     return await sharp(imageBuffer)
// // //       .extract({ left, top, width: w, height: h })
// // //       .toBuffer();
// // //   } catch (err) {
// // //     console.error('Crop error:', err.message);
// // //     return imageBuffer;
// // //   }
// // // }

// // // function cosineSimilarity(a, b) {
// // //   if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
// // //   const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
// // //   const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
// // //   const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
// // //   return magA && magB ? dot / (magA * magB) : 0;
// // // }

// // // async function matchWithCatalog(embedding, catalog, topK = 5) {
// // //   if (!catalog.length) return [];
// // //   return catalog
// // //     .map(item => ({
// // //       ...item,
// // //       score: cosineSimilarity(embedding, item.embedding),
// // //     }))
// // //     .sort((a, b) => b.score - a.score)
// // //     .slice(0, topK);
// // // }

// // // let catalogEmbeddings = [];
// // // async function getCatalogEmbeddings() { return catalogEmbeddings; }
// // // async function saveCatalogEmbeddings(e) {
// // //   catalogEmbeddings = e;
// // //   console.log(`Saved ${e.length} catalog embeddings`);
// // // }

// // // // Endpoints
// // // app.post('/api/detect-products', async (req, res) => {
// // //   // ... [your existing Google Vision logic — unchanged] ...

// // //   let detections = [];
// // //   let usedProvider = 'none';

// // //   // Try Google Vision first
// // //   if (visionClient) {
// // //     // ... [your full Google Vision block — unchanged] ...
// // //   }

// // //   // Fallback to Hugging Face DETR (now works!)
// // //   if (detections.length === 0 && process.env.HUGGINGFACE_API_KEY) {
// // //     try {
// // //       detections = await detectProductsWithHuggingFace(imageBuffer);
// // //       usedProvider = 'huggingface';
// // //     } catch (err) {
// // //       console.error('Hugging Face failed:', err.message);
// // //     }
// // //   }

// // //   res.json({ detections, provider: usedProvider, count: detections.length });
// // // });

// // // app.post('/api/detect-and-match', async (req, res) => {
// // //   // ... [your existing preprocessing] ...

// // //   let detections = [];
// // //   try {
// // //     detections = await detectProductsWithHuggingFace(imageBuffer);

// // //     // Transform to normalized box format
// // //     detections = detections.map(det => ({
// // //       id: det.id,
// // //       label: det.name,
// // //       score: det.confidence,
// // //       box: {
// // //         xmin: det.boundingBox.x / 100,
// // //         ymin: det.boundingBox.y / 100,
// // //         xmax: (det.boundingBox.x + det.boundingBox.width) / 100,
// // //         ymax: (det.boundingBox.y + det.boundingBox.height) / 100,
// // //       },
// // //     }));
// // //   } catch (err) {
// // //     return res.status(500).json({ error: 'Detection failed: ' + err.message });
// // //   }

// // //   if (detections.length === 0) {
// // //     return res.json({ message: 'No products detected', detections: [], matches: [] });
// // //   }

// // //   const results = [];
// // //   for (const det of detections) {
// // //     try {
// // //       const cropped = await cropImage(imageBuffer, det.box);
// // //       const embedding = req.body.useCLIP
// // //         ? await generateEmbeddingCLIP(cropped)
// // //         : await generateEmbeddingDINO(cropped);

// // //       const catalog = await getCatalogEmbeddings();
// // //       const matches = await matchWithCatalog(embedding, catalog, 5);

// // //       results.push({
// // //         detection: { label: det.label, confidence: det.score, boundingBox: det.box },
// // //         matches: matches.map(m => ({
// // //           productId: m.id,
// // //           name: m.name,
// // //           similarity: m.score,
// // //           price: m.price,
// // //           imageUrl: m.imageUrl,
// // //           url: m.url,
// // //           category: m.category,
// // //         })),
// // //       });
// // //     } catch (err) {
// // //       results.push({ detection: det, matches: [], error: err.message });
// // //     }
// // //   }

// // //   res.json({ success: true, detections: results.length, results });
// // // });

// // // // [Your catalog compute/get endpoints — unchanged except using fixed embedding functions]

// // // // Health check
// // // app.get('/api/health', (req, res) => {
// // //   res.json({
// // //     status: 'ok',
// // //     visionApiConfigured: !!visionClient,
// // //     huggingFaceConfigured: !!process.env.HUGGINGFACE_API_KEY,
// // //     catalogEmbeddingsCount: catalogEmbeddings.length,
// // //     timestamp: new Date().toISOString(),
// // //     note: 'Using router.huggingface.co (2025 endpoints)',
// // //   });
// // // });

// // // app.get('/', (req, res) => {
// // //   res.json({
// // //     message: 'Shop Mini Backend API (2025 Fixed)',
// // //     endpoints: { /* ... */ },
// // //     huggingFaceConfigured: !!process.env.HUGGINGFACE_API_KEY,
// // //   });
// // // });

// // // app.listen(PORT, () => {
// // //   console.log(`Server running on http://localhost:${PORT}`);
// // //   console.log(`DETR Endpoint: https://router.huggingface.co/hf-inference/models/facebook/detr-resnet-50/object-detection`);
// // // });

// // import express from 'express';
// // import cors from 'cors';
// // import dotenv from 'dotenv';
// // import { ImageAnnotatorClient } from '@google-cloud/vision';
// // import { HfInference } from '@huggingface/inference';  // ← Correct import
// // import sharp from 'sharp';

// // dotenv.config();

// // const app = express();
// // const PORT = process.env.PORT || 3000;

// // app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
// // app.options('*', cors());
// // app.use(express.json({ limit: '10mb' }));

// // // ==================== GOOGLE VISION SETUP ====================
// // let visionClient = null;
// // try {
// //   if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
// //     let creds = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
// //     creds.private_key = creds.private_key.replace(/\\n/g, '\n');
// //     visionClient = new ImageAnnotatorClient({ credentials: creds });
// //   } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
// //     visionClient = new ImageAnnotatorClient({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS });
// //   } else {
// //     visionClient = new ImageAnnotatorClient();
// //   }
// //   console.log('✅ Google Vision initialized');
// // } catch (e) {
// //   console.warn('⚠️ Google Vision not available:', e.message);
// // }

// // // ==================== CATEGORY MAPPING ====================
// // function mapLabelToCategory(label) {
// //   if (!label) return 'accessories';
// //   const l = label.toLowerCase();
// //   if (/watch|timepiece/.test(l)) return 'watch';
// //   if (/shoe|sneaker|boot/.test(l)) return 'shoes';
// //   if (/sunglass|glasses/.test(l)) return 'sunglasses';
// //   if (/bag|handbag|purse|backpack/.test(l)) return 'bag';
// //   if (/shirt|top|blouse|pant|jean|dress|jacket|coat/.test(l)) return 'clothing';
// //   if (/phone|smartphone|laptop|computer/.test(l)) return 'electronics';
// //   if (/jewelry|necklace|ring/.test(l)) return 'accessories';
// //   return 'accessories';
// // }

// // // ==================== HUGGING FACE CLIENT ====================
// // const hf = process.env.HUGGINGFACE_API_KEY 
// //   ? new HfInference(process.env.HUGGINGFACE_API_KEY)
// //   : null;

// // if (!hf) console.warn('⚠️ HUGGINGFACE_API_KEY missing → HF features disabled');

// // // ==================== OBJECT DETECTION (DETR) ====================
// // async function detectProductsWithHuggingFace(imageBuffer) {
// //   if (!hf) throw new Error('Hugging Face not configured');

// //   console.group('🤗 Hugging Face DETR (nielsr/detr-resnet-50)');
// //   const result = await hf.objectDetection({
// //     model: 'nielsr/detr-resnet-50',   // Only reliably working DETR in 2025
// //     inputs: imageBuffer,
// //     threshold: 0.3,
// //   });

// //   const detections = result.map((item, i) => {
// //     const b = item.box;
// //     return {
// //       id: `hf-${i}`,
// //       name: item.label || 'Product',
// //       category: mapLabelToCategory(item.label),
// //       confidence: item.score,
// //       boundingBox: {
// //         x: b.xmin * 100,
// //         y: b.ymin * 100,
// //         width: (b.xmax - b.xmin) * 100,
// //         height: (b.ymax - b.ymin) * 100,
// //       },
// //       attributes: { provider: 'huggingface', model: 'nielsr/detr-resnet-50' },
// //     };
// //   });

// //   console.log(`✅ ${detections.length} detections`);
// //   console.groupEnd();
// //   return detections;
// // }

// // // ==================== EMBEDDINGS ====================
// // async function generateEmbeddingDINO(imageBuffer) {
// //   if (!hf) throw new Error('HF not configured');
// //   return await hf.featureExtraction({
// //     model: 'facebook/dinov2-base',
// //     inputs: imageBuffer,
// //   });
// // }

// // async function generateEmbeddingCLIP(imageBuffer) {
// //   if (!hf) throw new Error('HF not configured');
// //   return await hf.featureExtraction({
// //     model: 'openai/clip-vit-large-patch14',
// //     inputs: imageBuffer,
// //   });
// // }

// // // ==================== IMAGE CROPPING & SIMILARITY ====================
// // async function cropImage(buf, box) {
// //   try {
// //     const { width, height } = await sharp(buf).metadata();
// //     const left   = Math.floor(box.xmin * width);
// //     const top    = Math.floor(box.ymin * height);
// //     const w      = Math.floor((box.xmax - box.xmin) * width);
// //     const h      = Math.floor((box.ymax - box.ymin) * height);
// //     if (w <= 0 || h <= 0) return buf;
// //     return await sharp(buf).extract({ left, top, width: w, height: h }).toBuffer();
// //   } catch (e) {
// //     return buf;
// //   }
// // }

// // function cosineSimilarity(a, b) {
// //   let dot = 0, magA = 0, magB = 0;
// //   for (let i = 0; i < a.length; i++) {
// //     dot += a[i] * b[i];
// //     magA += a[i] ** 2;
// //     magB += b[i] ** 2;
// //   }
// //   return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
// // }

// // async function matchWithCatalog(emb, catalog, k = 5) {
// //   return catalog
// //     .map(item => ({ ...item, score: cosineSimilarity(emb, item.embedding) }))
// //     .sort((a, b) => b.score - a.score)
// //     .slice(0, k);
// // }

// // let catalogEmbeddings = [];
// // const getCatalogEmbeddings = () => catalogEmbeddings;
// // const saveCatalogEmbeddings = (e) => { catalogEmbeddings = e; };

// // // ==================== ENDPOINTS ====================
// // app.post('/api/detect-products', async (req, res) => {
// //   try {
// //     const imageBuffer = Buffer.from((req.body.image || '').split(',')[1] || req.body.image, 'base64');
// //     let detections = [], provider = 'none';

// //     // Google Vision first
// //     if (visionClient) {
// //       try {
// //         const [result] = await visionClient.objectLocalization({ image: { content: imageBuffer } });
// //         detections = (result.localizedObjectAnnotations || []).map((o, i) => {
// //           const v = o.boundingPoly.normalizedVertices;
// //           return {
// //             id: `gv-${i}`,
// //             name: o.name,
// //             category: mapLabelToCategory(o.name),
// //             confidence: o.score,
// //             boundingBox: { x: v[0].x * 100, y: v[0].y * 100, width: (v[1].x - v[0].x) * 100, height: (v[2].y - v[0].y) * 100 },
// //             attributes: { provider: 'google-vision' }
// //           };
// //         });
// //         if (detections.length) provider = 'google-vision';
// //       } catch (e) { console.warn('Google Vision failed'); }
// //     }

// //     // HF fallback
// //     if (!detections.length && hf) {
// //       detections = await detectProductsWithHuggingFace(imageBuffer);
// //       provider = 'huggingface';
// //     }

// //     res.json({ detections, provider, count: detections.length });
// //   } catch (err) {
// //     res.status(500).json({ error: err.message });
// //   }
// // });

// // app.post('/api/detect-and-match', async (req, res) => {
// //   try {
// //     const imageBuffer = Buffer.from((req.body.image || '').split(',')[1] || req.body.image, 'base64');
// //     const detections = await detectProductsWithHuggingFace(imageBuffer);

// //     const results = [];
// //     for (const det of detections) {
// //       const box = {
// //         xmin: det.boundingBox.x / 100,
// //         ymin: det.boundingBox.y / 100,
// //         xmax: (det.boundingBox.x + det.boundingBox.width) / 100,
// //         ymax: (det.boundingBox.y + det.boundingBox.height) / 100,
// //       };
// //       const cropped = await cropImage(imageBuffer, box);
// //       const embedding = req.body.useCLIP ? await generateEmbeddingCLIP(cropped) : await generateEmbeddingDINO(cropped);
// //       const matches = await matchWithCatalog(embedding, await getCatalogEmbeddings(), 5);

// //       results.push({
// //         detection: { label: det.name, confidence: det.confidence, boundingBox: box },
// //         matches: matches.map(m => ({ productId: m.id, name: m.name, similarity: m.score, price: m.price, imageUrl: m.imageUrl, url: m.url, category: m.category }))
// //       });
// //     }
// //     res.json({ success: true, results });
// //   } catch (err) {
// //     res.status(500).json({ error: err.message });
// //   }
// // });

// // // Health
// // app.get('/api/health', (req, res) => res.json({
// //   status: 'ok',
// //   date: new Date().toISOString().split('T')[0],
// //   vision: !!visionClient,
// //   huggingface: !!hf,
// //   detrModel: 'nielsr/detr-resnet-50 (working Nov 2025)'
// // }));

// // app.listen(PORT, () => console.log(`Server ready → http://localhost:${PORT}`));


// // server.ts (or index.ts)
// import express from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import { HfInference } from '@huggingface/inference';
// import { ImageAnnotatorClient } from '@google-cloud/vision';
// import sharp from 'sharp';

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// app.use(cors({ origin: '*' }));
// app.use(express.json({ limit: '10mb' }));

// // =============== HUGGING FACE (WORKS 100% NOV 2025) ===============
// const hf = process.env.HUGGINGFACE_API_KEY
//   ? new HfInference(process.env.HUGGINGFACE_API_KEY)
//   : null;

// if (!hf) console.warn('⚠️ No HUGGINGFACE_API_KEY → HF disabled');

// // =============== GOOGLE VISION (optional) ===============
// let visionClient: ImageAnnotatorClient | null = null;
// try {
//   if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
//     const creds = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
//     creds.private_key = creds.private_key.replace(/\\n/g, '\n');
//     visionClient = new ImageAnnotatorClient({ credentials: creds });
//   }
// } catch (e) {
//   console.warn('Google Vision not available');
// }

// // =============== CATEGORY MAPPING ===============
// const mapLabelToCategory = (label: string) => {
//   if (!label) return 'accessories';
//   const l = label.toLowerCase();
//   if (/watch|timepiece/.test(l)) return 'watch';
//   if (/shoe|sneaker|boot/.test(l)) return 'shoes';
//   if (/sunglass|glasses/.test(l)) return 'sunglasses';
//   if (/bag|handbag|purse/.test(l)) return 'bag';
//   if (/shirt|top|blouse|pant|jean|dress|jacket|coat/.test(l)) return 'clothing';
//   if (/phone|laptop/.test(l)) return 'electronics';
//   if (/jewelry|necklace|ring|bracelet/.test(l)) return 'accessories';
//   return 'accessories';
// };

// // =============== MAIN DETECTION FUNCTION ===============
// app.post('/api/detect-products', async (req, res) => {
//   try {
//     const { image } = req.body;
//     if (!image) return res.status(400).json({ error: 'No image provided' });

//     const imageBuffer = Buffer.from(image.split(',')[1] || image, 'base64');

//     let detections: any[] = [];
//     let provider = 'none';

//     // 1. Try Google Vision first
//     if (visionClient) {
//       try {
//         const [result] = await visionClient.objectLocalization({ image: { content: imageBuffer } });
//         detections = (result.localizedObjectAnnotations || []).map((obj: any, i: number) => {
//           const v = obj.boundingPoly.normalizedVertices;
//           return {
//             id: `gv-${i}`,
//             name: obj.name,
//             category: mapLabelToCategory(obj.name),
//             confidence: obj.score,
//             boundingBox: {
//               x: v[0].x * 100,
//               y: v[0].y * 100,
//               width: (v[2].x || v[1].x) * 100 - v[0].x * 100,
//               height: (v[2].y || v[1].y) * 100 - v[0].y * 100,
//             },
//           };
//         });
//         if (detections.length > 0) provider = 'google-vision';
//       } catch (e) {
//         console.warn('Google Vision failed');
//       }
//     }

//     // 2. Fallback to Hugging Face (this works TODAY)
//     if (detections.length === 0 && hf) {
//       const result = await hf.objectDetection({
//         model: 'nielsr/detr-resnet-50',  // ← ONLY WORKING DETR NOV 2025
//         inputs: imageBuffer,
//         threshold: 0.35,
//       });

//       detections = result.map((item: any, i: number) => ({
//         id: `hf-${i}`,
//         name: item.label,
//         category: mapLabelToCategory(item.label),
//         confidence: item.score,
//         boundingBox: {
//           x: item.box.xmin * 100,
//           y: item.box.ymin * 100,
//           width: (item.box.xmax - item.box.xmin) * 100,
//           height: (item.box.ymax - item.box.ymin) * 100,
//         },
//         attributes: { provider: 'huggingface', model: 'nielsr/detr-resnet-50' },
//       }));
//       provider = 'huggingface';
//     }

//     res.json({ detections, provider, count: detections.length });
//   } catch (error: any) {
//     console.error('Detection error:', error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Health check
// app.get('/api/health', (req, res) => {
//   res.json({
//     status: 'OK',
//     date: '2025-11-21',
//     huggingface: !!hf,
//     model: 'nielsr/detr-resnet-50',
//     message: 'Using @huggingface/inference SDK (official 2025 method)',
//   });
// });

// app.get('/', (req, res) => res.send('ShopMini Backend – Running with 2025 HF Inference SDK'));

// app.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
//   console.log(`✅ Using nielsr/detr-resnet-50 via @huggingface/inference`);
// });



// server.js  (Pure JavaScript – runs directly with Node.js v22+)
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { HfInference } from '@huggingface/inference';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import sharp from 'sharp';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const agentUrl = process.env.AGENT_URL || 'localhost://3000';

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// =============== HUGGING FACE INFERENCE CLIENT ===============
const hf = process.env.HUGGINGFACE_API_KEY
  ? new HfInference(process.env.HUGGINGFACE_API_KEY)
  : null;

if (!hf) {
  console.warn('⚠️ HUGGINGFACE_API_KEY not set – Hugging Face features disabled');
}

// =============== GOOGLE VISION (optional fallback) ===============
let visionClient = null;
try {
  if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
    const creds = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    visionClient = new ImageAnnotatorClient({ credentials: creds });
    console.log('✅ Google Vision ready');
  }
} catch (e) {
  console.warn('Google Vision unavailable');
}

// =============== CATEGORY MAPPING ===============
const mapLabelToCategory = (label) => {
  if (!label) return 'accessories';
  const l = label.toLowerCase();
  if (/watch|timepiece/.test(l)) return 'watch';
  if (/shoe|sneaker|boot/.test(l)) return 'shoes';
  if (/sunglass|glasses/.test(l)) return 'sunglasses';
  if (/bag|handbag|purse|backpack/.test(l)) return 'bag';
  if (/shirt|top|blouse|pant|jean|dress|jacket|coat/.test(l)) return 'clothing';
  if (/phone|laptop/.test(l)) return 'electronics';
  return 'accessories';
};

// =============== OLD IMAGE DETECTION ENDPOINT (DISABLED - Not used by conversational app) ===============
// This endpoint is kept for reference but not used by the new conversational shopping assistant
// app.post('/api/detect-products', async (req, res) => {
//   ... (old image detection code - commented out)
// });

// ==================== AI RECOMMENDATION ENDPOINTS ====================

/**
 * AI Chat endpoint - generates conversational responses
 */
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, conversationHistory, currentProducts } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Use Claude API if available, otherwise use simple rule-based responses
    const claudeApiKey = process.env.CLAUDE_API_KEY;
    
    if (claudeApiKey) {
      // Call Claude API for intelligent responses
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 500,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful shopping assistant. Provide friendly, concise responses and suggest relevant products when appropriate.',
            },
            ...(conversationHistory || []).slice(-10).map(msg => ({
              role: msg.role,
              content: msg.content,
            })),
            {
              role: 'user',
              content: message,
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return res.json({ response: data.content[0].text });
      }
    }

    // Fallback: Simple rule-based responses
    const lowerMessage = message.toLowerCase();
    let response = "I'd be happy to help you find the perfect products!";
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      response = "Hello! I'm here to help you find great products. What are you looking for today?";
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
      response = "I can help you find products in your price range! What's your budget?";
    } else if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) {
      response = "Based on your preferences, I can suggest some great products! What style or category are you interested in?";
    } else if (lowerMessage.includes('thank')) {
      response = "You're welcome! Is there anything else I can help you find?";
    }

    res.json({ response });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * AI Recommendation endpoint - suggests products based on conversation
 */
app.post('/api/ai/recommend', async (req, res) => {
  try {
    const { message, conversationHistory, currentProducts, userPreferences, availableProducts } = req.body;
    
    if (!message || !availableProducts || availableProducts.length === 0) {
      return res.status(400).json({ error: 'Message and availableProducts are required' });
    }

    // Simple keyword-based matching (can be enhanced with LLM)
    const lowerMessage = message.toLowerCase();
    const keywords = lowerMessage.split(/\s+/).filter(w => w.length > 2);
    
    const scored = availableProducts.map(product => {
      let score = 0;
      const productText = `${product.title} ${product.description || ''} ${(product.tags || []).join(' ')} ${product.productType || ''}`.toLowerCase();
      
      keywords.forEach(keyword => {
        if (productText.includes(keyword)) {
          score += 1;
        }
      });
      
      // Boost score if matches user preferences
      if (userPreferences?.categories && product.productType) {
        if (userPreferences.categories.some(cat => productText.includes(cat.toLowerCase()))) {
          score += 2;
        }
      }
      
      return {
        product,
        reason: `Matches your search for "${message}"`,
        confidence: Math.min(score / Math.max(keywords.length, 1), 1),
      };
    });
    
    const recommendations = scored
      .filter(r => r.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
    
    res.json({ recommendations });
  } catch (error) {
    console.error('AI recommendation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Complementary products endpoint
 */
app.post('/api/ai/complementary', async (req, res) => {
  try {
    const { product, availableProducts } = req.body;
    
    if (!product || !availableProducts) {
      return res.status(400).json({ error: 'Product and availableProducts are required' });
    }

    // Find products in same category or complementary categories
    const complementary = availableProducts
      .filter(p => p.id !== product.id)
      .map(p => {
        let score = 0;
        
        // Same category
        if (p.productType === product.productType) {
          score += 3;
        }
        
        // Complementary categories (e.g., shoes + socks, shirt + pants)
        const complementaryPairs = [
          ['shoes', 'socks'],
          ['shirt', 'pants'],
          ['dress', 'shoes'],
          ['bag', 'wallet'],
        ];
        
        complementaryPairs.forEach(([cat1, cat2]) => {
          if (
            (product.productType?.toLowerCase().includes(cat1) && p.productType?.toLowerCase().includes(cat2)) ||
            (product.productType?.toLowerCase().includes(cat2) && p.productType?.toLowerCase().includes(cat1))
          ) {
            score += 2;
          }
        });
        
        return {
          product: p,
          reason: `Pairs well with ${product.title}`,
          confidence: Math.min(score / 5, 1),
        };
      })
      .filter(r => r.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
    
    res.json({ recommendations: complementary });
  } catch (error) {
    console.error('Complementary products error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============== HEALTH CHECK ===============
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'Conversational Shopping Assistant (AOVBoost-style)',
    date: new Date().toISOString().split('T')[0],
    endpoints: {
      chat: 'POST /api/ai/chat',
      recommend: 'POST /api/ai/recommend',
      complementary: 'POST /api/ai/complementary',
    },
    claudeApiReady: !!process.env.CLAUDE_API_KEY,
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Conversational Shopping Assistant Backend',
    description: 'AOVBoost-style AI-powered shopping assistant for Shop Minis',
    endpoints: {
      chat: 'POST /api/ai/chat - Generate conversational responses',
      recommend: 'POST /api/ai/recommend - Get product recommendations',
      complementary: 'POST /api/ai/complementary - Get complementary products',
      health: 'GET /api/health - Health check',
    },
  });
});

// ==================== AI UPSELL ENDPOINT (From Ai-agent-main) ====================

/**
 * Enhanced AI Upsell endpoint with multiple AI service support
 * Transferred from Ai-agent-main Remix app
 */
app.post(`${agentUrl}/api/upsell`, async (req, res) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return res.status(204).set(corsHeaders).end();
  }

  try {
    const { cartItems, availableProducts } = req.body;

    if (!cartItems || !Array.isArray(cartItems)) {
      return res.status(400).json({ error: 'cartItems array is required' });
    }

    if (!availableProducts || !Array.isArray(availableProducts) || availableProducts.length === 0) {
      return res.status(400).json({ error: 'availableProducts array is required' });
    }

    // Filter out products already in cart
    const cartProductIds = new Set();
    const cartProductTitles = new Set();
    
    cartItems.forEach(item => {
      if (item.variant_id) cartProductIds.add(item.variant_id);
      if (item.id) cartProductIds.add(item.id);
      if (item.title) cartProductTitles.add(item.title.toLowerCase());
      if (item.product_title) cartProductTitles.add(item.product_title.toLowerCase());
    });

    const filteredProducts = availableProducts.filter(product => {
      if (cartProductIds.has(product.id)) return false;
      const productTitleLower = product.title?.toLowerCase() || '';
      return !Array.from(cartProductTitles).some(cartTitle => 
        productTitleLower.includes(cartTitle) || cartTitle.includes(productTitleLower)
      );
    });

    if (filteredProducts.length === 0) {
      return res.status(404).json({ error: 'No available products for upsell' });
    }

    // Prepare data for AI
    const cartContext = cartItems.map(item => ({
      title: item.title || item.product_title,
      quantity: item.quantity || 1,
      category: item.product_type || 'unknown',
      tags: item.tags || []
    }));

    const productContext = filteredProducts.map(p => ({
      id: p.id,
      title: p.title,
      price: p.price,
      image: p.image?.src || p.image || p.imageUrl,
      handle: p.handle || ''
    }));

    // Enhanced AI prompt with specific cross-sell instructions (from api.upsell.ts)
    const enhancedPrompt = `You are an expert sales consultant specializing in product recommendations and cross-selling.

CURRENT CART ANALYSIS:
${JSON.stringify(cartContext, null, 2)}

AVAILABLE PRODUCTS (NOT in cart):
${JSON.stringify(productContext, null, 2)}

CROSS-SELL MISSION:
Analyze the cart contents and suggest one product that creates maximum synergy and value. If there are multiple complementary options, pick one at random. Focus on:

🎯 COMPLEMENTARY RELATIONSHIPS:
- Products that enhance the main purchase (accessories, add-ons, related items)
- Items that solve additional problems the customer might have
- Products that complete a set, outfit, or solution
- Seasonal or occasion-based complements

🚫 STRICT EXCLUSIONS:
- Never suggest products already in the cart
- Avoid duplicate or very similar items
- Skip unrelated products that don't add clear value

💡 CROSS-SELL PSYCHOLOGY:
- Create urgency: "Perfect timing to add..."
- Show social proof: "90% of customers who bought X also get Y"
- Highlight value: "Complete your setup with..."
- Address pain points: "Don't forget the essential..."
- Create FOMO: "While you're here, grab this popular..."

🎨 SALES MESSAGE REQUIREMENTS:
- Start with a benefit-focused hook
- Explain WHY this product pairs perfectly
- Use emotional triggers (convenience, style, savings, completeness)
- Include a call-to-action phrase
- Sound like a knowledgeable store associate, not a robot

RESPONSE FORMAT (JSON only):
{
  "id": "exact_variant_id_from_available_products",
  "title": "exact_product_title",
  "price": "exact_price_from_data",
  "image": "exact_image_url",
  "message": "compelling_cross_sell_message_150_words_max",
  "reasoning": "brief_explanation_why_this_complements_cart"
}

EXAMPLE MESSAGE STYLES:
- "Since you're getting the [cart item], you'll definitely want the [cross-sell] - it's the missing piece that makes everything work perfectly together!"
- "Smart choice! 85% of our customers who buy [cart item] also grab the [cross-sell] because it solves the one problem everyone runs into..."
- "Perfect timing! The [cross-sell] is flying off our shelves and pairs incredibly well with your [cart item] - complete your setup now!"

Analyze the cart, find the best complementary product, and create a persuasive cross-sell message.`;

    // Try multiple AI services with enhanced fallback chain
    const services = [
      {
        name: 'gemini',
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        headers: { 'Content-Type': 'application/json' },
        body: {
          contents: [{ parts: [{ text: enhancedPrompt }] }],
          generationConfig: { 
            maxOutputTokens: 400,
            temperature: 0.3
          }
        }
      },
      {
        name: 'groq',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: {
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a professional sales consultant. Always respond with valid JSON only. No additional text or formatting.'
            },
            {
              role: 'user',
              content: enhancedPrompt
            }
          ],
          max_tokens: 400,
          temperature: 0.3
        }
      },
      {
        name: 'mistral',
        url: 'https://api.mistral.ai/v1/chat/completions',
        headers: {
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: {
          model: 'mistral-small-latest',
          messages: [
            {
              role: 'system',
              content: 'You are a professional sales consultant. Always respond with valid JSON only. No additional text or formatting.'
            },
            {
              role: 'user',
              content: enhancedPrompt
            }
          ],
          max_tokens: 400,
          temperature: 0.3,
          top_p: 1,
          stream: false
        }
      },
      {
        name: 'cohere',
        url: 'https://api.cohere.com/v1/chat',
        headers: {
          'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: {
          model: 'command-r-plus',
          message: enhancedPrompt,
          preamble: 'You are a professional sales consultant. Always respond with valid JSON only. No additional text or formatting.',
          max_tokens: 400,
          temperature: 0.3
        }
      },
      {
        name: 'together',
        url: 'https://api.together.xyz/v1/chat/completions',
        headers: {
          'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: {
          model: 'deepseek-ai/DeepSeek-V3',
          messages: [
            {
              role: 'system',
              content: 'You are a professional sales consultant. Always respond with valid JSON only. No additional text or formatting.'
            },
            {
              role: 'user',
              content: enhancedPrompt
            }
          ],
          max_tokens: 400,
          temperature: 0.3
        }
      },
      {
        name: 'claude',
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        body: {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 400,
          messages: [
            {
              role: 'user',
              content: enhancedPrompt
            }
          ]
        }
      }
    ];

    let aiSuggestion = null;

    // Try AI services with intelligent fallback
    for (const service of services) {
      // Check for API key (gemini uses GOOGLE_API_KEY, not GEMINI_API_KEY)
      const apiKeyEnv = service.name === 'gemini' ? 'GOOGLE_API_KEY' : 
                       service.name === 'claude' ? 'CLAUDE_API_KEY' :
                       `${service.name.toUpperCase()}_API_KEY`;
      
      if (!process.env[apiKeyEnv]) {
        continue; // Skip if API key not configured
      }

      try {
        console.log(`Attempting upsell with ${service.name}...`);
        
        const response = await fetch(service.url, {
          method: 'POST',
          headers: service.headers,
          body: JSON.stringify(service.body),
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          console.log(`${service.name} failed with status ${response.status}`);
          continue;
        }

        const data = await response.json();
        let aiResponse;

        // Parse different response formats
        if (service.name === 'groq' || service.name === 'claude' || service.name === 'mistral' || service.name === 'together') {
          aiResponse = data.choices?.[0]?.message?.content || data.content?.[0]?.text;
        } else if (service.name === 'gemini') {
          aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        } else if (service.name === 'cohere') {
          aiResponse = data.text;
        }

        if (aiResponse) {
          // Try to parse JSON from response
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const suggestion = JSON.parse(jsonMatch[0]);
            if (suggestion.id && suggestion.title && suggestion.message) {
              // Validate the product exists in our filtered list
              const matchedProduct = filteredProducts.find(p => p.id === suggestion.id || p.title === suggestion.title);
              if (matchedProduct) {
                aiSuggestion = {
                  ...suggestion,
                  image: suggestion.image || matchedProduct.image?.src || matchedProduct.image || matchedProduct.imageUrl,
                  price: suggestion.price || matchedProduct.price
                };
                console.log(`Upsell success with ${service.name}`);
                break;
              }
            }
          }
        }
      } catch (error) {
        console.log(`${service.name} error:`, error.message);
        continue;
      }
    }

    // Fallback to smart algorithm if AI fails
    if (!aiSuggestion) {
      console.log('All AI services failed, using fallback logic');
      aiSuggestion = generateFallbackUpsell(filteredProducts, cartItems);
    }

    if (!aiSuggestion) {
      return res.status(404).json({ error: 'No products available for upsell' });
    }

    return res.json({ suggestion: aiSuggestion });
  } catch (error) {
    console.error("Upsell generation error:", error);
    return res.status(500).json({ 
      error: 'Service temporarily unavailable',
      suggestion: null 
    });
  }
});

// Enhanced fallback upsell function
function generateFallbackUpsell(products, cartItems) {
  if (products.length === 0) return null;

  // Filter out products already in cart
  const cartProductIds = new Set();
  const cartProductTitles = new Set();
  
  cartItems.forEach(item => {
    if (item.variant_id) cartProductIds.add(item.variant_id);
    if (item.id) cartProductIds.add(item.id);
    if (item.title) cartProductTitles.add(item.title.toLowerCase());
    if (item.product_title) cartProductTitles.add(item.product_title.toLowerCase());
  });

  const availableProducts = products.filter(product => {
    if (cartProductIds.has(product.id)) return false;
    const productTitleLower = product.title?.toLowerCase() || '';
    return !Array.from(cartProductTitles).some(cartTitle => 
      productTitleLower.includes(cartTitle) || cartTitle.includes(productTitleLower)
    );
  });

  if (availableProducts.length === 0) return null;

  // Smart product selection
  const cartTotal = cartItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
  const targetPriceRange = cartTotal * 0.3;
  
  const priceMatches = availableProducts.filter(p => {
    const price = parseFloat(p.price) || 0;
    return price >= targetPriceRange * 0.5 && price <= targetPriceRange * 1.5;
  });
  
  const selectedProduct = priceMatches.length > 0 ? 
    priceMatches[Math.floor(Math.random() * priceMatches.length)] : 
    availableProducts[Math.floor(Math.random() * availableProducts.length)];

  const cartItemNames = cartItems.map(item => item.title || item.product_title);
  const primaryItem = cartItemNames[0] || 'your selection';

  const messageTemplates = [
    `Perfect timing! The ${selectedProduct.title} is the missing piece that completes your ${primaryItem} experience. Don't let this slip away!`,
    `Smart choice! Most customers who grab ${primaryItem} also pick up ${selectedProduct.title} - it's like they're made for each other.`,
    `Complete your setup with ${selectedProduct.title}! It pairs incredibly well with ${primaryItem} and you'll thank yourself later.`,
    `Since you're getting ${primaryItem}, you'll definitely want ${selectedProduct.title} - trust me, it makes all the difference!`
  ];

  return {
    id: selectedProduct.id,
    title: selectedProduct.title,
    price: selectedProduct.price,
    image: selectedProduct.image?.src || selectedProduct.image || selectedProduct.imageUrl,
    message: messageTemplates[Math.floor(Math.random() * messageTemplates.length)],
    reasoning: 'Fallback recommendation based on price compatibility and availability'
  };
}

// ==================== EVENT TRACKING ENDPOINT ====================

/**
 * Track upsell events for analytics
 */
app.post('/api/upsell/track', async (req, res) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return res.status(204).set(corsHeaders).end();
  }

  try {
    const { event, timestamp, data, shop } = req.body;

    if (!event || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields: event and timestamp' });
    }

    // In a real implementation, you'd store this in a database
    // For now, we'll just log it
    console.log('Event tracked:', {
      event,
      timestamp: new Date(timestamp),
      data,
      shop: shop || 'unknown'
    });

    // TODO: Store in database (Prisma, MongoDB, etc.)
    // await prisma.event.create({
    //   data: {
    //     event,
    //     timestamp: new Date(timestamp),
    //     data,
    //     storeId: shop
    //   }
    // });

    return res.json({ success: true });
  } catch (error) {
    console.error('Event tracking error:', error);
    return res.status(500).json({ error: 'Failed to track event' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Conversational Shopping Assistant Backend running on http://localhost:${PORT}`);
  console.log(`💬 AI Chat: POST /api/ai/chat`);
  console.log(`🎯 Recommendations: POST /api/ai/recommend`);
  console.log(`🛍️  Complementary: POST /api/ai/complementary`);
  console.log(`💰 Upsell: POST /api/upsell`);
  console.log(`📊 Event Tracking: POST /api/upsell/track`);
});