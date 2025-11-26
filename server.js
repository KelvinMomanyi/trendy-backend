



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
app.post('sdfs/api/upsell', async (req, res) => {
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
    console.log('Recommendation request:', { message, userPreferences, availableProducts: availableProducts?.length });
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
app.post('/api/upsell', async (req, res) => {
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