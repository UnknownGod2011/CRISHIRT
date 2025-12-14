# CRISHIRTS - AI-Powered T-Shirt Design Platform

**CRISHIRTS** is an AI-powered T-shirt design platform that leverages Bria FIBO's advanced image generation capabilities. The platform provides intuitive tools for creating, customizing, and visualizing custom apparel designs with professional-grade control and real-time preview.

## ✨ Features

### 🎨 **AI Design Generation**
- Natural language to image generation using Bria FIBO
- Advanced parameter control (camera angles, lighting, colors)
- Real-time design refinement and editing
- Multiple style presets and customization options

### 👕 **T-Shirt Mockup System**
- Instant design overlay on T-shirt templates
- Multiple T-shirt colors and styles
- Real-time mockup updates
- Professional design placement

### 📱 **AR Try-On**
- Augmented reality T-shirt visualization
- Real-time body tracking
- Interactive design preview
- Mobile-friendly experience

### 💾 **Design Management**
- Save and organize designs
- Export in print-ready formats
- Design library with search and filters
- Batch processing capabilities

## 🚀 Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS + shadcn/ui components
- React Three Fiber for 3D mockup rendering
- @mediapipe/tasks-vision for AR body tracking
- Zustand for state management

**Backend:**
- Node.js with Express
- Bria FIBO API integration
- Sharp for image processing
- Canvas for mockup generation
- JSON Schema validation (Ajv)

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+
- Bria FIBO API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/UnknownGod2011/CRISHIRT.git
cd CRISHIRT
```

2. **Install dependencies**
```bash
# Frontend
npm install

# Backend
cd backend
npm install
```

3. **Environment Setup**
```bash
# Backend (.env)
FIBO_API_KEY=your_fibo_api_key_here
PORT=5000

# Frontend (.env)
VITE_API_URL=http://localhost:5000
```

4. **Start the application**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
npm run dev
```

5. **Open in browser**
```
http://localhost:5173
```

## 🎬 How It Works

1. **Enter Prompt**: Describe your design idea in natural language
2. **AI Generation**: FIBO creates professional designs from your prompt
3. **Customize**: Adjust parameters like colors, lighting, and composition
4. **Preview**: See your design on T-shirt mockups instantly
5. **Try On**: Use AR to see how it looks on you
6. **Export**: Save designs in print-ready formats

## 🎯 Use Cases

- **Custom Apparel**: Create unique T-shirt designs
- **Small Businesses**: Generate merchandise designs quickly
- **Personal Projects**: Design custom shirts for events or gifts
- **Print Shops**: Offer AI-powered design services
- **Fashion Designers**: Rapid prototyping and concept exploration

## 🔧 API Endpoints

```
POST /api/generate          # Generate design from prompt/parameters
POST /api/mockup           # Create T-shirt mockup
POST /api/batch/generate   # Start batch generation
GET  /api/batch/:id/status # Check batch progress
POST /api/designs          # Save design to library
GET  /api/designs          # List saved designs
POST /api/designs/export   # Export design bundle
```

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run property-based tests
npm run test:properties

# Run E2E tests
npm run test:e2e
```

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

This project was created for the FIBO Hackathon. For questions or collaboration opportunities, please reach out!

---

**Built with ❤️ using Bria FIBO AI**

*Empowering creativity through AI-powered design generation.*