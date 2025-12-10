import React, { useState, useRef, useEffect } from 'react';

interface ColorWheelProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
}

const ColorWheel: React.FC<ColorWheelProps> = ({ selectedColor, onColorChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawColorWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Create smooth hue gradient
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    for (let x = 0; x < canvas.width; x++) {
      for (let y = 0; y < canvas.height; y++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= radius) {
          const angle = Math.atan2(dy, dx);
          const hue = ((angle * 180 / Math.PI) + 360) % 360;
          const saturation = Math.min(distance / radius, 1) * 100;
          const lightness = 50;
          
          // Convert HSL to RGB
          const c = (1 - Math.abs(2 * lightness / 100 - 1)) * saturation / 100;
          const x1 = c * (1 - Math.abs((hue / 60) % 2 - 1));
          const m = lightness / 100 - c / 2;
          
          let r, g, b;
          if (hue < 60) { r = c; g = x1; b = 0; }
          else if (hue < 120) { r = x1; g = c; b = 0; }
          else if (hue < 180) { r = 0; g = c; b = x1; }
          else if (hue < 240) { r = 0; g = x1; b = c; }
          else if (hue < 300) { r = x1; g = 0; b = c; }
          else { r = c; g = 0; b = x1; }
          
          const index = (y * canvas.width + x) * 4;
          data[index] = Math.round((r + m) * 255);
          data[index + 1] = Math.round((g + m) * 255);
          data[index + 2] = Math.round((b + m) * 255);
          data[index + 3] = 255;
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const getColorFromPosition = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return selectedColor;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return selectedColor;

    const canvasX = ((x - rect.left) * canvas.width) / rect.width;
    const canvasY = ((y - rect.top) * canvas.height) / rect.height;

    const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data;
    return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    onColorChange(getColorFromPosition(e.clientX, e.clientY));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    onColorChange(getColorFromPosition(e.clientX, e.clientY));
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => drawColorWheel(), []);

  return (
    <div
      className="relative w-36 h-36 cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <canvas
        ref={canvasRef}
        width={144}
        height={144}
        className="rounded-full"
      />
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-sm pointer-events-none"
        style={{ backgroundColor: selectedColor }}
      />
    </div>
  );
};

export default ColorWheel;
