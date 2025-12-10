import React, { useState } from 'react';
import { ShoppingCart, Loader2 } from 'lucide-react';
import ColorWheel from './ColorWheel';
import { useDesignState, useCartState, CartItem } from '../store/AppContext';

interface ControlPanelProps {
  tshirtColor: string;
  onTshirtColorChange: (color: string) => void;
}

const API_BASE = "http://localhost:5001/api";

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'
];

const ControlPanel: React.FC<ControlPanelProps> = ({
  tshirtColor,
  onTshirtColorChange
}) => {
  // Local state for input fields
  const [prompt, setPrompt] = useState('');
  const [modifyPrompt, setModifyPrompt] = useState('');
  
  // Global state from context
  const {
    currentImage,
    lastPrompt,
    lastRefinementPrompt,
    isGenerating,
    isRefining,
    canRefine,
    hasGenerated,
    error,
    success,
    generationProgress,
    setGenerating,
    setRefining,
    setGeneratedImage,
    setRefinedImage,
    setLastPrompt,
    setLastRefinementPrompt,
    setError,
    setSuccess,
    setGenerationProgress,
  } = useDesignState();
  
  const { addToCart } = useCartState();

  // Handle API responses with proper error handling
  const handleApiResponse = async (response: Response) => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || "API request failed");
    }
    
    return data;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a design description");
      return;
    }
    
    // Lock the button immediately
    setGenerating(true);
    setError(null);
    setSuccess(null);
    setGenerationProgress('Starting generation...');
    
    try {
      setGenerationProgress('Sending request to Bria API...');

      // Call new Bria API
      const response = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      
      const data = await handleApiResponse(response);
      
      setGenerationProgress('');
      setSuccess('✅ Design generated successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Update global state with generated image
      setGeneratedImage(data.imageUrl);
      setLastPrompt(prompt);
      
      // Clear the input field
      setPrompt('');
      
    } catch (err: any) {
      console.error('Generation error:', err);
      setGenerationProgress('');
      setError(err.message || "Failed to generate design - please try again");
    } finally {
      setGenerating(false);
    }
  };

  const handleModify = async () => {
    if (!modifyPrompt.trim()) {
      setError("Please enter modification instructions");
      return;
    }
    
    if (!currentImage) {
      setError("Please generate a design first before refining");
      return;
    }
    
    // Lock refinement button
    setRefining(true);
    setError(null);
    setSuccess(null);
    setGenerationProgress('Starting refinement...');
    
    try {
      setGenerationProgress('Sending refinement request...');

      // Call new Bria refinement API
      const response = await fetch(`${API_BASE}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          instruction: modifyPrompt,
          imageUrl: currentImage
        }),
      });
      
      const data = await handleApiResponse(response);
      
      setGenerationProgress('');
      setSuccess('✅ Design refined successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Update global state with refined image
      setRefinedImage(data.refinedImageUrl);
      setLastRefinementPrompt(modifyPrompt);
      
      // Clear the input field
      setModifyPrompt('');
      
      // Update localStorage for AR try-on page
      localStorage.setItem('selectedDesign', data.refinedImageUrl);
      localStorage.setItem('tshirtColor', tshirtColor);
      
    } catch (err: any) {
      console.error('Refinement error:', err);
      setGenerationProgress('');
      setError(err.message || "Failed to refine design - please try again");
    } finally {
      setRefining(false);
    }
  };



  const handleAddToCart = async () => {
    if (!currentImage) {
      setError("Please generate a design first");
      return;
    }

    try {
      // Create cart item with global state
      const cartItem: CartItem = {
        id: Date.now().toString(),
        imageUrl: currentImage,
        tshirtColor,
        design: lastPrompt || 'Custom Design',
        addedAt: new Date().toISOString(),
        price: 29.99
      };

      // Add to global cart state (this will also persist to localStorage)
      addToCart(cartItem);
      
      // Also call backend for any additional processing
      const response = await fetch(`${API_BASE}/cart/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: currentImage,
          tshirtColor,
          design: lastPrompt || 'Custom Design'
        }),
      });

      await handleApiResponse(response);
      setSuccess('✅ Item added to cart successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      console.error('Add to cart error:', err);
      setError(err.message || "Failed to add to cart");
    }
  };

  return (
    <div className="space-y-8">
      {/* Primary Prompt with inline button */}
      <div className="flex space-x-3">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          placeholder="Describe your design..."
          className="flex-1 px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300 transition-colors"
          disabled={isGenerating || isRefining}
        />
        <button 
          onClick={handleGenerate}
          disabled={isGenerating || isRefining || !prompt.trim()}
          className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:border-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating...</span>
            </div>
          ) : 'Generate'}
        </button>
      </div>

      {/* Progress and Status Messages */}
      {(isGenerating || isRefining) && generationProgress && (
        <div className="text-xs text-blue-600 text-center bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{generationProgress}</span>
          </div>
          <div className="mt-1 text-gray-500">
            🎨 This may take 30-60 seconds
          </div>
        </div>
      )}

      {success && (
        <div className="text-xs text-green-600 text-center bg-green-50 p-3 rounded-lg border border-green-200">
          {success}
        </div>
      )}

      {/* Modification Prompt with inline button */}
      <div className="flex space-x-3">
        <input
          value={modifyPrompt}
          onChange={(e) => setModifyPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleModify()}
          placeholder="Modify design..."
          className="flex-1 px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300 transition-colors"
          disabled={isGenerating || isRefining || !currentImage || !canRefine}
        />
        <button 
          onClick={handleModify}
          disabled={isGenerating || isRefining || !modifyPrompt.trim() || !currentImage || !canRefine}
          className="px-6 py-2.5 text-sm font-medium text-white bg-purple-600 border border-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:border-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isRefining ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Refining...</span>
            </div>
          ) : 'Refine'}
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-600 text-center bg-red-50 p-3 rounded-lg border border-red-200">
          <div className="font-medium">❌ Error</div>
          <div className="mt-1">{error}</div>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Color Selection */}
      <div className="flex items-center justify-center space-x-8">
        <ColorWheel 
          selectedColor={tshirtColor}
          onColorChange={onTshirtColorChange}
        />
        <div className="grid grid-cols-2 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onTshirtColorChange(color)}
              className="w-7 h-7 rounded border border-gray-200 hover:border-gray-400 transition-colors"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Add to Cart */}
        <button 
          onClick={handleAddToCart}
          disabled={!currentImage}
          className="w-full px-4 py-3 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;