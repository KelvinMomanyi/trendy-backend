# Conversational Shopping Assistant Backend

Backend API server for the AOVBoost-style conversational shopping assistant Shop Mini.

## Features

- ✅ AI-powered conversational responses (Claude API or fallback)
- ✅ Intelligent product recommendations based on conversation
- ✅ Complementary product suggestions for upselling
- ✅ CORS enabled for frontend access
- ✅ Health check endpoint

## Prerequisites

1. **Node.js** 18+ installed
2. **Claude API Key** (optional, for enhanced AI responses)

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Create a `.env` file in the `backend` directory:

```env
PORT=3000
CLAUDE_API_KEY=your_claude_api_key_optional
HUGGINGFACE_API_KEY=optional_for_future_features
```

### 3. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

## API Endpoints

### POST `/api/ai/chat`

Generates conversational responses.

**Request:**
```json
{
  "message": "I'm looking for running shoes",
  "conversationHistory": [...],
  "currentProducts": []
}
```

**Response:**
```json
{
  "response": "I'd be happy to help you find running shoes!"
}
```

### POST `/api/ai/recommend`

Gets product recommendations based on conversation.

**Request:**
```json
{
  "message": "running shoes",
  "availableProducts": [...],
  "userPreferences": {}
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "product": {...},
      "reason": "Matches your search",
      "confidence": 0.85
    }
  ]
}
```

### POST `/api/ai/complementary`

Gets complementary products for upselling.

**Request:**
```json
{
  "product": {...},
  "availableProducts": [...]
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "product": {...},
      "reason": "Pairs well with...",
      "confidence": 0.75
    }
  ]
}
```

### POST `/api/upsell` (NEW - From Ai-agent-main)

AI-powered upsell suggestions based on cart items. Supports multiple AI services (Gemini, Groq, Claude) with intelligent fallback.

**Request:**
```json
{
  "cartItems": [
    {
      "id": "variant-123",
      "variant_id": "variant-123",
      "title": "Product Name",
      "price": "29.99",
      "quantity": 1
    }
  ],
  "availableProducts": [
    {
      "id": "variant-456",
      "title": "Upsell Product",
      "price": "19.99",
      "image": "https://...",
      "handle": "upsell-product"
    }
  ]
}
```

**Response:**
```json
{
  "suggestion": {
    "id": "variant-456",
    "title": "Upsell Product",
    "price": "19.99",
    "image": "https://...",
    "message": "Perfect timing! This product complements your cart perfectly...",
    "reasoning": "AI analysis shows high compatibility"
  }
}
```

**Environment Variables:**
- `GOOGLE_API_KEY` - For Gemini AI
- `GROQ_API_KEY` - For Groq AI (Llama models)
- `CLAUDE_API_KEY` - For Claude AI

### POST `/api/upsell/track` (NEW - From Ai-agent-main)

Tracks upsell events for analytics.

**Request:**
```json
{
  "event": "upsell_impression" | "upsell_add_to_cart" | "conversion",
  "timestamp": "2025-01-21T10:00:00Z",
  "data": {
    "id": "variant-123",
    "title": "Product Name",
    "price": "29.99"
  },
  "shop": "your-shop.myshopify.com"
}
```

**Response:**
```json
{
  "success": true
}
```

### GET `/api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "OK",
  "app": "Conversational Shopping Assistant",
  "endpoints": {...}
}
```

## Testing

Test the API using curl:

```bash
# Health check
curl http://localhost:3000/api/health

# Chat endpoint
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

## Deployment

The backend can be deployed to:
- Railway
- Vercel (serverless functions)
- Heroku
- Any Node.js hosting platform

Make sure to set environment variables in your hosting platform's dashboard.

## License

MIT
