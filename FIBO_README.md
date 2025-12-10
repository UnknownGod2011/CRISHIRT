# Crishirts - FIBO-Powered T-Shirt Design Platform

## 🏆 FIBO Hackathon Submission

**Categories:** Best JSON-Native Workflow, Best Controllability, Best New User Experience

## 🚀 Overview

Crishirts leverages Bria FIBO's JSON-native image generation to create a professional T-shirt design platform with intelligent parameter optimization, real-time AR try-on, and production-ready workflows.

## ✨ Key FIBO Innovations

### 1. **Intelligent T-Shirt Context Optimization**
- Automatically adjusts FIBO parameters based on T-shirt color, material, and print area
- Dark shirts get enhanced lighting and contrast parameters
- Material type influences detail level and texture parameters
- Print area (front/back/sleeve) optimizes camera angle and composition

### 2. **JSON-Native Design Refinement**
- Two-stage workflow: Generate → Refine
- Refinement prompts modify specific FIBO parameter categories
- Preserves original design intent while applying targeted changes
- Parameter history and rollback capabilities

### 3. **Professional Parameter Control**
- Real-time FIBO parameter visualization
- T-shirt-optimized parameter presets
- Camera angle, lighting, and color palette controls
- Professional output formats (16-bit, HDR support)

### 4. **AR Try-On Integration**
- WebRTC-based real-time AR overlay
- Design positioning based on body detection
- T-shirt color and design preview on user's body
- Mobile-optimized camera interface

## 🛠 Technical Implementation

### FIBO Parameter Optimization
```javascript
// T-shirt context influences FIBO parameters
const optimizedParams = {
  camera_angle: printArea === "front" ? "front" : "side",
  lighting_intensity: tshirtColor === "#000000" ? 1.4 : 1.0,
  avoid_colors: tshirtColor === "#000000" ? ["black", "dark"] : [],
  enhance_contrast: true,
  background: "transparent", // Essential for T-shirt designs
  resolution: "1024x1024"
};
```

### Design Refinement Workflow
```javascript
// Intelligent parameter modification for refinements
if (refinementPrompt.includes('color')) {
  refinedParams.enhance_colors = true;
}
if (refinementPrompt.includes('detail')) {
  refinedParams.detail_level = "high";
}
```

## 🎯 Competitive Advantages

### **Best JSON-Native Workflow**
- Sophisticated prompt-to-parameter translation
- T-shirt context-aware parameter optimization
- Multi-stage refinement with parameter preservation
- Professional parameter validation and suggestions

### **Best Controllability**
- Real-time parameter adjustment interface
- Visual parameter effect preview
- T-shirt-specific optimization controls
- Professional-grade parameter exposure

### **Best New User Experience**
- Seamless natural language to structured control
- Intelligent parameter suggestions
- AR try-on for immediate feedback
- Progressive complexity revelation

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
cd project
npm install
```

### 2. Configure FIBO API
```bash
# Add your FIBO API key to backend/.env
FIBO_API_KEY=your_fibo_api_key_here
```

### 3. Run the Application
```bash
# Start FIBO-powered backend + frontend
npm run dev

# Or run components separately
npm run dev:fibo    # FIBO backend on :5000
npm run dev:frontend # React frontend on :5173
```

## 📱 Features

### **Design Generation**
- Natural language prompts converted to FIBO JSON parameters
- T-shirt context optimization (color, material, print area)
- Professional parameter control and visualization
- Transparent background generation for T-shirt printing

### **Design Refinement**
- Targeted parameter modification based on refinement prompts
- Preserves original design while applying specific changes
- Parameter diff visualization
- Refinement history and rollback

### **AR Try-On**
- Real-time webcam-based AR overlay
- Design positioning on user's chest area
- T-shirt color preview with design overlay
- Mobile-responsive camera interface

### **Professional Controls**
- Camera angle and FOV adjustment
- Lighting direction and intensity control
- Color palette optimization
- Output format selection (PNG, HDR, 16-bit)

## 🎨 Use Cases

### **Individual Designers**
- Quick design generation with natural language
- Real-time AR preview before ordering
- Professional parameter fine-tuning
- Design refinement and iteration

### **T-Shirt Businesses**
- Batch design generation with consistent parameters
- Brand guideline enforcement through parameter templates
- Professional print-ready output formats
- Commercial licensing compliance (FIBO trained data)

### **Design Agencies**
- Client collaboration with parameter sharing
- Professional workflow integration
- Advanced parameter control for precise results
- Scalable design generation pipelines

## 🏆 Why This Wins

### **Real Production Value**
- Actual e-commerce T-shirt platform, not just a demo
- Solves real problems in apparel design workflow
- Professional-grade output suitable for commercial printing

### **FIBO Innovation**
- Showcases FIBO's JSON-native control advantages
- Demonstrates intelligent parameter optimization
- Leverages professional parameters for real business needs

### **User Experience Excellence**
- Seamless transition from simple prompts to advanced control
- AR try-on provides immediate visual feedback
- Progressive complexity revelation keeps interface approachable

### **Technical Sophistication**
- T-shirt context-aware parameter optimization
- Multi-stage refinement workflow
- Professional parameter validation and suggestions
- Production-ready architecture with error handling

## 📊 Demo Scenarios

1. **Simple Design Generation**: "minimalist mountain logo" → optimized FIBO parameters → transparent PNG
2. **T-Shirt Optimization**: Black shirt automatically gets enhanced lighting parameters
3. **Design Refinement**: "make it more colorful" → modifies color palette parameters only
4. **AR Try-On**: Real-time overlay shows design on user's body
5. **Professional Controls**: Manual parameter adjustment with live preview

## 🔗 Links

- **Live Demo**: [Your deployed URL]
- **GitHub Repository**: [Your repo URL]
- **FIBO Integration**: Uses Bria FIBO API with JSON-native control
- **AR Technology**: WebRTC-based real-time camera processing

---

**Built for the FIBO Hackathon - Showcasing the future of professional AI-powered design workflows**