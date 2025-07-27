# 🚀 Quick Start Deployment Instructions

Since we can't run interactive commands here, you'll need to run these commands in your terminal.

## Step 1: Open Your Terminal

Open a new terminal window and navigate to your project:
```bash
cd /home/davmosk/projects/strava-analysis
```

## Step 2: Run These Commands (Copy & Paste)

### Command 1 - Login to Firebase:
```bash
firebase login
```
- This opens your browser
- Login with your Google account
- Click "Allow" when prompted

### Command 2 - Install Dependencies:
```bash
npm install --legacy-peer-deps && npm install -D tailwindcss postcss autoprefixer
```
- This installs all required packages
- May take 2-3 minutes

### Command 3 - Initialize Firebase:
```bash
firebase init hosting
```
When prompted:
- **Existing project?** → Select "Use an existing project" (or create new)
- **Project?** → Select your Firebase project
- **Public directory?** → Type: `build`
- **Single-page app?** → Type: `y`
- **Set up automatic builds?** → Type: `n`  
- **Overwrite index.html?** → Type: `n`

### Command 4 - Build Your App:
```bash
npm run build
```
- Creates optimized production build
- Takes about 1 minute

### Command 5 - Deploy:
```bash
firebase deploy
```
- Uploads your app to Firebase
- Shows your live URL when complete!

## 🎉 That's It!

Your app will be live at:
```
https://[your-project-name].web.app
```

You can access this URL from:
- ✅ Your computer
- ✅ Your phone
- ✅ Any device with internet

## ⚠️ Don't Forget:

1. **Update Strava Redirect URI**:
   - Go to: https://developers.strava.com/
   - Update callback domain to your Firebase URL

2. **Regenerate Your Strava Secret**:
   - Since it was exposed earlier
   - Update it in your `.env` file

## Need Help?

If you get stuck on any step, the error messages usually tell you what's wrong. Common issues:

- **"Command not found: firebase"** → Run: `npm install -g firebase-tools`
- **"No Firebase project"** → Create one at https://console.firebase.google.com/
- **Build errors** → Make sure `.env` file exists with your keys

---

**Want me to be there when you do this?** Just copy each command above and paste it in your terminal. I'll be here if you run into any issues!