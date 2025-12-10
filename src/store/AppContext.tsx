import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// Types
export interface CartItem {
  id: string;
  imageUrl: string;
  tshirtColor: string;
  design: string;
  addedAt: string;
  price: number;
}

export interface AppState {
  // Design state
  generatedImage: string | null;
  refinedImage: string | null;
  currentImage: string | null; // The currently displayed image (generated or refined)
  lastPrompt: string;
  lastRefinementPrompt: string;
  
  // UI state
  isGenerating: boolean;
  isRefining: boolean;
  canRefine: boolean;
  hasGenerated: boolean;
  
  // T-shirt state
  tshirtColor: string;
  
  // Cart state
  cartItems: CartItem[];
  
  // Error/Success state
  error: string | null;
  success: string | null;
  generationProgress: string;
}

// Actions
export type AppAction =
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_REFINING'; payload: boolean }
  | { type: 'SET_GENERATED_IMAGE'; payload: string }
  | { type: 'SET_REFINED_IMAGE'; payload: string }
  | { type: 'SET_CURRENT_IMAGE'; payload: string }
  | { type: 'SET_LAST_PROMPT'; payload: string }
  | { type: 'SET_LAST_REFINEMENT_PROMPT'; payload: string }
  | { type: 'SET_CAN_REFINE'; payload: boolean }
  | { type: 'SET_HAS_GENERATED'; payload: boolean }
  | { type: 'SET_TSHIRT_COLOR'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SUCCESS'; payload: string | null }
  | { type: 'SET_GENERATION_PROGRESS'; payload: string }
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'LOAD_CART_ITEMS'; payload: CartItem[] }
  | { type: 'RESET_DESIGN_STATE' }
  | { type: 'LOAD_PERSISTED_STATE'; payload: Partial<AppState> };

