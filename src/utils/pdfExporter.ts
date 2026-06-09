import { jsPDF } from 'jspdf'
import type { CanvasElement, CanvasState, ExportConfig } from '@/types'
import { renderElementsToCanvas, saveOrDownload } from './canvasRenderer'

const PX_TO_MM = 25.4 / 96

export function exportDesignToPDF(
  elements: CanvasElement[],
  canvasState: CanvasState,
  config: ExportConfig,
  filename: string = 'design.pdf'
): string {
  const bleedMm = config.bleed || 0
  const widthPx = canvasState.width
  const heightPx = canvasState.height
  const dpiScale = (config.dpi || 300) / 96

  const widthMm = (widthPx / 96) * 25.4 + bleedMm * 2
  const heightMm = (heightPx / 96) * 25.4 + bleedMm * 2

  const orientation = widthMm > heightMm ? 'landscape' : 'portrait'
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [widthMm, heightMm],
  })

  const renderState = { ...canvasState, exportDpi: config.dpi || 300 }
  const canvas = renderElementsToCanvas(elements, renderState, bleedMm > 0, bleedMm)
  const imgData = canvas.toDataURL('image/png')

  pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm, undefined, 'FAST', 0)

  const out = pdf.output('datauristring')
  return out as string
}

export function exportImpositionToPDF(
  elements: CanvasElement[],
  canvasState: CanvasState,
  config: ExportConfig,
  filename: string = 'design-imposition.pdf'
): string {
  if (!config.imposition) {
    return exportDesignToPDF(elements, canvasState, config, filename)
  }

  const rows = config.impositionRows || 2
  const cols = config.impositionCols || 3
  const bleedMm = config.bleed || 0
  const gapMm = 2
  const widthMm = (canvasState.width / 96) * 25.4 + bleedMm * 2
  const heightMm = (canvasState.height / 96) * 25.4 + bleedMm * 2

  const sheetWidthMm = cols * widthMm + (cols + 1) * gapMm
  const sheetHeightMm = rows * heightMm + (rows + 1) * gapMm
  const orientation = sheetWidthMm > sheetHeightMm ? 'landscape' : 'portrait'

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [sheetWidthMm, sheetHeightMm],
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

  const out = pdf.output('datauristring')
  return out as string
}

export async function saveOrDownloadPDF(
  dataUrl: string,
  filename: string
): Promise<string | null> {
  return saveOrDownload(dataUrl, filename)
}
