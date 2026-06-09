import type { CanvasElement, CanvasState } from '@/types'
import JsBarcode from 'jsbarcode'

const MM_TO_PX_96DPI = 3.7795275591

export function renderElementsToCanvas(
  elements: CanvasElement[],
  canvasState: CanvasState,
  includeBleed: boolean = true,
  bleedMm: number = 0
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const targetDpi = canvasState.exportDpi || 300
  const dpr = Math.max(1, targetDpi / 96)
  const bleedPx = includeBleed && bleedMm > 0 ? bleedMm * MM_TO_PX_96DPI * dpr : 0
  const w = canvasState.width * dpr + bleedPx * 2
  const h = canvasState.height * dpr + bleedPx * 2
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  ctx.scale(1, 1)
  ctx.fillStyle = canvasState.backgroundColor || '#ffffff'
  ctx.fillRect(0, 0, w, h)

  if (includeBleed && bleedPx > 0) {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)'
    ctx.setLineDash([8 * dpr, 4 * dpr])
    ctx.lineWidth = Math.max(1, 1 * dpr)
    ctx.strokeRect(
      bleedPx + 0.5,
      bleedPx + 0.5,
      canvasState.width * dpr - 1,
      canvasState.height * dpr - 1
    )
    ctx.setLineDash([])
  }

  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex)
  for (const el of sorted) {
    ctx.save()
    const ew = el.width * dpr
    const eh = el.height * dpr
    const ex = bleedPx + el.x * dpr
    const ey = bleedPx + el.y * dpr
    const cx = ex + ew / 2
    const cy = ey + eh / 2
    ctx.translate(cx, cy)
    ctx.rotate((el.rotation || 0) * Math.PI / 180)
    ctx.translate(-cx, -cy)

    if (el.type === 'shape') {
      ctx.fillStyle = el.fill || '#000'
      if (el.shapeType === 'circle') {
        ctx.beginPath()
        ctx.ellipse(ex + ew / 2, ey + eh / 2, ew / 2, eh / 2, 0, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(ex, ey, ew, eh)
      }
    } else if (el.type === 'text') {
      ctx.fillStyle = el.color || '#000'
      const fontSizePx = (el.fontSize || 16) * dpr
      ctx.font = `${el.fontWeight || 'normal'} ${fontSizePx}px ${el.fontFamily || 'sans-serif'}`
      ctx.textBaseline = 'top'
      const align = el.textAlign || 'left'
      if (align === 'center') {
        ctx.textAlign = 'center'
        drawMultilineText(ctx, el.content || '', ex + ew / 2, ey, ew, eh, fontSizePx)
      } else if (align === 'right') {
        ctx.textAlign = 'right'
        drawMultilineText(ctx, el.content || '', ex + ew, ey, ew, eh, fontSizePx)
      } else {
        ctx.textAlign = 'left'
        drawMultilineText(ctx, el.content || '', ex, ey, ew, eh, fontSizePx)
      }
    } else if (el.type === 'image' && el.src) {
      const img = document.createElement('img')
      img.src = el.src
      if (img.complete) {
        ctx.drawImage(img, ex, ey, ew, eh)
      }
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

function drawMultilineText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  _maxWidth: number,
  _maxHeight: number,
  fontSize: number
) {
  const lines = text.split('\n')
  const lineHeight = fontSize * 1.3
  lines.forEach((line, i) => {
    ctx.fillText(line, x, y + i * lineHeight)
  })
}

export function generateBarcode(value: string, format: string, width: number, height: number): HTMLCanvasElement | null {
  if (!value) return null
  const canvas = document.createElement('canvas')
  try {
    const dprGuess = width > 400 ? 2 : 1
    canvas.width = Math.max(40, width * dprGuess)
    canvas.height = Math.max(40, height * dprGuess)
    const ctx = canvas.getContext('2d')!
    ctx.scale(1, 1)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    JsBarcode(canvas, value, {
      format: (format as any) || 'CODE128',
      width: Math.max(1, Math.floor(width / Math.max(20, value.length * 2 + 10))),
      height: Math.max(30, height * 0.7),
      displayValue: true,
      fontSize: Math.max(8, Math.floor(height * 0.2)),
      margin: 4,
      background: '#ffffff',
      lineColor: '#000000',
    })
    return canvas
  } catch (e) {
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
