# Running Analytics

🏃‍♂️ Personal running performance analyzer powered by Strava

[![Deploy Status](https://github.com/davmos15/running-analytics/actions/workflows/deploy.yml/badge.svg)](https://github.com/davmos15/running-analytics/actions/workflows/deploy.yml)

🔥 **Live App**: https://davmos15.github.io/running-analytics

A personal running performance analyzer that integrates with Strava to find your best segments at any distance within your runs. Built with React and Firebase.

## 🏃‍♂️ Features

- **Personal Bests Analysis**: Find your fastest segments (5K, 10K, etc.) within longer runs
- **Flexible Distance Selection**: Analyze performance at any standard running distance
- **Advanced Filtering**: Filter by time periods or custom date ranges
- **Mobile Responsive**: Clean Google Material Design interface
- **Strava Integration**: Seamlessly sync your running data

## 🚀 Demo

[Live Demo](https://your-app-url.web.app) (Replace with your actual URL)

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Strava Developer Account
- Firebase Project

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/running-analytics.git
   cd running-analytics
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in your API keys in the `.env` file (see Configuration section)

4. **Start development server**
   ```bash
   npm start
   ```

## ⚙️ Configuration

### Strava API Setup

1. Go to [Strava Developers](https://developers.strava.com/)
2. Create a new application
3. Note your Client ID and Client Secret
4. Set Authorization Callback Domain to your domain

### Firebase Setup

1. Create a new Firebase project
2. Enable Firestore Database
3. Get your Firebase configuration
4. Update your `.env` file with the credentials

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
REACT_APP_STRAVA_CLIENT_ID=your_client_id
REACT_APP_STRAVA_CLIENT_SECRET=your_client_secret
REACT_APP_STRAVA_REDIRECT_URI=http://localhost:3000/auth/callback

REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── Layout/         # Layout components
│   ├── PersonalBests/  # Personal bests feature
│   ├── RecentRuns/     # Recent runs feature
│   └── common/         # Shared components
├── services/           # API services
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── styles/             # CSS styles
```

## 📱 Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run deploy` - Deploy to Firebase

## 🔄 How It Works

1. **Authentication**: Connect with Strava using OAuth
2. **Data Sync**: Fetch your running activities and GPS data
3. **Segment Processing**: Analyze GPS tracks to find best segments
4. **Storage**: Store processed data in Firebase for fast access
5. **Visualization**: Display your personal bests and recent runs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Privacy

This application only accesses your own Strava data and stores it securely in your personal Firebase database. No data is shared with third parties.

## ⚠️ Rate Limits

Strava API has rate limits:
- 200 requests per 15 minutes
- 2000 requests per day

The app handles these limits gracefully with automatic retries.

## 🐛 Known Issues

- GPS accuracy can vary between devices
- Very short segments (under 100m) may have timing precision issues

## 📞 Support

If you encounter any issues:
1. Check the [Issues](https://github.com/yourusername/running-analytics/issues) page
2. Create a new issue with detailed information
3. Include error messages and steps to reproduce

## 🙏 Acknowledgments

- [Strava API](https://developers.strava.com/) for providing running data
- [Firebase](https://firebase.google.com/) for backend services
- [Lucide React](https://lucide.dev/) for beautiful icons
- [Tailwind CSS](https://tailwindcss.com/) for styling