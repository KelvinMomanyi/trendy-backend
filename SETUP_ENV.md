# Environment Variables Setup

Create a `.env` file in the `backend` directory with the following variables:

```env
# Google Cloud Vision API Configuration
# 
# Option 1: Use service account key file (recommended for local development)
# Download your service account JSON key from Google Cloud Console
# and place it in the backend directory, then set the path here:
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json

# Option 2: Use service account JSON as environment variable (for cloud deployments)
# Paste the entire JSON content of your service account key here:
# GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}

# Server Configuration
PORT=3000

# CORS Configuration (optional)
# CORS_ORIGIN=http://localhost:5173
```

## Quick Setup

1. Copy this content to a new file named `.env` in the `backend` directory
2. Set `GOOGLE_APPLICATION_CREDENTIALS` to the path of your service account JSON file
3. Make sure your service account JSON file is in the backend directory

