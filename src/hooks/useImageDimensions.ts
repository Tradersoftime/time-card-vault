import { useState, useEffect } from 'react';

interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
  loading: boolean;
}

export const useImageDimensions = (imageUrl?: string): ImageDimensions => {
  const [dimensions, setDimensions] = useState<ImageDimensions>({
    width: 0,
    height: 0,
    aspectRatio: 0.75, // Default card aspect ratio
    loading: true,
  });

  useEffect(() => {
    if (!imageUrl) {
      setDimensions({
        width: 0,
        height: 0,
        aspectRatio: 0.75,
        loading: false,
      });
      return;
    }

    setDimensions(prev => ({ ...prev, loading: true }));

    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      setDimensions({
        width: img.width,
        height: img.height,
        aspectRatio,
        loading: false,
      });
    };
    
    img.onerror = () => {
      setDimensions({
        width: 0,
        height: 0,
        aspectRatio: 0.75,
        loading: false,
      });
    };
    
    img.src = imageUrl;
  }, [imageUrl]);

  return dimensions;
};

export const calculateCardDimensions = (
  aspectRatio: number,
  baseWidth: number = 200,
  maxWidth: number = 320,
  minWidth: number = 160
): { width: number; height: number } => {
  // Constrain width within bounds
  const width = Math.max(minWidth, Math.min(maxWidth, baseWidth));
  
  // Calculate height based on aspect ratio, with minimum height for text content
  const imageHeight = width / aspectRatio;
  const textAreaHeight = 80; // Space for card info
  const totalHeight = imageHeight + textAreaHeight;
  
  return {
    width,
    height: Math.max(totalHeight, 200), // Minimum total height
  };
};