import { jsPDF } from 'jspdf'
import type { CanvasElement, CanvasState, ExportConfig, OrderItem } from '@/types'
import { renderElementsToCanvas, saveOrDownload, canvasExportMmSize } from './canvasRenderer'
import { replacePlaceholders } from '@/store/useDesignStore'

export function exportDesignToPDF(
  elements: CanvasElement[],
  canvasState: CanvasState,
  config: ExportConfig,
  _filename: string = 'design.pdf'
): string {
  const bleedMm = config.bleed || 0
  const { widthMm, heightMm } = canvasExportMmSize(canvasState, bleedMm)
  const orientation = widthMm > heightMm ? 'landscape' : 'portrait'

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [widthMm, heightMm],
    hotfixes: ['px_scaling'],
  })

  const renderState = { ...canvasState, exportDpi: config.dpi || 300 }
  const canvas = renderElementsToCanvas(elements, renderState, bleedMm > 0, bleedMm)
  const imgData = canvas.toDataURL('image/png')

  pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm, undefined, 'FAST', 0)
  return pdf.output('datauristring') as string
}

export function exportImpositionToPDF(
  elements: CanvasElement[],
  canvasState: CanvasState,
  config: ExportConfig,
  _filename: string = 'design-imposition.pdf'
): string {
  const rows = config.impositionRows || 2
  const cols = config.impositionCols || 3
  const bleedMm = config.bleed || 0
  const gapMm = 2
  const { widthMm, heightMm } = canvasExportMmSize(canvasState, bleedMm)
  const sheetWidthMm = cols * widthMm + (cols + 1) * gapMm
  const sheetHeightMm = rows * heightMm + (rows + 1) * gapMm
  const orientation = sheetWidthMm > sheetHeightMm ? 'landscape' : 'portrait'

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [sheetWidthMm, sheetHeightMm],
    hotfixes: ['px_scaling'],
  })

  const renderState = { ...canvasState, exportDpi: config.dpi || 300 }
  const canvas = renderElementsToCanvas(elements, renderState, bleedMm > 0, bleedMm)
  const imgData = canvas.toDataURL('image/png')

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = gapMm + c * (widthMm + gapMm)
      const y = gapMm + r * (heightMm + gapMm)
      pdf.addImage(imgData, 'PNG', x, y, widthMm, heightMm, undefined, 'FAST', 0)
    }
  }
  return pdf.output('datauristring') as string
}

export function exportMultiOrderToPDF(
  elements: CanvasElement[],
  canvasState: CanvasState,
  config: ExportConfig,
  orders: OrderItem[],
  _filename: string = 'batch-orders.pdf'
): string {
  if (!orders || orders.length === 0) {
    return exportDesignToPDF(elements, canvasState, config, _filename)
  }

  const bleedMm = config.bleed || 0
  const { widthMm, heightMm } = canvasExportMmSize(canvasState, bleedMm)
  const orientation = widthMm > heightMm ? 'landscape' : 'portrait'
  const renderState = { ...canvasState, exportDpi: config.dpi || 300 }

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [widthMm, heightMm],
    hotfixes: ['px_scaling'],
  })

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i]
    const replaced = replacePlaceholders(elements, order)
    const canvas = renderElementsToCanvas(replaced, renderState, bleedMm > 0, bleedMm)
    const imgData = canvas.toDataURL('image/png')

    if (i > 0) pdf.addPage([widthMm, heightMm], orientation)
    pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm, undefined, 'FAST', 0)
  }

  return pdf.output('datauristring') as string
}

export function exportConfigToPDF(
  elements: CanvasElement[],
  canvasState: CanvasState,
  config: ExportConfig,
  orders: OrderItem[] = [],
  filename = 'design.pdf'
): string {
  if (config.format !== 'pdf') {
    throw new Error('config.format must be pdf')
  }
  switch (config.pdfMode) {
    case 'imposition':
      return exportImpositionToPDF(elements, canvasState, config, filename)
    case 'multi':
      return exportMultiOrderToPDF(elements, canvasState, config, orders, filename)
    case 'single':
    default:
      return exportDesignToPDF(elements, canvasState, config, filename)
  }
}

export async function saveOrDownloadPDF(
  dataUrl: string,
  filename: string
): Promise<string | null> {
  return saveOrDownload(dataUrl, filename)
}
