/**
 * Enhanced T-shirt Compositing Engine
 * Implements Requirements 6.1, 6.2, 6.3, 6.4, 6.5 for realistic fabric integration
 * 
 * This module provides advanced compositing functions that eliminate the "sticker/pasted" look
 * by implementing realistic fabric texture blending, light interaction simulation, warp mapping,
 * and subtle ink bleed effects for professional T-shirt mockup generation.
 */

import sharp from 'sharp';
import { createCanvas, loadImage, Image } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Enhanced Compositing Engine Class
 * Provides comprehensive T-shirt design compositing with realistic fabric integration
 */
export class EnhancedCompositingEngine {
  constructor() {
    this.fabricTextures = new Map();
    this.blendingModes = {
      MULTIPLY: 'multiply',
      OVERLAY: 'overlay',
      SOFT_LIGHT: 'soft-light',
      NORMAL: 'source-over',
      SCREEN: 'screen',
      COLOR_BURN: 'color-burn',
      COLOR_DODGE: 'color-dodge'
    };
    
    // Initialize fabric texture cache
    this.initializeFabricTextures();
  }

  /**
   * Initialize fabric texture cache for different T-shirt materials
   * Requirement 6.2: Implement realistic fabric texture blending
   */
  async initializeFabricTextures() {
    const textureDir = path.join(__dirname, '../public/textures');
    
    // Default fabric textures for different materials
    const defaultTextures = {
      cotton: this.generateCottonTexture(),
      polyester: this.generatePolyesterTexture(),
      blend: this.generateBlendTexture(),
      vintage: this.generateVintageTexture()
    };
    
    for (const [material, textureData] of Object.entries(defaultTextures)) {
      this.fabricTextures.set(material, textureData);
    }
    
    console.log('✅ Enhanced Compositing Engine initialized with fabric textures');
  }

  /**
   * Main compositing function - generates realistic T-shirt mockup
   * Requirement 6.1: Blend designs with realistic fabric texture interaction
   */
  async generateEnhancedMockup(designImageUrl, tshirtConfig, options = {}) {
    try {
      console.log('🎨 Starting enhanced T-shirt compositing...');
      console.log(`   - Design: ${designImageUrl}`);
      console.log(`   - T-shirt: ${tshirtConfig.color} ${tshirtConfig.material} ${tshirtConfig.style}`);

      // Load design and T-shirt base images
      const designImage = await this.loadImageFromUrl(designImageUrl);
      const tshirtBase = await this.loadTShirtBase(tshirtConfig);
      
      // Create high-resolution canvas for compositing
      const canvas = createCanvas(tshirtBase.width, tshirtBase.height);
      const ctx = canvas.getContext('2d');
      
      // Step 1: Apply T-shirt base with color
      await this.applyTShirtBase(ctx, tshirtBase, tshirtConfig);
      
      // Step 2: Apply fabric texture blending (Requirement 6.2)
      await this.applyFabricTextureBlending(ctx, tshirtConfig, canvas.width, canvas.height);
      
      // Step 3: Simulate fabric light interaction (Requirement 6.2)
      await this.simulateFabricLightInteraction(ctx, tshirtConfig, options.lightingConfig);
      
      // Step 4: Apply warp mapping for natural fold following (Requirement 6.3)
      const warpedDesign = await this.applyWarpMapping(designImage, tshirtConfig, options.foldPattern);
      
      // Step 5: Apply design with advanced blending modes (Requirement 6.1)
      await this.applyDesignWithAdvancedBlending(ctx, warpedDesign, tshirtConfig, options);
      
      // Step 6: Add subtle ink bleed effects (Requirement 6.4)
      await this.addInkBleedEffects(ctx, warpedDesign, tshirtConfig, options.inkEffects);
      
      // Step 7: Apply final fabric interaction layer (Requirement 6.2)
      await this.applyFinalFabricInteraction(ctx, tshirtConfig);
      
      // Convert canvas to buffer and return
      const buffer = canvas.toBuffer('image/png');
      
      console.log('✅ Enhanced T-shirt compositing completed');
      return buffer;
      
    } catch (error) {
      console.error('❌ Enhanced compositing error:', error.message);
      throw new Error(`Enhanced compositing failed: ${error.message}`);
    }
  }

