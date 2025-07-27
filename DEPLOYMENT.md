# Deployment Instructions

This guide covers deploying your Running Analytics app to various platforms.

## 🔥 Firebase Hosting (Recommended)

Firebase Hosting is recommended as it integrates seamlessly with Firebase services.

### Prerequisites
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project created

### Steps

1. **Login to Firebase**
   ```bash
   firebase login
   ```

2. **Initialize Firebase in your project**
   ```bash
   firebase init hosting
   ```
   - Select your Firebase project
   - Set public directory to `build`
   - Configure as single-page app: Yes
   - Don't overwrite index.html: No

3. **Build your app**
   ```bash
   npm run build
   ```

4. **Deploy**
   ```bash
   firebase deploy
   ```

### Custom Domain (Optional)
1. Go to Firebase Console > Hosting
2. Click "Add custom domain"
3. Follow the verification steps

---

## ▲ Vercel

Great for React apps with excellent performance.

### Steps

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Set Environment Variables**
   - Go to Vercel Dashboard
   - Project Settings > Environment Variables
   - Add all your environment variables

### GitHub Integration
1. Connect your GitHub repository
2. Enable automatic deployments
3. Set environment variables in Vercel dashboard

---

## 🌐 Netlify

### Steps

1. **Build your app**
   ```bash
   npm run build
   ```

2. **Deploy via CLI**
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir=build
   ```

### GitHub Integration
1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Add environment variables

---

## 🚀 Manual Deployment

For any static hosting provider:

1. **Build your app**
   ```bash
   npm run build
   ```

2. **Upload the build folder**
   - Upload the contents of the `build` folder to your hosting provider
   - Ensure your hosting supports single-page applications

---

## 🔧 Environment Variables for Production

Make sure to set these environment variables in your hosting platform:

```env
REACT_APP_STRAVA_CLIENT_ID=your_production_client_id
REACT_APP_STRAVA_CLIENT_SECRET=your_production_client_secret
REACT_APP_STRAVA_REDIRECT_URI=https://your-domain.com/auth/callback

REACT_APP_FIREBASE_API_KEY=your_production_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_production_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_production_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_production_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_production_sender_id
REACT_APP_FIREBASE_APP_ID=your_production_app_id
```

---

## 🔒 Security Checklist

Before deploying:

- [ ] All sensitive data is in environment variables
- [ ] `.env` file is in `.gitignore`
- [ ] Strava redirect URI is updated for production
- [ ] Firebase security rules are configured
- [ ] HTTPS is enabled
- [ ] Domain is added to Strava app settings

---

## 📊 Performance Optimization

### Build Optimization
```bash
# Analyze bundle size
npm install -g webpack-bundle-analyzer
npx webpack-bundle-analyzer build/static/js/*.js
```

### Firebase Hosting Headers
Add to `firebase.json`:
```json
{
  "hosting": {
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

---

## 🔄 Continuous Deployment

### GitHub Actions (Firebase)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [ main ]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm ci
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: your_project_id
```

---

## 🐛 Troubleshooting

### Common Issues

1. **Environment variables not loading**
   - Ensure variables start with `REACT_APP_`
   - Rebuild after adding variables

2. **Strava redirect URI mismatch**
   - Update Strava app settings with production URL
   - Ensure exact match including protocol

3. **Firebase permissions**
   - Check Firestore security rules
   - Ensure proper authentication setup

4. **Build fails**
   - Check for console errors
   - Ensure all dependencies are installed
   - Verify environment variables are set

### Logs and Debugging

- **Firebase**: `firebase functions:log`
- **Vercel**: Check deployment logs in dashboard
- **Netlify**: Check deploy logs in dashboard

---

## 📈 Monitoring

### Firebase Analytics
Add to your Firebase project for user analytics.

### Error Tracking
Consider adding services like:
- Sentry
- LogRocket
- Bugsnag

### Performance Monitoring
- Firebase Performance Monitoring
- Web Vitals tracking
- Lighthouse CI