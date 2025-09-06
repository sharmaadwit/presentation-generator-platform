// Enhanced styling interfaces for presentation generation

export interface SlideImage {
  id: string;
  url: string;
  data?: Buffer;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  type: 'image' | 'chart' | 'diagram' | 'logo';
  altText?: string;
}

export interface SlideChart {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'area';
  data: any[];
  options: {
    title?: string;
    xAxis?: any;
    yAxis?: any;
    legend?: any;
    colors?: string[];
    [key: string]: any;
  };
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
}

export interface LayoutData {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
}

export interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontStyle?: 'normal' | 'italic' | 'oblique';
  textColor?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textDecoration?: 'none' | 'underline' | 'line-through';
  lineHeight?: number;
  letterSpacing?: number;
  wordSpacing?: number;
}

export interface EnhancedSlideData {
  // Basic content
  content: string;
  title: string;
  slideType: 'title' | 'content' | 'chart' | 'image' | 'conclusion';
  
  // Styling information
  textStyle?: TextStyle;
  layout?: LayoutData;
  
  // Visual elements
  images?: SlideImage[];
  charts?: SlideChart[];
  
  // Source information
  sourceTitle?: string;
  industry?: string;
  tags?: string[];
  relevanceScore?: number;
  
  // Metadata
  originalSlideIndex?: number;
  extractedAt?: Date;
}

export interface StylingPreservationConfig {
  preserveFonts: boolean;
  preserveColors: boolean;
  preserveImages: boolean;
  preserveCharts: boolean;
  preserveLayout: boolean;
  fallbackToDefault: boolean;
}

export interface PowerPointGenerationOptions {
  useOriginalStyling: boolean;
  stylingConfig: StylingPreservationConfig;
  defaultStyle?: {
    fontFamily: string;
    fontSize: number;
    textColor: string;
    backgroundColor: string;
  };
}

// Default styling configuration
export const DEFAULT_STYLING_CONFIG: StylingPreservationConfig = {
  preserveFonts: true,
  preserveColors: true,
  preserveImages: true,
  preserveCharts: true,
  preserveLayout: true,
  fallbackToDefault: true
};

// Default PowerPoint generation options
export const DEFAULT_PPTX_OPTIONS: PowerPointGenerationOptions = {
  useOriginalStyling: true,
  stylingConfig: DEFAULT_STYLING_CONFIG,
  defaultStyle: {
    fontFamily: 'Arial',
    fontSize: 16,
    textColor: '#000000',
    backgroundColor: '#FFFFFF'
  }
};
