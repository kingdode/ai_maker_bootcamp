# Google OAuth Setup for DealStackr Admin

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Give it a name like "DealStackr"

## Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in the required fields:
   - App name: `DealStackr`
   - User support email: Your email
   - Developer contact: Your email
4. Click **Save and Continue**
5. Skip Scopes (we only need email/profile which are default)
6. Add your email as a test user
7. Complete the setup

## Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Name it: `DealStackr Web`
5. Add Authorized redirect URIs:
   - For local: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://your-railway-domain.up.railway.app/api/auth/callback/google`
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

## Step 4: Set Environment Variables

### For Local Development

Create a `.env.local` file in the `dealstackr-web` folder:

```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Your admin email (only this email can access /admin)
ADMIN_EMAIL=your-email@gmail.com
```

Generate a secret with:
```bash
openssl rand -base64 32
```

### For Railway

In Railway dashboard, go to your service → **Variables** and add:

| Variable | Value |
|----------|-------|
| `NEXTAUTH_URL` | `https://your-app.up.railway.app` |
| `NEXTAUTH_SECRET` | (generate with openssl) |
| `GOOGLE_CLIENT_ID` | (from Google Console) |
| `GOOGLE_CLIENT_SECRET` | (from Google Console) |
| `ADMIN_EMAIL` | your-email@gmail.com |

## Step 5: Update Authorized Redirect URI

After you get your Railway URL, go back to Google Cloud Console and add the production callback URL:

```
https://your-railway-domain.up.railway.app/api/auth/callback/google
```

## How It Works

1. When you visit `/admin`, you'll be redirected to `/admin/login`
2. Click "Continue with Google" to sign in
3. Only the email in `ADMIN_EMAIL` can access the admin panel
4. Other users will see "Access denied"

## Troubleshooting

### "Access denied" error
- Make sure your Google email matches exactly what's in `ADMIN_EMAIL`
- Check that the environment variable is set correctly

### "Error occurred during sign in"
- Verify your Google OAuth credentials are correct
- Check that the redirect URI matches exactly
- Make sure `NEXTAUTH_SECRET` is set

### Redirect loop
- Clear your browser cookies for the site
- Make sure `NEXTAUTH_URL` matches your actual URL
