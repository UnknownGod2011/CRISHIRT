# 🚀 Bria API Setup Guide

## Quick Setup (2 minutes)

### 1. Add Your Production API Key
Edit `project/backend/.env` and replace:
```bash
BRIA_API_KEY=YOUR_PRODUCTION_API_KEY_HERE
```

With your actual production key (ending in Cd):
```bash
BRIA_API_KEY=your_actual_production_key_ending_in_Cd
```

### 2. Start the Application
```bash
cd project
npm run dev
```

This will start:
- Bria backend on `http://localhost:5000`
- React frontend on `http://localhost:5173`

### 3. Test the Integration
1. Open `http://localhost:5173`
2. Enter a prompt like: "minimalist mountain logo"
3. Click "Generate" 
4. Wait 10-30 seconds for Bria to generate the design
5. Try the "Refine" feature with prompts like "make it more colorful"
6. Test AR try-on by clicking "Start AR Try-On"

## 🎯 What's Implemented

### ✅ Bria API Integration
- **Correct Authentication**: Uses `api_token` header
- **Async Handling**: Polls status URL until completion
- **T-shirt Optimization**: Automatically optimizes prompts for T-shirt printing
- **Error Handling**: Proper error handling with retry logic

### ✅ T-shirt Context Optimization
```javascript
// Automatically adds T-shirt specific optimizations:
"clean design suitable for t-shirt printing, transparent background, high contrast"

// Dark shirt optimization:
"bright colors, avoid dark colors"

// White shirt optimization: 
"bold colors, strong contrast"
```

### ✅ Design Refinement
- Uses `/refine-design` endpoint
- Combines original + refinement prompts intelligently
- Maintains T-shirt optimization in refined designs

### ✅ AR Try-On
- WebRTC camera access
- Real-time design overlay on chest area
- Works with any generated design

## 🏆 Hackathon Features

### **Best JSON-Native Workflow**
- Bria's async API with status polling
- T-shirt context-aware prompt optimization
- Professional parameter handling

### **Best Controllability** 
- Real-time T-shirt color optimization
- Material-based detail level adjustment
- Print area specific optimizations

### **Best New User Experience**
- Seamless prompt → optimized generation
- AR try-on for immediate feedback
- Loading states with progress indication

## 🔧 API Endpoints Used

### Generation
```
POST https://engine.prod.bria-api.com/v1/text_to_image
Headers: api_token: your_key
Body: { prompt: "optimized_prompt", sync: false }
```

### Status Polling
```
GET https://engine.prod.bria-api.com/v1/status/{request_id}
Headers: api_token: your_key
```

## 🎨 Example Prompts to Try

### Basic Generation
- "minimalist geometric mountain design"
- "vintage sunset with palm trees"
- "abstract colorful waves"
- "retro 80s neon cityscape"

### Refinement Examples
- Original: "mountain logo" → Refine: "make it more colorful"
- Original: "sunset design" → Refine: "add geometric elements"
- Original: "abstract art" → Refine: "simplify and make minimal"

## 🚨 Troubleshooting

### API Key Issues
- Make sure you're using the Production key (ending in Cd)
- Check that the key is correctly set in `.env`
- Restart the server after changing the key

### Generation Timeouts
- Bria API can take 10-30 seconds
- The app polls status automatically
- Check console logs for detailed error messages

### Camera Issues (AR Try-On)
- Allow camera permissions in browser
- Works best in Chrome/Safari
- Requires HTTPS in production

## 📊 Performance Notes

- **Generation Time**: 10-30 seconds (Bria API dependent)
- **Rate Limits**: 1000 requests/minute on Production plan
- **Image Quality**: High-quality, print-ready outputs
- **Background**: Automatically transparent for T-shirt printing

Ready to win the hackathon! 🏆