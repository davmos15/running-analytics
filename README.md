# Athletic Performance Hub

🏃‍♂️ Professional running performance analyzer with AI-powered race predictions

[![Deploy Status](https://github.com/davmos15/running-analytics/actions/workflows/deploy.yml/badge.svg)](https://github.com/davmos15/running-analytics/actions/workflows/deploy.yml)

🔥 **Live App**: https://strava-analytics-b9293.web.app ✅

A comprehensive running performance analyzer with AI-powered race predictions, advanced analytics, and a sleek athletic dark theme. Integrates with Strava to analyze your performance data, predict race times, and find your best segments at any distance. Features sophisticated prediction algorithms, heart rate analysis, and performance-focused UI designed for serious athletes. Built with React and Firebase.

## 🏃‍♂️ Features

### 🗓️ AI-Powered Training Plan Creator
- **Personalized Training Plans**: Generate custom training plans based on your race goals and fitness history
- **Smart Plan Configuration**: Set race date, distance, goal type (completion/time), runs per week, and available days
- **Intelligent Periodization**: AI analyzes your training history to create base → build → peak → taper phases
- **Comprehensive Workout Types**: Easy runs, tempo, intervals, fartlek, race pace, progression runs, hill repeats
- **CSV Export**: Export complete training plans with detailed workout breakdowns
- **Adaptive Volume**: Plans adjust to your current fitness and follow safe progression principles

### 🤖 AI-Powered Race Predictions  
- **Smart Race Time Predictions**: ML-powered predictions for 5K, 10K, Half Marathon, Marathon, and custom distances
- **Custom Distance Support**: Add any distance for personalized predictions (e.g., 7.5K, 15K)
- **Advanced ML Analysis**: Primary ML feature analysis with improved confidence scoring
- **Realistic Confidence Levels**: Multi-factor confidence calculation based on data quality, experience, and consistency
- **Training Insights**: Personalized recommendations to improve prediction accuracy
- **Performance Factors**: Detailed analysis of what affects your predicted performance

### 📊 Advanced Performance Analytics
- **Automatic PB Tracking**: All distances automatically have Personal Bests calculated and updated with new activities
- **Personal Bests Analysis**: Find your fastest segments at any distance within longer runs using GPS analysis
- **Enhanced Metrics**: Heart rate zones, cadence analysis, elevation gain tracking
- **Performance Trends**: Form analysis and training consistency scoring
- **Flexible Distance Selection**: Analyze performance at any standard or custom distance
- **Advanced Filtering**: Filter by time periods or custom date ranges
- **Smart Segment Processing**: New activities automatically calculate and update PBs for all distances

### 🏃‍♂️ Core Features
- **Strava-Style Segment Detection**: Find your best efforts anywhere in a run, not just from the start
- **Comprehensive Data Collection**: HR, cadence, elevation, pace, and GPS stream analysis
- **Mobile Responsive**: Clean Material Design interface optimized for all devices
- **Strava Integration**: Seamlessly sync your running data with Full Sync or Recent Sync options

### 🎨 Athletic Performance Theme
- **🌙 Dark Athletic UI**: Professional dark slate background with blue gradients
- **⚡ Glassmorphism Effects**: Semi-transparent cards with backdrop blur for modern aesthetics
- **🏆 Metallic Ranking Badges**: Gold, silver, and bronze gradient effects for top 3 performances
- **🎯 Athletic Typography**: Rajdhani font for headings with Inter for body text
- **🔥 Orange/Red Accents**: Vibrant athletic-inspired button and accent colors
- **👁️ Eye-Friendly**: Dark theme optimized for comfortable viewing during workouts

### 📊 Comprehensive Analytics Dashboard
- **🗓️ Training Plan Creator**: Comprehensive training plan generation with AI-powered periodization
- **🔮 Race Predictions Page**: Dedicated prediction dashboard with custom distance support and ML confidence scoring
- **📈 Progressive Performance Graphs**: 
  - Fixed chronological progression charts showing improvement over time
  - Average metrics (speed, distance, time) with customizable time periods
  - Distance threshold analysis with run count tracking
  - Add/remove graphs with personalized dashboard
- **🏅 Enhanced Rankings**: Metallic badge styling with professional athletic feel
- **📏 Custom Distance Management**: Create and manage custom distances in Settings (e.g., 7.5K, 12K)
- **⚙️ Streamlined Data Management**: 
  - Import Recent Activities with automatic PB updates
  - Reprocess All Activities for comprehensive data refresh
  - Simplified settings focused on essential operations
- **⚙️ Advanced Column Management**: 
  - Organize columns by category (Core Metrics, Performance Data, Environmental, Technical)
  - "More Columns" feature with collapsible category management
  - Drag-and-drop column reordering with persistent preferences
- **🌍 Unit System**: Toggle between metric (km) and imperial (miles) units
- **🔗 Direct Strava Integration**: Quick access to view activities directly in Strava
- **📅 Enhanced Date Formatting**: Multiple date format options in Settings

### 💪 Enhanced Data Collection
- **❤️ Heart Rate Analysis**: Average and maximum HR per segment, HR efficiency trends
- **🦵 Cadence Tracking**: Steps per minute analysis with consistency scoring
- **⛰️ Elevation Analytics**: Gain/loss during segments, climbing performance analysis
- **🎯 GPS Stream Processing**: Advanced segment detection using time and distance streams
- **📊 Training Volume Metrics**: Weekly consistency, form trends, preparation analysis

## 🚀 Demo

[Live Demo](https://strava-analytics-b9293.web.app)

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
│   ├── Layout/         # Layout components (Navigation, Header)
│   ├── PersonalBests/  # Personal bests analysis and segment detection
│   ├── RecentRuns/     # Recent runs overview and management
│   ├── Graphs/         # Performance graphs and visualizations
│   ├── Predictions/    # AI race prediction dashboard
│   │   ├── PredictionsPage.js      # Main predictions interface with custom distances
│   │   ├── PredictionCard.js       # Individual distance predictions
│   │   ├── ConfidenceIndicator.js  # Prediction confidence display
│   │   └── TrainingInsights.js     # Training recommendations
│   ├── TrainingPlan/   # AI-powered training plan creator
│   │   └── TrainingPlanPage.js     # Plan configuration and display
│   ├── Settings/       # Configuration and data management
│   ├── SyncButton/     # Strava data synchronization
│   └── common/         # Shared UI components
├── services/           # Core services
│   ├── stravaApi.js           # Strava API integration
│   ├── firebaseService.js     # Database operations with automatic PB tracking
│   ├── syncService.js         # Data synchronization logic
│   ├── predictionService.js   # ML-powered prediction algorithms
│   └── trainingPlanService.js # AI training plan generation
├── hooks/              # Custom React hooks
├── utils/              # Utility functions and constants
└── styles/             # CSS styling and themes
```

## 📱 Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run deploy` - Deploy to Firebase

## 🔄 How It Works

### Data Collection & Processing
1. **Authentication**: Secure OAuth connection with Strava
2. **Enhanced Data Sync**: Fetch activities with GPS streams, heart rate, cadence, and elevation data
3. **Advanced Segment Analysis**: Use sliding window algorithm to find fastest segments anywhere in runs
4. **Comprehensive Metrics**: Calculate HR zones, cadence patterns, and elevation profiles
5. **Firebase Storage**: Store processed data with enhanced metrics for fast access

### AI Race Predictions
1. **Data Analysis**: Analyze 16+ weeks of training data, recent races, and performance trends
2. **ML-Powered Processing**: 
   - **Primary ML Feature Analysis**: Training volume, consistency, HR efficiency, form trends, distance experience
   - **Multi-Factor Confidence**: Data quality, recency, experience, training consistency, prediction stability
   - **Custom Distance Support**: Predictions for any distance with intelligent confidence adjustment
3. **Smart Insights**: Generate personalized training recommendations and performance factors

### AI Training Plan Generation
1. **Fitness Assessment**: Analyze recent 90-day training patterns, weekly volume, longest runs, and pace trends
2. **Intelligent Periodization**: Create base → build → peak → taper phases based on race distance and timeline
3. **Adaptive Workouts**: Generate varied workout types (easy, tempo, intervals, fartlek, race pace, hills) based on training phase
4. **Safe Progression**: Follow 10% rule and smart volume progression tailored to current fitness
5. **Comprehensive Export**: CSV format with detailed workout breakdowns, paces, and segment information

### User Experience
1. **Comprehensive Dashboard**: View predictions, personal bests, training plans, and performance trends
2. **Training Plan Creator**: Generate personalized training plans with CSV export capability
3. **Confidence Scoring**: Understand prediction reliability based on data quality
4. **Training Insights**: Get actionable recommendations to improve performance
5. **Mobile Optimization**: Full responsive design for on-the-go analysis

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

## 🎯 Prediction Accuracy

### Algorithm Performance
- **ML Feature Analysis**: Primary prediction method with 2-4% accuracy for well-trained runners
- **Multi-Factor Confidence**: Realistic confidence scoring based on data quality and experience
- **Custom Distance Support**: Accurate predictions for any distance with confidence adjustment
- **Improved Reliability**: Enhanced confidence calculation provides more realistic assessment

### Data Requirements for Best Results
- **Minimum**: 8+ weeks of training data, 3+ recent races/time trials
- **Optimal**: 16+ weeks of consistent training, 5+ recent performances, HR data
- **Confidence Factors**: Training consistency, distance-specific preparation, data recency

## 🐛 Known Issues

- GPS accuracy can vary between devices affecting segment detection
- Predictions require sufficient training data (8+ weeks minimum)
- Very short segments (under 100m) may have timing precision issues
- Heart rate data dependent on device connectivity and accuracy

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