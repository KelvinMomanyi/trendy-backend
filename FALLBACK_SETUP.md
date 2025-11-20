# Hugging Face Fallback Setup

The backend now automatically falls back to Hugging Face when Google Vision API fails!

## How It Works

1. **Primary**: Tries Google Vision API first (if configured)
2. **Fallback**: If Google Vision fails or isn't configured, automatically uses Hugging Face
3. **Seamless**: Frontend doesn't need to know which provider was used

## Setup

### Step 1: Get Hugging Face API Key (Free!)

1. Go to https://huggingface.co/settings/tokens
2. Create a new token (read access is enough)
3. Copy the token (starts with `hf_`)

### Step 2: Add to Railway

1. Go to your Railway project
2. Navigate to **Variables** tab
3. Add new variable:
   - **Name**: `HUGGINGFACE_API_KEY`
   - **Value**: Your Hugging Face token (e.g., `hf_xxxxxxxxxxxxxxxxxxxxxxxxxx`)

### Step 3: Redeploy

Railway will auto-redeploy when you add the variable, or manually trigger a redeploy.

## How It Works

### Detection Flow

```
1. Request comes in → Extract image
2. Try Google Vision API
   ├─ Success → Return detections ✅
   └─ Fails → Continue to step 3
3. Try Hugging Face API
   ├─ Success → Return detections ✅
   └─ Fails → Return error ❌
```

### Response Format

The response includes which provider was used:

```json
{
  "detections": [
    {
      "id": "hf-0",
      "name": "handbag",
      "category": "bag",
      "confidence": 0.95,
      "boundingBox": { "x": 25, "y": 40, "width": 20, "height": 15 },
      "attributes": {
        "provider": "huggingface",
        "model": "detr-resnet-50"
      }
    }
  ],
  "provider": "huggingface",
  "count": 1
}
```

## Models Used

- **Google Vision**: Object localization + label detection
- **Hugging Face**: `facebook/detr-resnet-50` (80 COCO classes)

## Free Tier Limits

### Google Vision
- 1,000 requests/month (free tier)

### Hugging Face
- 30,000 requests/month (free tier)
- First request might be slow (model loading ~10 seconds)
- Subsequent requests are fast

## Benefits

✅ **Reliability**: If one service fails, the other takes over  
✅ **Cost-effective**: Hugging Face has generous free tier  
✅ **No code changes**: Works automatically  
✅ **Transparent**: Logs show which provider was used  

## Monitoring

Check Railway logs to see:
- `🔍 Attempting Google Vision API detection...`
- `✅ Google Vision detected X products` OR
- `⚠️ Google Vision API failed: ...`
- `🔄 Falling back to Hugging Face...`
- `✅ Hugging Face detected X products`

## Troubleshooting

### Hugging Face model loading

First request might take 10-15 seconds while the model loads. This is normal and only happens once.

### No detections from either service

- Check that at least one API key is configured
- Verify image format is supported (JPEG, PNG)
- Check Railway logs for specific error messages

### Both services failing

- Verify `GOOGLE_CLOUD_CREDENTIALS` is set correctly
- Verify `HUGGINGFACE_API_KEY` is set correctly
- Check Railway logs for authentication errors

