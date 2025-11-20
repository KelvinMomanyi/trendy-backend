# Railway Deployment - Google Cloud Credentials Setup

## Problem
The error shows: `"No credential environment variables found"` and `"availableVars":[]`

This means the `GOOGLE_CLOUD_CREDENTIALS` environment variable is **not set** in Railway.

## Solution: Set GOOGLE_CLOUD_CREDENTIALS in Railway

### Step 1: Get Your Service Account JSON

You have the file `backend/service-account-key.json`. You need to convert it to a single-line string.

### Step 2: Format the JSON for Railway

The JSON must be:
- **On a single line** (no actual line breaks)
- **Escape special characters** properly
- **Keep `\n` in the private_key** (don't convert to actual newlines)

### Step 3: Set the Environment Variable in Railway

1. Go to your Railway project: https://railway.app
2. Select your backend service
3. Go to **Variables** tab
4. Click **+ New Variable**
5. Set:
   - **Name**: `GOOGLE_CLOUD_CREDENTIALS`
   - **Value**: Paste the single-line JSON (see below for how to create it)

### Step 4: Create Single-Line JSON

**Option A: Using PowerShell (Windows)**

```powershell
# In the backend directory
$json = Get-Content service-account-key.json -Raw | ConvertFrom-Json | ConvertTo-Json -Compress
$json | Out-File -FilePath railway-credentials.txt -Encoding utf8
# Then copy the contents of railway-credentials.txt to Railway
```

**Option B: Using Node.js**

Create a file `format-credentials.js`:

```javascript
const fs = require('fs');
const json = JSON.parse(fs.readFileSync('service-account-key.json', 'utf8'));
const singleLine = JSON.stringify(json);
console.log(singleLine);
```

Run: `node format-credentials.js` and copy the output to Railway.

**Option C: Manual (if JSON is small)**

1. Open `service-account-key.json`
2. Copy all content
3. Remove all actual line breaks (make it one line)
4. Keep `\n` in the private_key (don't remove them)
5. Paste into Railway

### Step 5: Verify the Format

The JSON should look like this (all on one line):

```json
{"type":"service_account","project_id":"poised-list-467716-h2","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"...","universe_domain":"googleapis.com"}
```

**Important**: 
- The `private_key` should have `\\n` (escaped newlines), not actual newlines
- Everything should be on one line
- No trailing commas
- Valid JSON

### Step 6: Redeploy

After setting the variable:
1. Railway will auto-redeploy, OR
2. Manually trigger a redeploy from the Railway dashboard

### Step 7: Verify It Works

1. Check Railway logs - you should see:
   ```
   🔍 Checking for Google Cloud credentials...
      GOOGLE_CLOUD_CREDENTIALS: SET (length: XXXX)
   ✅ Credentials parsed successfully
   ```

2. Test the endpoint:
   ```
   https://trendy-backend-production.up.railway.app/test-auth
   ```

   Should return:
   ```json
   {
     "hasCredentials": true,
     "visionClientInitialized": true,
     "serviceAccount": "your-service-account@...",
     "projectId": "poised-list-467716-h2"
   }
   ```

## Troubleshooting

### Still getting "No credential environment variables found"?

1. **Check variable name**: Must be exactly `GOOGLE_CLOUD_CREDENTIALS` (case-sensitive)
2. **Check if variable is set**: Look in Railway Variables tab
3. **Redeploy**: Variables only load on deploy/restart
4. **Check logs**: Look for the debug messages at startup

### Getting JSON parse errors?

1. **Check for line breaks**: JSON must be on one line
2. **Check for escaped quotes**: All quotes inside strings must be escaped
3. **Validate JSON**: Use a JSON validator before pasting

### Getting authentication errors after setting variable?

1. **Check private_key format**: Should have `\\n` not actual newlines
2. **Verify service account has Vision API access**
3. **Check Vision API is enabled** in Google Cloud Console

