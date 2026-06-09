import type { CanvasElement, CanvasState } from '@/types'
import JsBarcode from 'jsbarcode'

export const MM_TO_PX_96DPI = 25.4 / 96

export function pxFromMm(mm: number, dpi: number = 96): number {
  return (mm / 25.4) * dpi
}

export function canvasExportPixelSize(
  canvasState: CanvasState,
  bleedMm: number = 0,
  dpi?: number
): { widthPx: number; heightPx: number; bleedPx: number } {
  const targetDpi = dpi || canvasState.exportDpi || 300
  const dpr = targetDpi / 96
  const bleedPx = bleedMm > 0 ? pxFromMm(bleedMm, targetDpi) : 0
  return {
    widthPx: Math.round(canvasState.width * dpr + bleedPx * 2),
    heightPx: Math.round(canvasState.height * dpr + bleedPx * 2),
    bleedPx: Math.round(bleedPx),
  }
}

export function canvasExportMmSize(
  canvasState: CanvasState,
  bleedMm: number = 0
): { widthMm: number; heightMm: number } {
  return {
    widthMm: (canvasState.width / 96) * 25.4 + bleedMm * 2,
    heightMm: (canvasState.height / 96) * 25.4 + bleedMm * 2,
  }
}

export function renderElementsToCanvas(
  elements: CanvasElement[],
  canvasState: CanvasState,
  includeBleed: boolean = true,
  bleedMm: number = 0
): HTMLCanvasElement {
  const targetDpi = canvasState.exportDpi || 300
  const dpr = Math.max(1, targetDpi / 96)
  const size = canvasExportPixelSize(canvasState, includeBleed ? bleedMm : 0, targetDpi)
  const bleedPx = size.bleedPx

  const canvas = document.createElement('canvas')
  canvas.width = size.widthPx
  canvas.height = size.heightPx
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  ctx.fillStyle = canvasState.backgroundColor || '#ffffff'
  ctx.fillRect(0, 0, size.widthPx, size.heightPx)

  if (includeBleed && bleedPx > 0) {
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)'
    ctx.setLineDash([8 * dpr, 4 * dpr])
    ctx.lineWidth = Math.max(1, Math.round(1 * dpr))
    ctx.strokeRect(
      bleedPx + 0.5,
      bleedPx + 0.5,
      size.widthPx - bleedPx * 2 - 1,
      size.heightPx - bleedPx * 2 - 1
    )
    ctx.restore()
  }

  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex)
  for (const el of sorted) {
    const ew = Math.max(1, el.width * dpr)
    const eh = Math.max(1, el.height * dpr)
    const ex = bleedPx + el.x * dpr
    const ey = bleedPx + el.y * dpr

    ctx.save()
    const cx = ex + ew / 2
    const cy = ey + eh / 2
    ctx.translate(cx, cy)
    ctx.rotate(((el.rotation || 0) * Math.PI) / 180)
    ctx.translate(-cx, -cy)

    if (el.type === 'shape') {
      ctx.fillStyle = el.fill || '#000000'
      if (el.shapeType === 'circle') {
        ctx.beginPath()
        ctx.ellipse(ex + ew / 2, ey + eh / 2, ew / 2, eh / 2, 0, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(ex, ey, ew, eh)
      }
    } else if (el.type === 'text') {
      drawScaledText(ctx, el, ex, ey, ew, eh, dpr)
    } else if (el.type === 'image' && el.src) {
      drawScaledImage(ctx, el.src, ex, ey, ew, eh)
    } else if (el.type === 'barcode' && el.barcodeValue) {
      const barcodeCanvas = generateBarcode(el.barcodeValue, el.barcodeFormat || 'CODE128', ew, eh)
      if (barcodeCanvas) {
        ctx.drawImage(barcodeCanvas, ex, ey, ew, eh)
      }
    }
    ctx.restore()
  }

  return canvas
}

