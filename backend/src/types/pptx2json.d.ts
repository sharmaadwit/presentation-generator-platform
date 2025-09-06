declare module 'pptx2json' {
  interface SlideShape {
    text?: string;
    type?: string;
    [key: string]: any;
  }

  interface Slide {
    shapes?: SlideShape[];
    [key: string]: any;
  }

  interface PptxData {
    slides?: Slide[];
    [key: string]: any;
  }

  function pptx2json(filePath: string): Promise<PptxData>;
  export = pptx2json;
}
