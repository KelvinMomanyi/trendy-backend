# Shop Mini Backend API

Backend server for Shop Mini that handles Google Cloud Vision API calls with OAuth2 authentication.

## Features

- ✅ Google Cloud Vision API integration with OAuth2 (service account)
- ✅ Product detection with bounding boxes
- ✅ CORS enabled for frontend access
- ✅ Health check endpoint
- ✅ Error handling and helpful error messages

## Prerequisites

1. **Google Cloud Project** with Vision API enabled
2. **Service Account** with Vision API permissions
3. **Node.js** 18+ installed

## Setup Instructions

### 1. Create Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Cloud Vision API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Cloud Vision API"
   - Click "Enable"

4. Create a Service Account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Give it a name (e.g., "vision-api-service")
   - Grant it the role: **"Cloud Vision API User"**
   - Click "Done"

5. Create a Key:
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Download the JSON file
   - **Save it as `service-account-key.json` in the `backend` directory**

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set the path to your service account key:

```env
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
PORT=3000
```

### 4. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000`

### 5. Test the Server

**Health check:**
```bash
curl http://localhost:3000/api/health
```

**Product detection (example):**
```bash
curl -X POST http://localhost:3000/api/detect-products \
  -H "Content-Type: application/json" \
  -d '{"image":"data:image/jpeg;base64,/9j/4AAQSkZJRg..."}'
```

## Frontend Configuration

In your frontend `.env` file, set:

```env
VITE_BACKEND_URL=http://localhost:3000
VITE_RECOGNITION_PROVIDER=backend
```

Or for production:

```env
VITE_BACKEND_URL=https://trendy-backend-production.up.railway.app
VITE_RECOGNITION_PROVIDER=backend
```

## Deployment Options

### Option 1: Deploy to Vercel (Serverless Functions)

1. Create `vercel.json` in the backend directory:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

2. Set environment variables in Vercel dashboard:
   - `GOOGLE_SERVICE_ACCOUNT_JSON` = (paste entire JSON content)
   - `PORT` = 3000 (optional)

3. Deploy:
```bash
vercel
```

### Option 2: Deploy to Railway/Render/Heroku

1. Set environment variables:
   - `GOOGLE_SERVICE_ACCOUNT_JSON` = (paste entire JSON content)
   - `PORT` = (auto-set by platform)

2. Deploy your code

### Option 3: Deploy to Google Cloud Run

1. Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

2. Build and deploy:
```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/shopmini-backend
gcloud run deploy shopmini-backend --image gcr.io/YOUR_PROJECT_ID/shopmini-backend
```

## API Endpoints

### POST `/api/detect-products`

Detects products in an uploaded image.

**Request:**
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "detections": [
    {
      "id": "gv-obj-0",
      "name": "Watch",
      "category": "watch",
      "confidence": 0.94,
      "boundingBox": {
        "x": 25,
        "y": 40,
        "width": 20,
        "height": 15
      },
      "attributes": {}
    }
  ]
}
```

### GET `/api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "visionApiConfigured": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Troubleshooting

### Error: "API keys are not supported"
- **Solution**: Make sure you're using a service account JSON key, not an API key
- Set `GOOGLE_APPLICATION_CREDENTIALS` to point to your service account JSON file

### Error: "Permission denied"
- **Solution**: Make sure your service account has the "Cloud Vision API User" role
- Check that the Vision API is enabled in your Google Cloud project

### Error: "Cannot find module '@google-cloud/vision'"
- **Solution**: Run `npm install` in the backend directory

### CORS errors
- **Solution**: The server has CORS enabled by default. If you need to restrict origins, modify the CORS configuration in `server.js`

## Security Notes

- ⚠️ **Never commit** your `service-account-key.json` file to version control
- ⚠️ Add `service-account-key.json` to `.gitignore`
- ✅ Use environment variables for cloud deployments
- ✅ Restrict service account permissions to only what's needed

## License

MIT