// Initial state
const initialState: AppState = {
  generatedImage: null,
  refinedImage: null,
  currentImage: null,
  lastPrompt: '',
  lastRefinementPrompt: '',
  isGenerating: false,
  isRefining: false,
  canRefine: false,
  hasGenerated: false,
  tshirtColor: '#000000',
  cartItems: [],
  error: null,
  success: null,
  generationProgress: '',
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    
    case 'SET_REFINING':
      return { ...state, isRefining: action.payload };
    
    case 'SET_GENERATED_IMAGE':
      return { 
        ...state, 
        generatedImage: action.payload,
        currentImage: action.payload,
        hasGenerated: true,
        canRefine: true
      };
    
    case 'SET_REFINED_IMAGE':
      return { 
        ...state, 
        refinedImage: action.payload,
        currentImage: action.payload
      };
    
    case 'SET_CURRENT_IMAGE':
      return { ...state, currentImage: action.payload };
    
    case 'SET_LAST_PROMPT':
      return { ...state, lastPrompt: action.payload };
    
    case 'SET_LAST_REFINEMENT_PROMPT':
      return { ...state, lastRefinementPrompt: action.payload };
    
    case 'SET_CAN_REFINE':
      return { ...state, canRefine: action.payload };
    
    case 'SET_HAS_GENERATED':
      return { ...state, hasGenerated: action.payload };
    
    case 'SET_TSHIRT_COLOR':
      return { ...state, tshirtColor: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_SUCCESS':
      return { ...state, success: action.payload };
    
    case 'SET_GENERATION_PROGRESS':
      return { ...state, generationProgress: action.payload };
    
    case 'ADD_TO_CART':
      const newCartItems = [...state.cartItems, action.payload];
      // Persist to localStorage
      localStorage.setItem('cartItems', JSON.stringify(newCartItems));
      return { ...state, cartItems: newCartItems };
    
    case 'REMOVE_FROM_CART':
      const filteredItems = state.cartItems.filter(item => item.id !== action.payload);
      localStorage.setItem('cartItems', JSON.stringify(filteredItems));
      return { ...state, cartItems: filteredItems };
    
    case 'LOAD_CART_ITEMS':
      return { ...state, cartItems: action.payload };
    
    case 'RESET_DESIGN_STATE':
      return {
        ...state,
        generatedImage: null,
        refinedImage: null,
        currentImage: null,
        lastPrompt: '',
        lastRefinementPrompt: '',
        isGenerating: false,
        isRefining: false,
        canRefine: false,
        hasGenerated: false,
        error: null,
        success: null,
        generationProgress: '',
      };
    
    case 'LOAD_PERSISTED_STATE':
      return { ...state, ...action.payload };
    
    default:
      return state;
  }
}

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load persisted state on mount
  useEffect(() => {
    try {
      // Load cart items
      const savedCartItems = localStorage.getItem('cartItems');
      if (savedCartItems) {
        const cartItems = JSON.parse(savedCartItems);
        dispatch({ type: 'LOAD_CART_ITEMS', payload: cartItems });
      }

      // Load design state
      const savedDesignState = localStorage.getItem('designState');
      if (savedDesignState) {
        const designState = JSON.parse(savedDesignState);
        dispatch({ type: 'LOAD_PERSISTED_STATE', payload: designState });
      }

      // Load T-shirt color
      const savedTshirtColor = localStorage.getItem('tshirtColor');
      if (savedTshirtColor) {
        dispatch({ type: 'SET_TSHIRT_COLOR', payload: savedTshirtColor });
      }
    } catch (error) {
      console.error('Error loading persisted state:', error);
    }
  }, []);

  // Persist design state whenever it changes
  useEffect(() => {
    const designState = {
      generatedImage: state.generatedImage,
      refinedImage: state.refinedImage,
      currentImage: state.currentImage,
      lastPrompt: state.lastPrompt,
      lastRefinementPrompt: state.lastRefinementPrompt,
      canRefine: state.canRefine,
      hasGenerated: state.hasGenerated,
    };
    
    localStorage.setItem('designState', JSON.stringify(designState));
  }, [
    state.generatedImage,
    state.refinedImage,
    state.currentImage,
    state.lastPrompt,
    state.lastRefinementPrompt,
    state.canRefine,
    state.hasGenerated,
  ]);

  // Persist T-shirt color
  useEffect(() => {
    localStorage.setItem('tshirtColor', state.tshirtColor);
  }, [state.tshirtColor]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook to use the context
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

// Helper hooks for specific functionality
export function useDesignState() {
  const { state, dispatch } = useAppContext();
  
  return {
    generatedImage: state.generatedImage,
    refinedImage: state.refinedImage,
    currentImage: state.currentImage,
    lastPrompt: state.lastPrompt,
    lastRefinementPrompt: state.lastRefinementPrompt,
    canRefine: state.canRefine,
    hasGenerated: state.hasGenerated,
    isGenerating: state.isGenerating,
    isRefining: state.isRefining,
    error: state.error,
    success: state.success,
    generationProgress: state.generationProgress,
    
    setGenerating: (value: boolean) => dispatch({ type: 'SET_GENERATING', payload: value }),
    setRefining: (value: boolean) => dispatch({ type: 'SET_REFINING', payload: value }),
    setGeneratedImage: (url: string) => dispatch({ type: 'SET_GENERATED_IMAGE', payload: url }),
    setRefinedImage: (url: string) => dispatch({ type: 'SET_REFINED_IMAGE', payload: url }),
    setCurrentImage: (url: string) => dispatch({ type: 'SET_CURRENT_IMAGE', payload: url }),
    setLastPrompt: (prompt: string) => dispatch({ type: 'SET_LAST_PROMPT', payload: prompt }),
    setLastRefinementPrompt: (prompt: string) => dispatch({ type: 'SET_LAST_REFINEMENT_PROMPT', payload: prompt }),
    setError: (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }),
    setSuccess: (success: string | null) => dispatch({ type: 'SET_SUCCESS', payload: success }),
    setGenerationProgress: (progress: string) => dispatch({ type: 'SET_GENERATION_PROGRESS', payload: progress }),
    resetDesignState: () => dispatch({ type: 'RESET_DESIGN_STATE' }),
  };
}

export function useCartState() {
  const { state, dispatch } = useAppContext();
  
  return {
    cartItems: state.cartItems,
    addToCart: (item: CartItem) => dispatch({ type: 'ADD_TO_CART', payload: item }),
    removeFromCart: (id: string) => dispatch({ type: 'REMOVE_FROM_CART', payload: id }),
  };
}

export function useTshirtState() {
  const { state, dispatch } = useAppContext();
  
  return {
    tshirtColor: state.tshirtColor,
    setTshirtColor: (color: string) => dispatch({ type: 'SET_TSHIRT_COLOR', payload: color }),
  };
}