  /**
   * Load image from URL with error handling
   */
  async loadImageFromUrl(imageUrl) {
    try {
      if (imageUrl.startsWith('http')) {
        // External URL - use sharp to download and process
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        return await loadImage(Buffer.from(buffer));
      } else {
        // Local file
        return await loadImage(imageUrl);
      }
    } catch (error) {
      throw new Error(`Failed to load image from ${imageUrl}: ${error.message}`);
    }
  }

  /**
   * Load T-shirt base image with proper sizing
   */
  async loadTShirtBase(tshirtConfig) {
    const basePath = path.join(__dirname, '../public/mockups');
    let baseFile = 'tshirt.png'; // Default
    
    // Select appropriate base based on style
    switch (tshirtConfig.style) {
      case 'v-neck':
        baseFile = 'tshirt-vneck.png';
        break;
      case 'long-sleeve':
        baseFile = 'tshirt-longsleeve.png';
        break;
      case 'tank-top':
        baseFile = 'tank-top.png';
        break;
      default:
        baseFile = 'tshirt.png';
    }
    
    const fullPath = path.join(basePath, baseFile);
    
    // Use default if specific style not found
    if (!fs.existsSync(fullPath)) {
      return await loadImage(path.join(basePath, 'tshirt.png'));
    }
    
    return await loadImage(fullPath);
  }

  /**
   * Apply T-shirt base with color blending
   * Requirement 6.1: Realistic fabric texture interaction
   */
  async applyTShirtBase(ctx, tshirtBase, tshirtConfig) {
    // Draw base T-shirt
    ctx.drawImage(tshirtBase, 0, 0);
    
    // Apply color with multiply blend for natural fabric coloring
    ctx.globalCompositeOperation = this.blendingModes.MULTIPLY;
    ctx.fillStyle = tshirtConfig.color;
    ctx.globalAlpha = 0.75;
    
    // Create mask from T-shirt shape
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
    
    // Add subtle color variation for fabric depth
    ctx.globalCompositeOperation = this.blendingModes.SOFT_LIGHT;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = this.adjustColorBrightness(tshirtConfig.color, 0.1);
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Reset composite operation
    ctx.globalCompositeOperation = this.blendingModes.NORMAL;
    ctx.globalAlpha = 1.0;
  }

  /**
   * Apply fabric texture blending for realistic material appearance
   * Requirement 6.2: Implement realistic fabric texture blending using advanced blending modes
   */
  async applyFabricTextureBlending(ctx, tshirtConfig, width, height) {
    const fabricTexture = this.fabricTextures.get(tshirtConfig.material) || 
                         this.fabricTextures.get('cotton');
    
    if (!fabricTexture) return;
    
    // Create fabric texture pattern
    const textureCanvas = createCanvas(256, 256);
    const textureCtx = textureCanvas.getContext('2d');
    
    // Generate procedural fabric texture based on material
    await this.generateFabricTexture(textureCtx, tshirtConfig.material, 256, 256);
    
    // Apply texture with appropriate blending
    ctx.save();
    ctx.globalCompositeOperation = this.blendingModes.MULTIPLY;
    ctx.globalAlpha = this.getFabricTextureOpacity(tshirtConfig.material);
    
    // Tile texture across T-shirt area
    const pattern = ctx.createPattern(textureCanvas, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    }
    
    ctx.restore();
    
    // Add secondary texture layer for depth
    ctx.save();
    ctx.globalCompositeOperation = this.blendingModes.OVERLAY;
    ctx.globalAlpha = 0.15;
    
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    }
    
