# Quick Start Guide

Get your backend server running in 5 minutes!

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

## Step 2: Get Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable **Cloud Vision API** (APIs & Services > Library)
4. Create a **Service Account** (APIs & Services > Credentials)
   - Name: "vision-api-service"
   - Role: **"Cloud Vision API User"**
5. Create a **JSON key** for the service account
6. Download and save as `service-account-key.json` in the `backend` folder

## Step 3: Configure Environment

Create a `.env` file in the `backend` directory:

```env
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
PORT=3000
```

## Step 4: Start Server

```bash
npm start
```

You should see:
```
✅ Google Vision API initialized with service account credentials
🚀 Backend server running on http://localhost:3000
```

## Step 5: Configure Frontend

In your frontend `.env` file (in the `trendy` directory):

```env
VITE_BACKEND_URL=http://localhost:3000
VITE_RECOGNITION_PROVIDER=backend
```

## Step 6: Test

1. Start your frontend: `npm start` (in the `trendy` directory)
2. Upload an image
3. Products should be detected! 🎉

## Troubleshooting

**Error: "API keys are not supported"**
- ✅ You're using a service account JSON (correct!)
- ❌ You're using an API key (wrong - won't work)

**Error: "Permission denied"**
- Check that your service account has "Cloud Vision API User" role
- Verify Vision API is enabled in your project

**Error: "Cannot find module"**
- Run `npm install` in the backend directory

## Next Steps

- See `README.md` for detailed documentation
- See `SETUP_ENV.md` for environment variable options
- Deploy to Vercel/Railway/Render for production (see `README.md`)

