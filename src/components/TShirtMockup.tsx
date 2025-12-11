import React, { useState, useRef, useCallback } from "react";
import { Rnd } from "react-rnd";
import { cn } from "@/lib/utils";

interface TShirtMockupProps {
  color: string;
  design?: string | null;
  material: string;
  size: string;
  useEnhancedCompositing?: boolean;
}

const TShirtMockup: React.FC<TShirtMockupProps> = ({
  color,
  design,
  material,
  size,
  useEnhancedCompositing = false,
}) => {
  const [category, setCategory] = useState("T-shirt");
  const [selectedMaterial, setSelectedMaterial] = useState(material || "Cotton");
  const [selectedSize, setSelectedSize] = useState(size || "M");
  const [enhancedMockupUrl, setEnhancedMockupUrl] = useState<string | null>(null);
  const [isGeneratingEnhanced, setIsGeneratingEnhanced] = useState(false);
  const [enhancedCompositingEnabled, setEnhancedCompositingEnabled] = useState(useEnhancedCompositing);

  const getSizeScale = () => {
    switch (selectedSize) {
      case "XS": return "scale-75";
      case "S": return "scale-90";
      case "M": return "scale-100";
      case "L": return "scale-110";
      case "XL": return "scale-125";
      case "XXL": return "scale-140";
      case "3XL": return "scale-150";
      default: return "scale-100";
    }
  };

  const [designState, setDesignState] = useState({
    x: 205, // Centered horizontally on T-shirt chest area
    y: 280, // Positioned in center of T-shirt chest (away from collar)
    width: 150,
    height: 150,
    rotation: 0,
  });

  const rotateRef = useRef<HTMLDivElement | null>(null);

  // Enhanced compositing function
  const generateEnhancedMockup = useCallback(async () => {
    if (!design) return;
    
    setIsGeneratingEnhanced(true);
    
    try {
      const tshirtConfig = {
        color: color,
        material: selectedMaterial.toLowerCase(),
        style: category.toLowerCase().replace(' ', '-')
      };
      
      const options = {
        lightingConfig: {
          ambientIntensity: 0.3,
          directionalLight: {
            angle: 45,
            intensity: 0.7,
            color: '#ffffff'
          },
          shadows: {
            enabled: true,
            softness: 0.5,
            opacity: 0.3
          }
        },
        foldPattern: {
          type: 'hanging',
          intensity: 0.3
        },
        inkEffects: {
          bleedRadius: selectedMaterial.toLowerCase() === 'cotton' ? 2 : 1,
          opacity: 0.3,
          colorShift: 0.1
        },
        designWidth: designState.width,
        designHeight: designState.height,
        designX: designState.x,
        designY: designState.y
      };
      
      const response = await fetch('http://localhost:5001/api/enhanced-mockup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          designImageUrl: design,
          tshirtConfig: tshirtConfig,
          options: options
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setEnhancedMockupUrl(result.mockupUrl);
        console.log('✅ Enhanced mockup generated:', result.mockupUrl);
      } else {
        console.error('❌ Enhanced mockup generation failed:', result.error);
        alert('Enhanced mockup generation failed: ' + result.error.message);
      }
    } catch (error) {
      console.error('❌ Enhanced mockup error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert('Enhanced mockup generation error: ' + errorMessage);
    } finally {
      setIsGeneratingEnhanced(false);
    }
  }, [design, color, selectedMaterial, category, designState]);

  // Auto-generate enhanced mockup when enabled and design changes
  React.useEffect(() => {
    if (enhancedCompositingEnabled && design && !isGeneratingEnhanced) {
      const timer = setTimeout(() => {
        generateEnhancedMockup();
      }, 1000); // Debounce for 1 second
      
      return () => clearTimeout(timer);
    }
  }, [enhancedCompositingEnabled, design, color, selectedMaterial, category, designState, generateEnhancedMockup, isGeneratingEnhanced]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const box = rotateRef.current?.getBoundingClientRect();
    if (!box) return;

    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const startAngle = Math.atan2(startY - centerY, startX - centerX);
    const startRotation = designState.rotation;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentAngle = Math.atan2(
        moveEvent.clientY - centerY,
        moveEvent.clientX - centerX
      );
      const rotationDeg = (currentAngle - startAngle) * (180 / Math.PI);
      setDesignState((prev) => ({
        ...prev,
        rotation: startRotation + rotationDeg,
      }));
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="flex flex-col items-center h-full p-4 bg-white">
      {/* 🔘 Option selectors - moved directly below heading */}
      <div className="flex flex-wrap gap-3 mb-1 justify-center mt-2 items-center relative z-50">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-800 text-sm focus:outline-none focus:border-gray-400 transition"
        >
          <option value="T-shirt">T-shirt</option>
          <option value="Hoodie">Hoodie</option>
          <option value="Sweatshirt">Sweatshirt</option>
          <option value="Tank Top">Tank Top</option>
          <option value="Polo">Polo</option>
          <option value="Long Sleeve">Long Sleeve</option>
          <option value="Cropped Tee">Cropped Tee</option>
        </select>

        <select
          value={selectedMaterial}
          onChange={(e) => setSelectedMaterial(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-800 text-sm focus:outline-none focus:border-gray-400 transition"
        >
          <option value="Cotton">Cotton</option>
          <option value="Polyester">Polyester</option>
          <option value="Blended">Blended</option>
          <option value="Linen">Linen</option>
          <option value="Organic Cotton">Organic Cotton</option>
          <option value="Silk">Silk</option>
          <option value="Dry-Fit">Dry-Fit</option>
        </select>

        <select
          value={selectedSize}
          onChange={(e) => setSelectedSize(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-800 text-sm focus:outline-none focus:border-gray-400 transition"
        >
          <option value="XS">XS</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
          <option value="XXL">XXL</option>
          <option value="3XL">3XL</option>
        </select>

        <button
          onClick={() => alert('Back-print feature coming soon!')}
          className="px-4 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          Back-print!
        </button>

        <button
          onClick={() => setEnhancedCompositingEnabled(!enhancedCompositingEnabled)}
          className={cn(
            "px-4 py-1.5 text-sm rounded-lg transition-colors font-medium",
            enhancedCompositingEnabled
              ? "bg-green-500 text-white hover:bg-green-600"
              : "bg-gray-300 text-gray-700 hover:bg-gray-400"
          )}
        >
          {enhancedCompositingEnabled ? "Enhanced ✓" : "Enhanced"}
        </button>


      </div>



      {/* 🧢 Apparel Preview - positioned directly below dropdowns */}
      <div
        className={cn(
          "relative transition-all duration-500 transform origin-center",
          getSizeScale()
        )}
        style={{ 
          width: 560, 
          height: 700,
          marginTop: '-120px',
          marginBottom: 0,
          paddingTop: 0
        }}
      >
        {/* Enhanced Mockup Display */}
        {enhancedMockupUrl && enhancedCompositingEnabled ? (
          <div className="relative w-full h-full">
            <img
              src={enhancedMockupUrl}
              alt="Enhanced T-shirt mockup"
              className="absolute inset-0 w-full h-full object-contain z-30 pointer-events-none"
              draggable={false}
            />
            
            {/* Enhanced mockup indicator */}
            <div className="absolute top-4 right-4 z-40 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
              Enhanced Compositing
            </div>
            
            {/* Loading overlay */}
            {isGeneratingEnhanced && (
              <div className="absolute inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                  <span className="text-gray-700 font-medium">Generating Enhanced Mockup...</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Base Shirt */}
            <img
              src="/mockups/tshirt.png"
              alt="T-shirt base"
              className="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none"
              draggable={false}
            />

            {/* Improved Natural Color Blending */}
            <div
              className="absolute inset-0 z-20 pointer-events-none"
              style={{
                backgroundColor: color,
                mixBlendMode: "multiply",
                opacity: 0.75,
                maskImage: "url(/mockups/tshirt.png)",
                WebkitMaskImage: "url(/mockups/tshirt.png)",
                maskRepeat: "no-repeat",
                maskPosition: "center",
                maskSize: "contain",
              }}
            />
            
            {/* Enhanced fold definition layer */}
            <div
              className="absolute inset-0 z-21 pointer-events-none"
              style={{
                backgroundColor: color,
                mixBlendMode: "soft-light",
                opacity: 0.4,
                maskImage: "url(/mockups/tshirt.png)",
                WebkitMaskImage: "url(/mockups/tshirt.png)",
                maskRepeat: "no-repeat",
                maskPosition: "center",
                maskSize: "contain",
              }}
            />

            {/* Design Layer */}
            {design && (
              <Rnd
                bounds="parent"
                size={{ width: designState.width, height: designState.height }}
                position={{ x: designState.x, y: designState.y }}
                onDragStop={(_, d) =>
                  setDesignState((prev) => ({ ...prev, x: d.x, y: d.y }))
                }
                onResizeStop={(_, __, ref, ___, position) =>
                  setDesignState({
                    ...designState,
                    width: parseFloat(ref.style.width),
                    height: parseFloat(ref.style.height),
                    ...position,
                  })
                }
                lockAspectRatio
                className="z-30 group"
              >
                <div
                  ref={rotateRef}
                  style={{
                    transform: `rotate(${designState.rotation}deg)`,
                    transformOrigin: "center center",
                    width: "100%",
                    height: "100%",
                    position: "relative",
                  }}
                >
                  {/* --- Main Printed Effect --- */}
                  <img
                    src={design}
                    alt="Printed design"
                    className="w-full h-full object-contain rounded-sm select-none absolute inset-0"
                    draggable={false}
                    style={{
                      objectFit: "contain",
                      mixBlendMode: "overlay", // interacts with shirt color & folds
                      opacity: 0.92,
                      filter: "contrast(1.05) brightness(0.97) saturate(1.1)",
                      userSelect: "none",
                    }}
                  />

                  {/* Light ink absorption layer */}
                  <img
                    src={design}
                    alt="Ink absorption layer"
                    className="w-full h-full object-contain rounded-sm select-none absolute inset-0 pointer-events-none"
                    draggable={false}
                    style={{
                      objectFit: "contain",
                      mixBlendMode: "soft-light", // soft diffusion into fabric
                      opacity: 0.65,
                      filter: "blur(0.4px)",
                      userSelect: "none",
                    }}
                  />

                  {/* Fabric texture for woven feel */}
                  <div className="absolute inset-0 pointer-events-none mix-blend-soft-light opacity-15 bg-[url('/textures/fabric.png')] bg-cover" />

                  {/* Rotation handle */}
                  <div
                    onMouseDown={handleMouseDown}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-4 bg-indigo-400 rounded-full cursor-grab opacity-0 group-hover:opacity-100 transition"
                    title="Rotate"
                  />
                </div>
              </Rnd>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TShirtMockup;
