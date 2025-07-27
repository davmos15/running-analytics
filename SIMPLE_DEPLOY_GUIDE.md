# 🚀 Simple Deployment Guide

## Option 1: Manual Steps (Recommended for First Time)

### 1️⃣ Open Terminal in Project Directory
```bash
cd /home/davmosk/projects/strava-analysis
```

### 2️⃣ Login to Firebase
Run this command - it will open your browser:
```bash
firebase login
```
- Click "Allow" when prompted
- Use your Google account

### 3️⃣ Create a Firebase Project
1. Go to https://console.firebase.google.com/
2. Click "Create a project"
3. Name it: `strava-analytics` (or any name you like)
4. Disable Google Analytics (not needed)
5. Click "Create Project"

### 4️⃣ Initialize Firebase in Your Project
Run this command and follow the prompts:
```bash
firebase init
```

When prompted:
- Use arrow keys to move, SPACE to select, ENTER to confirm
- Select: `Hosting: Configure files for Firebase Hosting`
- Choose: `Use an existing project`
- Select: The project you just created
- Public directory: Type `build` and press ENTER
- Single-page app: Type `y` and press ENTER
- Automatic builds with GitHub: Type `n` and press ENTER
- Overwrite index.html: Type `n` and press ENTER

### 5️⃣ Install Dependencies
```bash
npm install
npm install -D tailwindcss postcss autoprefixer
```

### 6️⃣ Build Your App
```bash
npm run build
```

### 7️⃣ Deploy to Firebase
```bash
firebase deploy
```

### 8️⃣ Your App is Live! 🎉
After deployment, you'll see:
```
Hosting URL: https://your-project-name.web.app
```
This is your app's URL - accessible from anywhere!

---

## Option 2: Use the Automated Script

Just run:
```bash
./deploy.sh
```

This will guide you through all the steps automatically.

---

## 📱 After Deployment

### Update Strava Settings:
1. Go to https://developers.strava.com/
2. Click on your app
3. Update the "Authorization Callback Domain" to:
   - `your-project-name.web.app` (without https://)

### Set Environment Variables in Firebase:
Since Firebase Hosting only serves static files, for production you'll need to:
1. Use Firebase Functions for API calls, OR
2. Set up a backend service, OR
3. Use the Strava API directly from the frontend (current approach)

⚠️ **Important**: The current setup exposes your API keys in the frontend. For production, consider setting up Firebase Functions to hide your secrets.

---

## 🆘 Troubleshooting

### "Command not found: firebase"
```bash
npm install -g firebase-tools
```

### "Error: Failed to get Firebase project"
Make sure you're logged in:
```bash
firebase login
```

### Build Errors
Clear cache and reinstall:
```bash
rm -rf node_modules
npm install
```

### Can't access from mobile
- Make sure you're using the Firebase hosting URL (not localhost)
- Check that your phone has internet connection
- The URL should be: https://your-project-name.web.app