function drawScaledText(
  ctx: CanvasRenderingContext2D,
  el: CanvasElement,
  ex: number,
  ey: number,
  ew: number,
  eh: number,
  dpr: number
) {
  const fontSizePx = Math.max(6, Math.round((el.fontSize || 16) * dpr))
  const fontWeight = el.fontWeight || 'normal'
  const fontFamily = el.fontFamily || 'sans-serif'
  ctx.fillStyle = el.color || '#000000'
  ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`
  ctx.textBaseline = 'alphabetic'

  const textAlign = el.textAlign || 'left'
  if (textAlign === 'center') ctx.textAlign = 'center'
  else if (textAlign === 'right') ctx.textAlign = 'right'
  else ctx.textAlign = 'left'

  const lines = (el.content || '').split('\n')
  const lineHeightPx = fontSizePx * 1.3
  const totalTextH = lines.length * lineHeightPx
  let textX = ex
  if (textAlign === 'center') textX = ex + ew / 2
  else if (textAlign === 'right') textX = ex + ew

  const verticalOffset = Math.max(0, (eh - totalTextH) / 2)
  const startY = ey + verticalOffset

  lines.forEach((line, i) => {
    ctx.fillText(line, textX, startY + i * lineHeightPx + fontSizePx * 0.85)
  })
}

function drawScaledImage(
  ctx: CanvasRenderingContext2D,
  src: string,
  ex: number,
  ey: number,
  ew: number,
  eh: number
) {
  try {
    const img = new Image()
    img.src = src
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, ex, ey, ew, eh)
    } else {
      ctx.fillStyle = '#f1f5f9'
      ctx.fillRect(ex, ey, ew, eh)
      ctx.fillStyle = '#94a3b8'
      ctx.font = `${Math.round(Math.min(ew, eh) * 0.15)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🖼️', ex + ew / 2, ey + eh / 2)
    }
  } catch (_) {
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(ex, ey, ew, eh)
  }
}

export function generateBarcode(
  value: string,
  format: string,
  width: number,
  height: number
): HTMLCanvasElement | null {
  if (!value) return null
  const canvas = document.createElement('canvas')
  try {
    const dprGuess = width > 400 ? 2 : 1
    canvas.width = Math.max(80, Math.floor(width * dprGuess))
    canvas.height = Math.max(40, Math.floor(height * dprGuess))
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const barWidth = Math.max(1, Math.floor(width / Math.max(20, value.length * 2.5 + 10)))
    JsBarcode(canvas, value, {
      format: (format as any) || 'CODE128',
      width: barWidth,
      height: Math.max(20, height * 0.7),
      displayValue: true,
      fontSize: Math.max(8, Math.floor(height * 0.2)),
      margin: Math.max(2, Math.floor(width * 0.02)),
      background: '#ffffff',
      lineColor: '#000000',
    })
    return canvas
  } catch (e) {
    console.warn('barcode failed:', e)
    return null
  }
}

export function canvasToPNG(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png')
}

export function canvasToJPG(canvas: HTMLCanvasElement, quality = 0.9): string {
  return canvas.toDataURL('image/jpeg', quality)
}

export function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

export function dataURLtoArrayBuffer(dataURL: string): ArrayBuffer {
  const arr = dataURL.split(',')
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return u8arr.buffer
}

export function downloadDataURL(dataURL: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataURL
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function saveOrDownload(dataURL: string, filename: string): Promise<string | null> {
  if (window.electronAPI?.saveFile) {
    try {
      const ab = dataURLtoArrayBuffer(dataURL)
      const result = await window.electronAPI.saveFile({
        defaultPath: filename,
        buffer: ab,
      })
      return result
    } catch (e) {
      console.warn('Electron save failed, falling back to download:', e)
      downloadDataURL(dataURL, filename)
      return null
    }
  } else {
    downloadDataURL(dataURL, filename)
    return null
  }
}

export interface BatchSaveItem {
  filename: string
  dataUrl: string
}

export async function saveOrDownloadBatch(items: BatchSaveItem[]): Promise<{ saved: number; folder?: string | null }> {
  if (window.electronAPI?.saveFiles) {
    try {
      const prepared = items.map(it => ({
        filename: it.filename,
        buffer: dataURLtoArrayBuffer(it.dataUrl),
      }))
      const result = await window.electronAPI.saveFiles(prepared)
      return { saved: result?.saved || 0, folder: result?.folder || null }
    } catch (e) {
      console.warn('Electron batch save failed, falling back to downloads:', e)
    }
  }
  for (let i = 0; i < items.length; i++) {
    downloadDataURL(items[i].dataUrl, items[i].filename)
    await new Promise(r => setTimeout(r, 80))
  }
  return { saved: items.length }
}
