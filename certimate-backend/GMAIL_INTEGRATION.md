# Gmail API Email Integration

## 📧 Overview

The CertiMate backend now supports sending certificates via email using Google's Gmail API. This integration allows you to send personalized certificates directly to recipients with attachments.

## ✨ Features

- ✅ OAuth 2.0 authentication with Google
- ✅ Batch email sending to multiple recipients
- ✅ Automatic certificate file attachment
- ✅ Personalized email messages with `{{name}}` placeholders
- ✅ Async/await support for non-blocking operations
- ✅ Comprehensive error handling and logging
- ✅ Production-ready code with proper validation

---

## 🛠️ Installation

### 1. Install Dependencies

```bash
cd certimate-backend
pip install -r requirements.txt
```

The following packages are now included:
- `google-auth>=2.23.0`
- `google-auth-oauthlib>=1.1.0`
- `google-api-python-client>=2.100.0`

### 2. Configure Environment Variables

Create or update your `.env` file in the `certimate-backend` directory:

```env
# Gmail API Configuration (optional, mainly for development)
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

**Note:** In production, the OAuth access token is passed from the frontend, so these variables are optional.

---

## 📡 API Endpoints

### 1. Send Certificates via Email

**Endpoint:** `POST /api/send/email`

**Request Body:**
```json
{
  "access_token": "ya29.a0AfB_by...",
  "recipients": [
    {
      "email": "john.doe@example.com",
      "name": "John Doe",
      "certificate_filename": "certificate_1_John_Doe.png"
    },
    {
      "email": "jane.smith@example.com",
      "name": "Jane Smith",
      "certificate_filename": "certificate_2_Jane_Smith.png"
    }
  ],
  "subject": "Your Certificate is Ready!",
  "body_template": "Hi {{name}},\n\nCongratulations! Your certificate is attached.\n\nBest regards,\nCertiMate",
  "certificates_dir": "uploads/certificates"
}
```

**Response (Success):**
```json
{
  "message": "Sent certificates to 2/2 recipients",
  "total": 2,
  "successful": 2,
  "failed": 0,
  "success_rate": 100.0,
  "details": [
    {
      "success": true,
      "recipient_email": "john.doe@example.com",
      "recipient_name": "John Doe",
      "message_id": "abc123...",
      "certificate_path": "uploads/certificates/certificate_1_John_Doe.png"
    },
    {
      "success": true,
      "recipient_email": "jane.smith@example.com",
      "recipient_name": "Jane Smith",
      "message_id": "def456...",
      "certificate_path": "uploads/certificates/certificate_2_Jane_Smith.png"
    }
  ]
}
```

**Response (Partial Success):**
- Status Code: `207 Multi-Status` if some emails failed
- Status Code: `200 OK` if all emails succeeded

---

### 2. Test Gmail API Connection

**Endpoint:** `POST /api/send/email/test`

**Request Body:**
```json
{
  "access_token": "ya29.a0AfB_by...",
  "test_email": "your.email@gmail.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Gmail API authentication successful",
  "authenticated_email": "your.email@gmail.com"
}
```

---

### 3. Health Check

**Endpoint:** `GET /api/send/health`

**Response:**
```json
{
  "status": "healthy",
  "service": "Email Send Service",
  "gmail_api_configured": true,
  "features": [
    "Gmail API integration",
    "OAuth 2.0 authentication",
    "Batch email sending",
    "Attachment support"
  ]
}
```

---

## 🔑 Getting OAuth Access Token (Frontend)

Your frontend needs to get an OAuth 2.0 access token from Google. Here's how:

### Frontend Flow

1. **Sign in with Google** using `@react-oauth/google` or similar
2. **Get access token** from the Google OAuth response
3. **Include `gmail.send` scope** in your OAuth request:

```typescript
// Example with @react-oauth/google
const googleLogin = useGoogleLogin({
  onSuccess: (codeResponse) => {
    // codeResponse.access_token is what you need
    console.log("Access token:", codeResponse.access_token);
  },
  flow: 'implicit', // or 'code' for backend flow
  scope: 'https://www.googleapis.com/auth/gmail.send',
});
```

4. **Send to backend** with the certificates data:

```typescript
const response = await fetch('http://localhost:8000/api/send/email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    access_token: codeResponse.access_token,
    recipients: [
      { email: 'user@example.com', name: 'User Name' }
    ]
  })
});
```

---

## 📁 File Structure

```
certimate-backend/
├── app/
│   ├── services/
│   │   └── email_service.py      # Gmail API service logic
│   ├── routes/
│   │   └── send.py                # Email sending endpoints
│   ├── config.py                  # Updated with Gmail settings
│   └── main.py                     # Updated with send route
├── requirements.txt               # Updated with Google libraries
└── GMAIL_INTEGRATION.md           # This file
```

---

## 🔧 How It Works

### Email Service (`email_service.py`)

**Key Functions:**
- `build_gmail_service()` - Authenticates with Gmail API using OAuth token
- `create_message_with_attachment()` - Creates MIME message with certificate attachment
- `send_message()` - Sends email via Gmail API
- `send_certificate_email()` - High-level function to send a single certificate
- `send_certificates_batch()` - Sends multiple certificates in one call

**Features:**
- ✅ Async/await support for non-blocking operations
- ✅ Automatic attachment handling
- ✅ Personalization with `{{name}}` placeholders
- ✅ Comprehensive error handling
- ✅ File existence validation

### Send Route (`routes/send.py`)

**Key Functions:**
- `POST /api/send/email` - Main endpoint for sending certificates
- `POST /api/send/email/test` - Test Gmail API authentication
- `GET /api/send/health` - Health check for email service

**Request Validation:**
- Validates OAuth access token
- Validates recipient emails (EmailStr)
- Validates certificate files exist
- Returns detailed success/failure for each recipient

---

## 📝 Usage Example

### Python Example

```python
import asyncio
from app.services.email_service import EmailService

