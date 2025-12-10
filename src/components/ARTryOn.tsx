import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, RotateCcw } from 'lucide-react';

interface ARTryOnProps {
  design?: string;
  tshirtColor: string;
}

const ARTryOn: React.FC<ARTryOnProps> = ({ design, tshirtColor }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user' // Front camera
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setStream(mediaStream);
      setIsActive(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Camera access denied. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsActive(false);
  };

  const drawAROverlay = () => {
    if (!videoRef.current || !canvasRef.current || !design) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Simple chest area detection (approximate)
    const chestX = canvas.width * 0.3;
    const chestY = canvas.height * 0.4;
    const chestWidth = canvas.width * 0.4;
    const chestHeight = canvas.height * 0.3;

    // Draw T-shirt color background
    ctx.fillStyle = tshirtColor;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(chestX, chestY, chestWidth, chestHeight);

    // Draw design overlay
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.globalAlpha = 0.9;
      const designSize = Math.min(chestWidth, chestHeight) * 0.6;
      const designX = chestX + (chestWidth - designSize) / 2;
      const designY = chestY + (chestHeight - designSize) / 2;
      
      ctx.drawImage(img, designX, designY, designSize, designSize);
      ctx.globalAlpha = 1.0;
    };
    img.src = design;
  };

  useEffect(() => {
    if (isActive && design) {
      const interval = setInterval(drawAROverlay, 100); // 10 FPS
      return () => clearInterval(interval);
    }
  }, [isActive, design, tshirtColor]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">AR Try-On</h3>
        <p className="text-sm text-gray-600">See how your design looks on you</p>
      </div>

      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!design && (
          <div className="text-center py-8 text-gray-500">
            <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Generate a design first to try it on</p>
          </div>
        )}

        {design && (
          <div className="space-y-4">
            <div className="flex justify-center space-x-3">
              {!isActive ? (
                <button
                  onClick={startCamera}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start AR Try-On</span>
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <CameraOff className="w-4 h-4" />
                  <span>Stop Camera</span>
                </button>
              )}
            </div>

            <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
              {isActive ? (
                <>
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    muted
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    AR Try-On Active
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Camera className="w-16 h-16 mx-auto mb-2 opacity-50" />
                    <p>Camera not active</p>
                  </div>
                </div>
              )}
            </div>

            {isActive && (
              <div className="text-xs text-gray-500 text-center">
                <p>Position yourself so your chest is in the center of the frame</p>
                <p>The design will appear overlaid on your T-shirt area</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ARTryOn;