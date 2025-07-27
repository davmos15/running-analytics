# Security Guide - IMPORTANT!

## 🔒 Keeping Your App Secure

### Never Commit Sensitive Data
The `.env` file contains your secret keys and should NEVER be committed to GitHub.

### What's Safe to Share:
- ✅ Client ID (169705) - This is public
- ✅ Your app structure and code
- ✅ `.env.example` file (with placeholder values)

### What Must Stay Secret:
- ❌ Client Secret
- ❌ Access Tokens
- ❌ Refresh Tokens
- ❌ Firebase API Keys
- ❌ Any file named `.env`

### For Public GitHub Repository:
1. The `.gitignore` file already excludes `.env`
2. Never paste credentials in commit messages or code
3. Use environment variables for all sensitive data

### For Online/Mobile Access:
Your app will be accessible from anywhere once deployed to Firebase:
- Desktop: https://your-app.web.app
- Mobile: Same URL (responsive design)
- No need to run locally once deployed

### Deployment Security:
1. Set environment variables in your hosting platform
2. Use Firebase security rules to protect data
3. Enable HTTPS (automatic with Firebase Hosting)

### If Credentials Are Exposed:
1. Immediately regenerate them in Strava/Firebase console
2. Update your `.env` file
3. Redeploy your application
4. Check if anyone accessed your data

Remember: Anyone with your Client Secret can impersonate your app!