async def send_certificates():
    access_token = "ya29.a0AfB_by..."
    recipients = [
        {
            'email': 'john@example.com',
            'name': 'John Doe',
            'certificate_filename': 'certificate_1_John_Doe.png'
        }
    ]
    
    results = await EmailService.send_certificates_batch(
        access_token=access_token,
        recipients=recipients,
        certificates_dir='uploads/certificates'
    )
    
    print(f"Sent {results['successful']}/{results['total']} certificates")

# Run
asyncio.run(send_certificates())
```

---

## 🚨 Error Handling

The service handles various error scenarios:

1. **Invalid OAuth Token**: Returns authentication error
2. **Certificate File Not Found**: Logs error and marks recipient as failed
3. **Gmail API Errors**: Returns detailed error message
4. **Network Issues**: Retries with exponential backoff (can be added)

### Error Response Example

```json
{
  "total": 2,
  "successful": 1,
  "failed": 1,
  "details": [
    {
      "success": true,
      "recipient_email": "john@example.com",
      "message_id": "abc123"
    },
    {
      "success": false,
      "recipient_email": "jane@example.com",
      "error": "Certificate file not found"
    }
  ]
}
```

---

## 🔒 Security Considerations

1. **OAuth Token Handling**
   - Tokens are passed from frontend (not stored in backend)
   - Tokens expire after 1 hour (need refresh token for production)
   - Use HTTPS in production

2. **File Validation**
   - Checks file existence before sending
   - Sanitizes filenames to prevent path traversal
   - Only sends files from `uploads/certificates/` directory

3. **Rate Limiting**
   - Gmail API has quotas (see Google Cloud Console)
   - Consider adding rate limiting for production use

---

## 📊 Limits & Quotas

### Gmail API Quotas

- **Daily sending limit**: 2,000 emails/day (free tier)
- **Rate limit**: 1,000 requests/100 seconds per user
- **Message size**: 25MB max (including attachments)

### Recommendations

- Batch send in chunks of 100 recipients
- Add retry logic for rate limit errors
- Monitor quota usage in Google Cloud Console

---

## 🧪 Testing

### Test the Integration

1. **Start the backend:**
```bash
cd certimate-backend
./start.sh
```

2. **Test health check:**
```bash
curl http://localhost:8000/api/send/health
```

3. **Test authentication (requires valid token):**
```bash
curl -X POST http://localhost:8000/api/send/email/test \
  -H "Content-Type: application/json" \
  -d '{"access_token": "YOUR_TOKEN", "test_email": "test@gmail.com"}'
```

---

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to authenticate with Gmail"**
   - Check OAuth token is valid
   - Verify token has `gmail.send` scope
   - Token might be expired (get new one)

2. **"Certificate file not found"**
   - Check file exists in `uploads/certificates/` directory
   - Verify filename spelling matches exactly
   - Check file permissions

3. **"Rate limit exceeded"**
   - Reduce batch size
   - Add delays between sends
   - Wait for quota reset

---

## 📚 Additional Resources

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [FastAPI Documentation](https://fastapi.tiangolo.com)

---

## ✅ Next Steps

1. ✅ Install dependencies: `pip install -r requirements.txt`
2. ✅ Get OAuth token from frontend Google Sign-In
3. ✅ Call `/api/send/email` endpoint with recipients
4. 🚀 Send your first certificates via email!

---

**Made with ❤️ for CertiMate**

