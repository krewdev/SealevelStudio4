# API Keys Setup Guide

## Required API Keys

To use the AI features in Sealevel Studio, you need to set up the following API keys:

### 1. OpenAI API Key (for Service Bot)
- **Used for**: AI Service Bot chat functionality
- **Get it from**: https://platform.openai.com/api-keys
- **Environment variable**: `OPENAI_API_KEY`
- **Required for**: Service Bot feature

### 2. Gemini API Key (for Cybersecurity Finder)
- **Used for**: Code security analysis (Blue Team, Red Team, Secure Coder)
- **Get it from**: https://ai.google.dev/
- **Environment variable**: `GEMINI_API_KEY`
- **Required for**: Cybersecurity Finder feature

## Setup Instructions

### Local Development

1. Create a `.env.local` file in the root directory (if it doesn't exist):
   ```bash
   cp env.template .env.local
   ```

2. Add your API keys to `.env.local`:
   ```env
   # OpenAI API Key (for Service Bot)
   OPENAI_API_KEY=sk-your-openai-api-key-here
   
   # Gemini API Key (for Cybersecurity Finder)
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

### Vercel Deployment

1. Go to your Vercel project: https://vercel.com/dashboard
2. Navigate to: **Project Settings** → **Environment Variables**
3. Add the following variables:

   **For Production:**
   - `OPENAI_API_KEY` = `sk-your-openai-api-key-here`
   - `GEMINI_API_KEY` = `your-gemini-api-key-here`

   **For Preview/Development (optional):**
   - Add the same variables if you want them in preview deployments

4. Redeploy your application:
   ```bash
   vercel --prod
   ```
   Or trigger a new deployment from the Vercel dashboard

## Getting API Keys

### OpenAI API Key
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to API Keys: https://platform.openai.com/api-keys
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)
6. **Important**: Save it immediately - you won't be able to see it again!

### Gemini API Key
1. Go to https://ai.google.dev/
2. Sign in with your Google account
3. Click "Get API Key" in the left sidebar
4. Create a new API key or use an existing one
5. Copy the key
6. Enable the Gemini API in Google Cloud Console if needed

## Verification

After setting up the keys:

1. **Service Bot**: Navigate to the Service Bot feature and try sending a message. If the key is set correctly, you'll get AI responses.

2. **Cybersecurity Finder**: Navigate to the Cybersecurity Finder and try analyzing some code. If the key is set correctly, you'll get security analysis results.

## Troubleshooting

### Error: "OpenAI API key not configured"
- Check that `OPENAI_API_KEY` is set in `.env.local` (local) or Vercel environment variables (production)
- Make sure you restarted the dev server after adding the key
- Verify the key starts with `sk-` and is valid

### Error: "Gemini API key not configured"
- Check that `GEMINI_API_KEY` is set in `.env.local` (local) or Vercel environment variables (production)
- Make sure you restarted the dev server after adding the key
- Verify the key is valid and the Gemini API is enabled in Google Cloud Console

### Keys work locally but not in production
- Make sure you added the keys to Vercel environment variables
- Check that you selected the correct environment (Production, Preview, or Development)
- Redeploy after adding the variables

## Security Notes

⚠️ **Important Security Guidelines:**
- Never commit `.env.local` to git
- Never share your API keys publicly
- Use different keys for development and production
- Rotate keys regularly
- Monitor API usage to detect unauthorized access
- Set usage limits in OpenAI/Gemini dashboards

## Cost Considerations

- **OpenAI**: Pay-as-you-go pricing. GPT-4o-mini is very affordable (~$0.15 per 1M input tokens)
- **Gemini**: Free tier available with generous limits. Check current pricing at https://ai.google.dev/pricing

Both services offer free credits for new users to get started!

