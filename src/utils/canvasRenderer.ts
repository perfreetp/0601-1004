import type { CanvasElement, CanvasState } from '@/types'
import JsBarcode from 'jsbarcode'

export function renderElementsToCanvas(
  elements: CanvasElement[],
  canvasState: CanvasState,
  includeBleed: boolean = true
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const dpr = Math.max(1, (canvasState.exportDpi || 300) / 96)
  const bleedPx = includeBleed ? (canvasState.bleedSize || 0) * dpr * 3.78 : 0
  const w = canvasState.width * dpr + bleedPx * 2
  const h = canvasState.height * dpr + bleedPx * 2
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = canvasState.backgroundColor || '#ffffff'
  ctx.fillRect(0, 0, w, h)

  if (includeBleed && bleedPx > 0) {
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
    ctx.setLineDash([8 * dpr, 4 * dpr])
    ctx.lineWidth = 1 * dpr
    ctx.strokeRect(bleedPx, bleedPx, canvasState.width * dpr, canvasState.height * dpr)
    ctx.setLineDash([])
  }

  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex)
  for (const el of sorted) {
    ctx.save()
    const cx = (bleedPx + el.x * dpr) + (el.width * dpr) / 2
    const cy = (bleedPx + el.y * dpr) + (el.height * dpr) / 2
    ctx.translate(cx, cy)
    ctx.rotate((el.rotation || 0) * Math.PI / 180)
    ctx.translate(-cx, -cy)

    const ex = bleedPx + el.x * dpr
    const ey = bleedPx + el.y * dpr
    const ew = el.width * dpr
    const eh = el.height * dpr

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
      ctx.font = `${el.fontWeight || 'normal'} ${el.fontSize || 16}px ${el.fontFamily || 'sans-serif'}`
      ctx.textBaseline = 'top'
      const align = el.textAlign || 'left'
      if (align === 'center') {
        ctx.textAlign = 'center'
        drawMultilineText(ctx, el.content || '', ex + ew / 2, ey, ew, eh, el.fontSize || 16)
      } else if (align === 'right') {
        ctx.textAlign = 'right'
        drawMultilineText(ctx, el.content || '', ex + ew, ey, ew, eh, el.fontSize || 16)
      } else {
        ctx.textAlign = 'left'
        drawMultilineText(ctx, el.content || '', ex, ey, ew, eh, el.fontSize || 16)
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
  maxWidth: number,
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
    JsBarcode(canvas, value, {
      format: (format as any) || 'CODE128',
      width: Math.max(1, Math.floor(width / (value.length * 2 + 10))),
      height: Math.max(30, height * 0.7),
      displayValue: true,
      fontSize: Math.max(8, height * 0.2),
      margin: 0,
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
