export interface Template {
  id: string
  name: string
  category: 'box-sticker' | 'thank-you-card' | 'all'
  width: number
  height: number
  thumbnail: string
  tags: string[]
  isFavorite: boolean
  createdAt: string
  elements: CanvasElement[]
  colorScheme: ColorScheme
}

export interface ColorScheme {
  id: string
  name: string
  colors: string[]
  preview: string
}

export interface CanvasElement {
  id: string
  type: 'text' | 'image' | 'shape' | 'barcode'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
  content?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: string
  textAlign?: string
  color?: string
  src?: string
  shapeType?: 'rect' | 'circle' | 'line'
  fill?: string
  stroke?: string
  strokeWidth?: number
  barcodeValue?: string
  barcodeFormat?: string
}

export interface MaterialItem {
  id: string
  name: string
  category: string
  type: 'image' | 'icon' | 'pattern' | 'illustration'
  thumbnail: string
  url: string
  tags: string[]
  isUploaded?: boolean
}

export interface BrandAsset {
  id: string
  type: 'logo' | 'font' | 'color'
  name: string
  data: string
  thumbnail?: string
  createdAt: string
}

export interface OrderItem {
  id: string
  orderNo: string
  customerName: string
  productName: string
  quantity: number
  customFields?: Record<string, string>
}

export interface DesignVersion {
  id: string
  version: number
  name: string
  thumbnail: string
  createdAt: string
  elements: CanvasElement[]
  note?: string
}

export interface ExportConfig {
  format: 'png' | 'jpg' | 'pdf'
  dpi: number
  quality: number
  bleed: number
  colorMode: 'rgb' | 'cmyk'
  imposition: boolean
  impositionRows: number
  impositionCols: number
  pdfMode: 'single' | 'imposition' | 'multi'
}

export interface CanvasState {
  width: number
  height: number
  zoom: number
  showBleed: boolean
  bleedSize: number
  showGrid: boolean
  gridSize: number
  backgroundColor: string
  exportDpi?: number
}

export interface HistorySnapshot {
  elements: CanvasElement[]
  canvasState: CanvasState
}
