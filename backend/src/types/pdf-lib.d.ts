declare module 'pdf-lib' {
  export interface PDFDocument {
    addPage(dimensions?: [number, number]): PDFPage;
    save(): Promise<Uint8Array>;
    embedFont(font: any): Promise<any>;
  }

  export interface PDFPage {
    drawText(text: string, options: {
      x: number;
      y: number;
      size: number;
      font: any;
      color: any;
    }): void;
    drawRectangle(options: {
      x: number;
      y: number;
      width: number;
      height: number;
      color: any;
    }): void;
  }

  export function PDFDocument(): PDFDocument;
  export namespace PDFDocument {
    function create(): Promise<PDFDocument>;
  }
  export function rgb(r: number, g: number, b: number): any;
  export const StandardFonts: {
    Helvetica: any;
    HelveticaBold: any;
  };
}