    ctx.restore();
  }

  /**
   * Simulate fabric light interaction with proper shadows and highlights
   * Requirement 6.2: Add fabric light interaction simulation with proper shadows and highlights
   */
  async simulateFabricLightInteraction(ctx, tshirtConfig, lightingConfig = {}) {
    const lighting = {
      ambientIntensity: lightingConfig.ambientIntensity || 0.3,
      directionalLight: {
        angle: lightingConfig.directionalLight?.angle || 45,
        intensity: lightingConfig.directionalLight?.intensity || 0.7,
        color: lightingConfig.directionalLight?.color || '#ffffff'
      },
      shadows: {
        enabled: lightingConfig.shadows?.enabled !== false,
        softness: lightingConfig.shadows?.softness || 0.5,
        opacity: lightingConfig.shadows?.opacity || 0.3
      }
    };
    
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    
    // Create lighting gradient based on directional light
    const lightAngleRad = (lighting.directionalLight.angle * Math.PI) / 180;
    const lightX = Math.cos(lightAngleRad);
    const lightY = Math.sin(lightAngleRad);
    
    // Apply ambient lighting
    ctx.save();
    ctx.globalCompositeOperation = this.blendingModes.OVERLAY;
    ctx.globalAlpha = lighting.ambientIntensity;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    
    // Apply directional lighting highlights
    ctx.save();
    ctx.globalCompositeOperation = this.blendingModes.SOFT_LIGHT;
    ctx.globalAlpha = lighting.directionalLight.intensity * 0.4;
    
    const highlightGradient = ctx.createLinearGradient(
      width * 0.3, height * 0.2,
      width * 0.7, height * 0.8
    );
    highlightGradient.addColorStop(0, lighting.directionalLight.color);
    highlightGradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = highlightGradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    
    // Apply shadows if enabled
    if (lighting.shadows.enabled) {
      ctx.save();
      ctx.globalCompositeOperation = this.blendingModes.MULTIPLY;
      ctx.globalAlpha = lighting.shadows.opacity;
      
      const shadowGradient = ctx.createLinearGradient(
        width * 0.7, height * 0.8,
        width * 0.3, height * 0.2
      );
      shadowGradient.addColorStop(0, '#000000');
      shadowGradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = shadowGradient;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
    
    // Add fabric-specific light scattering
    await this.addFabricLightScattering(ctx, tshirtConfig.material);
  }

  /**
   * Apply warp mapping to follow T-shirt folds naturally
   * Requirement 6.3: Create warp mapping functionality to follow T-shirt folds naturally
   */
  async applyWarpMapping(designImage, tshirtConfig, foldPattern = {}) {
    const pattern = {
      type: foldPattern.type || 'hanging',
      intensity: foldPattern.intensity || 0.3,
      areas: foldPattern.areas || this.getDefaultFoldAreas(tshirtConfig.style)
    };
    
    // Create canvas for warped design
    const canvas = createCanvas(designImage.width, designImage.height);
    const ctx = canvas.getContext('2d');
    
    // Apply warp transformation based on fold pattern
    switch (pattern.type) {
      case 'hanging':
        await this.applyHangingWarp(ctx, designImage, pattern);
        break;
      case 'flat':
        await this.applyFlatWarp(ctx, designImage, pattern);
        break;
      case 'worn':
        await this.applyWornWarp(ctx, designImage, pattern);
        break;
      default:
        // No warp - draw design as-is
        ctx.drawImage(designImage, 0, 0);
    }
    
    return canvas;
  }

  /**
   * Apply hanging warp for natural draping effect
   */
  async applyHangingWarp(ctx, designImage, pattern) {
    const width = designImage.width;
    const height = designImage.height;
    
    // Create subtle curve for hanging fabric
    const segments = 20;
    const segmentHeight = height / segments;
    
    for (let i = 0; i < segments; i++) {
      const y = i * segmentHeight;
      const progress = i / segments;
      
      // Calculate warp offset (subtle curve)
      const warpOffset = Math.sin(progress * Math.PI) * pattern.intensity * 10;
      
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y, width, segmentHeight);
      ctx.clip();
      
      // Apply slight horizontal offset for hanging effect
      ctx.drawImage(
        designImage,
        warpOffset, y - (i * 0.5), // Slight vertical compression
        width, segmentHeight + 1
      );
      
      ctx.restore();
    }
  }

  /**
   * Apply design with advanced blending modes for realistic integration
   * Requirement 6.1: Eliminate the "sticker/pasted" look through proper blending modes
   */
  async applyDesignWithAdvancedBlending(ctx, designCanvas, tshirtConfig, options = {}) {
    const blendingConfig = {
      primaryBlend: options.primaryBlend || this.blendingModes.OVERLAY,
      secondaryBlend: options.secondaryBlend || this.blendingModes.SOFT_LIGHT,
      primaryOpacity: options.primaryOpacity || 0.92,
      secondaryOpacity: options.secondaryOpacity || 0.65
    };
    
    // Calculate design position (centered on chest area)
    const designWidth = options.designWidth || 150;
    const designHeight = options.designHeight || 150;
    const designX = options.designX || (ctx.canvas.width / 2 - designWidth / 2);
    const designY = options.designY || (ctx.canvas.height * 0.4);
    
    // Primary design layer with fabric interaction
    ctx.save();
    ctx.globalCompositeOperation = blendingConfig.primaryBlend;
    ctx.globalAlpha = blendingConfig.primaryOpacity;
    
    // Apply subtle contrast and saturation adjustments for fabric integration
    ctx.filter = 'contrast(1.05) brightness(0.97) saturate(1.1)';
    
    ctx.drawImage(
      designCanvas,
      designX, designY,
      designWidth, designHeight
    );
    
    ctx.restore();
    
    // Secondary layer for ink absorption simulation
    ctx.save();
    ctx.globalCompositeOperation = blendingConfig.secondaryBlend;
    ctx.globalAlpha = blendingConfig.secondaryOpacity;
    
    // Apply slight blur for ink diffusion effect
    ctx.filter = 'blur(0.4px)';
    
    ctx.drawImage(
      designCanvas,
      designX, designY,
      designWidth, designHeight
    );
    
    ctx.restore();
    
    // Reset filter
    ctx.filter = 'none';
  }

  /**
   * Add subtle ink bleed effects for realistic printing appearance
   * Requirement 6.4: Add subtle ink bleed effects for realistic printing appearance
   */
  async addInkBleedEffects(ctx, designCanvas, tshirtConfig, inkEffects = {}) {
    const effects = {
      bleedRadius: inkEffects.bleedRadius || 2,
      opacity: inkEffects.opacity || 0.3,
      colorShift: inkEffects.colorShift || 0.1
    };
    
    // Only apply ink bleed for certain materials
    const materialBleedFactors = {
      cotton: 1.0,
      polyester: 0.3,
      blend: 0.7,
      vintage: 1.2
    };
    
    const bleedFactor = materialBleedFactors[tshirtConfig.material] || 0.7;
    const adjustedBleedRadius = effects.bleedRadius * bleedFactor;
    
    if (adjustedBleedRadius < 0.5) return; // Skip if minimal bleed
    
    // Calculate design position
    const designWidth = 150;
    const designHeight = 150;
    const designX = ctx.canvas.width / 2 - designWidth / 2;
    const designY = ctx.canvas.height * 0.4;
    
    // Create ink bleed effect
    ctx.save();
    ctx.globalCompositeOperation = this.blendingModes.MULTIPLY;
    ctx.globalAlpha = effects.opacity * bleedFactor;
    
    // Apply blur for ink bleeding
    ctx.filter = `blur(${adjustedBleedRadius}px)`;
    
    // Slightly darker version for ink absorption
    ctx.filter += ' brightness(0.9) saturate(1.1)';
    
    ctx.drawImage(
      designCanvas,
      designX - adjustedBleedRadius,
      designY - adjustedBleedRadius,
      designWidth + (adjustedBleedRadius * 2),
      designHeight + (adjustedBleedRadius * 2)
    );
    
    ctx.restore();
    
    // Add subtle color bleeding for specific ink types
    await this.addColorBleeding(ctx, designCanvas, tshirtConfig, effects);
  }

  /**
   * Add color bleeding effects for different ink types
   */
  async addColorBleeding(ctx, designCanvas, tshirtConfig, effects) {
    // Create subtle color bleeding around edges
    ctx.save();
    ctx.globalCompositeOperation = this.blendingModes.COLOR_BURN;
    ctx.globalAlpha = effects.opacity * 0.5;
    
    const designWidth = 150;
    const designHeight = 150;
    const designX = ctx.canvas.width / 2 - designWidth / 2;
    const designY = ctx.canvas.height * 0.4;
    
    // Apply color shift filter
    const hueShift = effects.colorShift * 10; // Convert to degrees
    ctx.filter = `hue-rotate(${hueShift}deg) blur(1px)`;
    
    ctx.drawImage(
      designCanvas,
      designX - 1, designY - 1,
      designWidth + 2, designHeight + 2
    );
    
    ctx.restore();
  }

  /**
   * Apply final fabric interaction layer
   * Requirement 6.2: Final fabric texture integration
   */
  async applyFinalFabricInteraction(ctx, tshirtConfig) {
    // Add subtle fabric weave pattern over the entire design
    const weaveIntensity = this.getFabricWeaveIntensity(tshirtConfig.material);
    
    if (weaveIntensity > 0) {
      ctx.save();
      ctx.globalCompositeOperation = this.blendingModes.OVERLAY;
      ctx.globalAlpha = weaveIntensity;
      
      // Create fine weave pattern
      const weavePattern = await this.generateWeavePattern(tshirtConfig.material);
      if (weavePattern) {
        const pattern = ctx.createPattern(weavePattern, 'repeat');
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
      }
      
      ctx.restore();
    }
  }

  /**
   * Generate fabric-specific textures
   */
  generateCottonTexture() {
    return {
      type: 'cotton',
      roughness: 0.7,
      absorption: 0.8,
      weavePattern: 'plain',
      fiberDensity: 'medium'
    };
  }

  generatePolyesterTexture() {
    return {
      type: 'polyester',
      roughness: 0.3,
      absorption: 0.2,
      weavePattern: 'smooth',
      fiberDensity: 'high'
    };
  }

  generateBlendTexture() {
    return {
      type: 'blend',
      roughness: 0.5,
      absorption: 0.5,
      weavePattern: 'mixed',
      fiberDensity: 'medium'
    };
  }

  generateVintageTexture() {
    return {
      type: 'vintage',
      roughness: 0.9,
      absorption: 1.0,
      weavePattern: 'worn',
      fiberDensity: 'low'
    };
  }

  /**
   * Generate procedural fabric texture
   */
  async generateFabricTexture(ctx, material, width, height) {
    const texture = this.fabricTextures.get(material);
    if (!texture) return;
    
    // Create base noise pattern
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % width;
      const y = Math.floor((i / 4) / width);
      
      // Generate fabric-specific noise
      const noise = this.generateFabricNoise(x, y, texture);
      
      data[i] = noise.r;     // Red
      data[i + 1] = noise.g; // Green
      data[i + 2] = noise.b; // Blue
      data[i + 3] = noise.a; // Alpha
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Generate fabric-specific noise pattern
   */
  generateFabricNoise(x, y, texture) {
    const scale = 0.1;
    const noise = this.perlinNoise(x * scale, y * scale);
    
    // Adjust noise based on fabric properties
    const intensity = 128 + (noise * 127 * texture.roughness);
    
    return {
      r: intensity,
      g: intensity,
      b: intensity,
      a: 255
    };
  }

  /**
   * Simple Perlin noise implementation for texture generation
   */
  perlinNoise(x, y) {
    // Simplified noise function - in production, use a proper noise library
    return Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 + 
           Math.sin(x * 0.05) * Math.cos(y * 0.05) * 0.3 +
           Math.sin(x * 0.2) * Math.cos(y * 0.2) * 0.2;
  }

  /**
   * Get fabric texture opacity based on material
   */
  getFabricTextureOpacity(material) {
    const opacities = {
      cotton: 0.25,
      polyester: 0.15,
      blend: 0.20,
      vintage: 0.35
    };
    return opacities[material] || 0.20;
  }

  /**
   * Get fabric weave intensity
   */
  getFabricWeaveIntensity(material) {
    const intensities = {
      cotton: 0.15,
      polyester: 0.05,
      blend: 0.10,
      vintage: 0.25
    };
    return intensities[material] || 0.10;
  }

  /**
   * Generate weave pattern for fabric
   */
  async generateWeavePattern(material) {
    const canvas = createCanvas(64, 64);
    const ctx = canvas.getContext('2d');
    
    // Generate material-specific weave pattern
    switch (material) {
      case 'cotton':
        this.drawCottonWeave(ctx, 64, 64);
        break;
      case 'polyester':
        this.drawPolyesterWeave(ctx, 64, 64);
        break;
      case 'vintage':
        this.drawVintageWeave(ctx, 64, 64);
        break;
      default:
        this.drawDefaultWeave(ctx, 64, 64);
    }
    
    return canvas;
  }

  /**
   * Draw cotton weave pattern
   */
  drawCottonWeave(ctx, width, height) {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    
    // Draw simple weave pattern
    for (let i = 0; i < width; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    
    for (let i = 0; i < height; i += 4) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
  }

  /**
   * Draw polyester weave pattern (smoother)
   */
  drawPolyesterWeave(ctx, width, height) {
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, width, height);
    
    // Very subtle pattern for smooth polyester
    ctx.fillStyle = '#f0f0f0';
    for (let i = 0; i < width; i += 8) {
      for (let j = 0; j < height; j += 8) {
        if ((i + j) % 16 === 0) {
          ctx.fillRect(i, j, 2, 2);
        }
      }
    }
  }

  /**
   * Draw vintage weave pattern (more pronounced)
   */
  drawVintageWeave(ctx, width, height) {
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1;
    
    // More pronounced weave for vintage look
    for (let i = 0; i < width; i += 3) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    
    for (let i = 0; i < height; i += 3) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
    
    // Add some wear marks
    ctx.fillStyle = '#c0c0c0';
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  /**
   * Draw default weave pattern
   */
  drawDefaultWeave(ctx, width, height) {
    this.drawCottonWeave(ctx, width, height);
  }

  /**
   * Get default fold areas for T-shirt style
   */
  getDefaultFoldAreas(style) {
    const baseAreas = [
      { x: 0.2, y: 0.3, width: 0.6, height: 0.4, intensity: 0.3 },
      { x: 0.1, y: 0.6, width: 0.8, height: 0.3, intensity: 0.2 }
    ];
    
    switch (style) {
      case 'v-neck':
        return [
          ...baseAreas,
          { x: 0.4, y: 0.1, width: 0.2, height: 0.2, intensity: 0.4 } // V-neck fold
        ];
      case 'long-sleeve':
        return [
          ...baseAreas,
          { x: 0.0, y: 0.3, width: 0.2, height: 0.4, intensity: 0.3 }, // Left sleeve
          { x: 0.8, y: 0.3, width: 0.2, height: 0.4, intensity: 0.3 }  // Right sleeve
        ];
      default:
        return baseAreas;
    }
  }

  /**
   * Apply flat warp (minimal distortion)
   */
  async applyFlatWarp(ctx, designImage, pattern) {
    // Minimal warp for flat-laid T-shirt
    ctx.drawImage(designImage, 0, 0);
    
    // Add very subtle perspective correction
    if (pattern.intensity > 0.1) {
      const width = designImage.width;
      const height = designImage.height;
      
      // Slight trapezoidal correction
      const topOffset = pattern.intensity * 2;
      
      ctx.save();
      ctx.setTransform(
        1, 0,
        topOffset / height, 1,
        -topOffset / 2, 0
      );
      ctx.globalAlpha = 0.3;
      ctx.drawImage(designImage, 0, 0);
      ctx.restore();
    }
  }

  /**
   * Apply worn warp (body contours)
   */
  async applyWornWarp(ctx, designImage, pattern) {
    const width = designImage.width;
    const height = designImage.height;
    
    // Simulate body contours
    const segments = 15;
    const segmentHeight = height / segments;
    
    for (let i = 0; i < segments; i++) {
      const y = i * segmentHeight;
      const progress = i / segments;
      
      // Create body curve (chest expansion)
      const chestCurve = Math.sin(progress * Math.PI) * pattern.intensity * 8;
      
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y, width, segmentHeight);
      ctx.clip();
      
      // Apply horizontal stretch for body contour
      const scaleX = 1 + (chestCurve / width);
      const offsetX = -chestCurve / 2;
      
      ctx.drawImage(
        designImage,
        offsetX, y,
        width * scaleX, segmentHeight + 1
      );
      
      ctx.restore();
    }
  }

  /**
   * Add fabric light scattering effects
   */
  async addFabricLightScattering(ctx, material) {
    const scatteringIntensity = {
      cotton: 0.1,
      polyester: 0.05,
      blend: 0.075,
      vintage: 0.15
    };
    
    const intensity = scatteringIntensity[material] || 0.1;
    
    if (intensity > 0) {
      ctx.save();
      ctx.globalCompositeOperation = this.blendingModes.SCREEN;
      ctx.globalAlpha = intensity;
      
      // Create subtle light scattering pattern
      const gradient = ctx.createRadialGradient(
        ctx.canvas.width * 0.5, ctx.canvas.height * 0.3,
        0,
        ctx.canvas.width * 0.5, ctx.canvas.height * 0.3,
        ctx.canvas.width * 0.6
      );
      
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      
      ctx.restore();
    }
  }

  /**
   * Adjust color brightness for fabric depth
   */
  adjustColorBrightness(color, factor) {
    // Simple color brightness adjustment
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const newR = Math.min(255, Math.max(0, r + (r * factor)));
    const newG = Math.min(255, Math.max(0, g + (g * factor)));
    const newB = Math.min(255, Math.max(0, b + (b * factor)));
    
    return `rgb(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)})`;
  }

  /**
   * Save enhanced mockup to file
   */
  async saveEnhancedMockup(buffer, filename) {
    const filepath = path.join(__dirname, 'designs', filename);
    fs.writeFileSync(filepath, buffer);
    return filepath;
  }
}

// Export singleton instance
export const enhancedCompositingEngine = new EnhancedCompositingEngine();

// Default export for CommonJS compatibility
export default EnhancedCompositingEngine;