#!/bin/bash

echo "🚀 Strava Analytics Deployment Script"
echo "===================================="
echo ""

# Step 1: Check if logged in to Firebase
echo "Step 1: Checking Firebase login status..."
if firebase projects:list &> /dev/null; then
    echo "✅ Already logged in to Firebase"
else
    echo "❌ Not logged in to Firebase"
    echo "Please run: firebase login"
    echo "This will open a browser window for you to login with your Google account"
    exit 1
fi

# Step 2: Initialize Firebase (if not already done)
if [ ! -f ".firebaserc" ]; then
    echo ""
    echo "Step 2: Initializing Firebase project..."
    echo "Please follow the prompts:"
    echo "  - Choose 'Hosting' (use space to select, enter to confirm)"
    echo "  - Select existing project or create new one"
    echo "  - Public directory: build"
    echo "  - Single-page app: Yes"
    echo "  - Set up automatic builds: No"
    echo "  - Overwrite index.html: No"
    firebase init
else
    echo "✅ Firebase already initialized"
fi

# Step 3: Install dependencies
echo ""
echo "Step 3: Installing project dependencies..."
npm install

# Step 4: Install Tailwind CSS
echo ""
echo "Step 4: Installing Tailwind CSS..."
npm install -D tailwindcss postcss autoprefixer

# Step 5: Build the project
echo ""
echo "Step 5: Building the project..."
npm run build

# Step 6: Deploy to Firebase
echo ""
echo "Step 6: Deploying to Firebase..."
firebase deploy

echo ""
echo "🎉 Deployment complete!"
echo "Your app should now be live at the URL shown above"
echo ""
echo "⚠️  IMPORTANT REMINDERS:"
echo "1. Update your Strava app's redirect URI to match your Firebase URL"
echo "2. Set up environment variables in Firebase Console"
echo "3. Update Firebase security rules for production"