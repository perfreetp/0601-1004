import { useState, useRef, useEffect } from 'react'
import { useDesignStore, replacePlaceholders } from '@/store/useDesignStore'
import { generateBarcode, renderElementsToCanvas, canvasToPNG, saveOrDownload } from '@/utils/canvasRenderer'
import type { OrderItem, CanvasElement } from '@/types'

const sampleOrders: OrderItem[] = [
  { id: '1', orderNo: 'DD20240201001', customerName: '张小明', productName: '手工香薰蜡烛', quantity: 2 },
  { id: '2', orderNo: 'DD20240201002', customerName: '李雨晴', productName: '手绘明信片套装', quantity: 1 },
  { id: '3', orderNo: 'DD20240201003', customerName: '王大伟', productName: '手工编织挂件', quantity: 3 },
  { id: '4', orderNo: 'DD20240201004', customerName: '赵小美', productName: '手工香薰蜡烛', quantity: 1 },
  { id: '5', orderNo: 'DD20240201005', customerName: '陈思远', productName: '陶瓷手工杯', quantity: 2 },
]

interface PreviewThumb {
  orderId: string
  orderNo: string
  customerName: string
  thumbDataUrl: string
}

export default function BatchGenerator() {
  const { orderItems, importOrderItems, elements, addElement, canvasState, exportConfig } = useDesignStore()
  const [barcodeValue, setBarcodeValue] = useState('123456789012')
  const [barcodeFormat, setBarcodeFormat] = useState('CODE128')
  const [previewOrder, setPreviewOrder] = useState<OrderItem | null>(null)
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [previews, setPreviews] = useState<PreviewThumb[]>([])
  const barcodeContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!barcodeContainerRef.current) return
    barcodeContainerRef.current.innerHTML = ''
    const canvas = generateBarcode(barcodeValue, barcodeFormat, 320, 100)
    if (canvas) {
      canvas.style.maxWidth = '100%'
      canvas.style.height = 'auto'
      barcodeContainerRef.current.appendChild(canvas)
    } else {
      barcodeContainerRef.current.innerHTML = '<span class="text-sm text-red-400">条码内容无效</span>'
    }
  }, [barcodeValue, barcodeFormat])

  useEffect(() => {
    if (orderItems.length === 0) setPreviews([])
  }, [orderItems.length])

  const handleImportSample = () => {
    importOrderItems(sampleOrders)
    setPreviews([])
  }

  const handleImportCSV = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.openFile()
      if (result) {
        const lines = result.content.split('\n').filter(Boolean)
        const headers = lines[0].split(',').map(h => h.trim())
        const items: OrderItem[] = lines.slice(1).map((line, idx) => {
          const values = line.split(',')
          const obj: Record<string, string> = {}
          headers.forEach((h, i) => { obj[h] = values[i]?.trim() || '' })
          return {
            id: String(idx + 1),
            orderNo: obj['订单号'] || obj['orderNo'] || '',
            customerName: obj['客户姓名'] || obj['customerName'] || '',
            productName: obj['商品名称'] || obj['productName'] || '',
            quantity: Number(obj['数量'] || obj['quantity']) || 1,
          }
        })
        importOrderItems(items)
        setPreviews([])
      }
    } else {
      importOrderItems(sampleOrders)
      setPreviews([])
    }
  }

  const handleInsertBarcode = () => {
    const newElement: CanvasElement = {
      id: `barcode-${Date.now()}`,
      type: 'barcode',
      x: 50,
      y: 50,
      width: 200,
      height: 80,
      rotation: 0,
      zIndex: elements.length,
      barcodeValue,
      barcodeFormat,
    }
    addElement(newElement)
  }

  const generatePreviewThumbs = async () => {
    if (orderItems.length === 0) {
      alert('请先导入订单数据')
      return
    }
    if (elements.length === 0) {
      alert('画布中暂无设计内容，请先在画布编辑中添加元素')
      return
    }
    setGenerating(true)
    const result: PreviewThumb[] = []
    try {
      for (let i = 0; i < orderItems.length; i++) {
        const order = orderItems[i]
        const replacedElements = replacePlaceholders(elements, order)
        const renderState = { ...canvasState, exportDpi: 150 }
        const canvas = renderElementsToCanvas(replacedElements, renderState, false, 0)
        const thumbCanvas = document.createElement('canvas')
        const thumbW = 240
        const scale = thumbW / canvas.width
        const thumbH = Math.round(canvas.height * scale)
        thumbCanvas.width = thumbW
        thumbCanvas.height = thumbH
        const tctx = thumbCanvas.getContext('2d')!
        tctx.fillStyle = '#ffffff'
        tctx.fillRect(0, 0, thumbW, thumbH)
        tctx.drawImage(canvas, 0, 0, thumbW, thumbH)
        const dataUrl = thumbCanvas.toDataURL('image/png', 0.8)
        result.push({
          orderId: order.id,
          orderNo: order.orderNo,
          customerName: order.customerName,
          thumbDataUrl: dataUrl,
        })
        await new Promise(r => setTimeout(r, 30))
      }
      setPreviews(result)
    } catch (e) {
      console.error('预览生成失败', e)
      alert('预览生成失败，请重试')
    } finally {
      setGenerating(false)
    }
  }

  const handleBatchExport = async () => {
    if (previews.length === 0) {
      alert('请先生成预览并确认无误后再导出')
      return
    }
    setExporting(true)
    setExportProgress(0)
    const bleedMm = exportConfig.bleed || 0
    const renderState = { ...canvasState, exportDpi: exportConfig.dpi || 300 }

    try {
      for (let i = 0; i < orderItems.length; i++) {
        const order = orderItems[i]
        const replacedElements = replacePlaceholders(elements, order)
        const canvas = renderElementsToCanvas(replacedElements, renderState, bleedMm > 0, bleedMm)
        const dataURL = canvasToPNG(canvas)
        await saveOrDownload(dataURL, `${order.orderNo}_${order.customerName}.png`)
        setExportProgress(Math.round(((i + 1) / orderItems.length) * 100))
        await new Promise(r => setTimeout(r, 120))
      }
    } catch (e) {
      console.error('批量导出失败', e)
    }
    await new Promise(r => setTimeout(r, 500))
    setExporting(false)
  }

  const placeholders = new Set<string>()
  elements.forEach(e => {
    if (e.type === 'text' && e.content) {
      const matches = e.content.match(/\{\{(.+?)\}\}/g)
      matches?.forEach(m => placeholders.add(m))
    }
  })

  return (
    <div className="h-full flex flex-col">
      <header className="px-8 py-6 border-b border-dark-700 bg-dark-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">批量生成</h2>
            <p className="text-slate-400 mt-1">
              导入订单数据 · 批量替换变量 · 预览确认 · 批量导出
              {previews.length > 0 && (
                <span className="text-emerald-400 ml-3">✓ 已生成 {previews.length} 份预览</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={handleImportCSV}>
              📄 导入 CSV
            </button>
            <button className="btn-secondary" onClick={handleImportSample}>
              📋 导入示例数据
            </button>
            <button
              className="btn-secondary"
              onClick={generatePreviewThumbs}
              disabled={generating || orderItems.length === 0}
            >
              {generating ? '⏳ 生成预览中...' : '🖼️ 生成预览'}
            </button>
            <button
              className="btn-primary"
              onClick={handleBatchExport}
              disabled={exporting || previews.length === 0}
            >
              {exporting ? `⏳ 导出中 ${exportProgress}%` : '🚀 确认批量导出'}
            </button>
          </div>
        </div>
      </header>

      {exporting && (
        <div className="px-8 py-3 bg-primary-600/10 border-b border-primary-600/30">
          <div className="flex items-center justify-between mb-1.5 max-w-xl">
            <span className="text-sm text-primary-300">正在导出 {orderItems.length} 份文件...</span>
            <span className="text-sm text-primary-400 font-mono">{exportProgress}%</span>
          </div>
          <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden max-w-xl">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-300"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-8 py-4 border-b border-dark-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">
              {previews.length > 0 ? `成品预览 (${previews.length} 份，点击可放大查看)` : `订单清单 (${orderItems.length} 条)`}
            </h3>
            <div className="flex gap-2">
              {previews.length > 0 && (
                <button
                  className="text-sm text-slate-400 hover:text-slate-200"
                  onClick={() => setPreviews([])}
                >
                  ↩ 返回订单列表
                </button>
              )}
              <span className="px-3 py-1 bg-primary-600/20 text-primary-400 rounded-full text-sm">
                模板变量: {placeholders.size > 0 ? Array.from(placeholders).join(', ') : '暂无 (请在画布中添加 {{name}} 等变量)'}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {orderItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <span className="text-7xl mb-4">📦</span>
                <p className="text-slate-400 text-lg mb-2">暂无订单数据</p>
                <p className="text-slate-500 text-sm mb-6">点击上方按钮导入 CSV 或示例数据</p>
                <div className="card p-4 max-w-md">
                  <p className="text-sm text-slate-400 mb-3">CSV 格式示例：</p>
                  <code className="block text-xs text-slate-500 bg-dark-900 p-3 rounded-lg font-mono">
                    订单号,客户姓名,商品名称,数量<br />
                    DD20240201001,张小明,手工香薰蜡烛,2<br />
                    DD20240201002,李雨晴,手绘明信片,1
                  </code>
                </div>
              </div>
            ) : previews.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {previews.map((p, idx) => {
                  const order = orderItems.find(o => o.id === p.orderId)
                  return (
                    <div
                      key={p.orderId}
                      className="card p-3 hover:border-primary-500/50 transition-all cursor-pointer group"
                      onClick={() => order && setPreviewOrder(order)}
                    >
                      <div className="aspect-square bg-white rounded-lg overflow-hidden mb-3 flex items-center justify-center border border-slate-100">
                        <img
                          src={p.thumbDataUrl}
                          alt={`预览 ${idx + 1}`}
                          className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">#{idx + 1}</span>
                          <span className="text-xs font-mono text-primary-400">{p.orderNo}</span>
                        </div>
                        <p className="text-sm text-slate-200 font-medium truncate">{p.customerName}</p>
                        {order && (
                          <p className="text-xs text-slate-500 truncate">{order.productName} ×{order.quantity}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-dark-800/50 sticky top-0">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">#</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">订单号</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">客户姓名</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">商品名称</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">数量</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {orderItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-dark-800/30 transition-colors">
                      <td className="px-6 py-3 text-sm text-slate-500">{idx + 1}</td>
                      <td className="px-6 py-3 text-sm text-slate-200 font-mono">{item.orderNo}</td>
                      <td className="px-6 py-3 text-sm text-slate-200">{item.customerName}</td>
                      <td className="px-6 py-3 text-sm text-slate-200">{item.productName}</td>
                      <td className="px-6 py-3 text-sm text-slate-200">×{item.quantity}</td>
                      <td className="px-6 py-3">
                        <button
                          className="text-primary-400 hover:text-primary-300 text-sm"
                          onClick={() => setPreviewOrder(item)}
                        >
                          预览
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <aside className="w-80 bg-dark-900 border-l border-dark-700 overflow-y-auto">
          <div className="p-5">
            <h3 className="font-semibold text-white mb-4">条码生成</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">条码内容</label>
                <input
                  type="text"
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  className="input-field"
                  placeholder="输入条码内容，支持 {{orderNo}}"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1.5">条码格式</label>
                <select
                  value={barcodeFormat}
                  onChange={(e) => setBarcodeFormat(e.target.value)}
                  className="input-field"
                >
                  <option value="CODE128">CODE128</option>
                  <option value="EAN13">EAN-13</option>
                  <option value="EAN8">EAN-8</option>
                  <option value="UPC">UPC</option>
                  <option value="CODE39">CODE39</option>
                  <option value="ITF14">ITF-14</option>
                  <option value="MSI">MSI</option>
                </select>
              </div>

              <div className="card p-4 flex items-center justify-center bg-white min-h-[100px]">
                <div ref={barcodeContainerRef} className="w-full flex items-center justify-center" />
              </div>

              <button className="w-full btn-primary justify-center" onClick={handleInsertBarcode}>
                ➕ 插入到画布
              </button>
            </div>
          </div>

          <div className="p-5 border-t border-dark-700">
            <h3 className="font-semibold text-white mb-4">批量替换规则</h3>
            <div className="space-y-3">
              {Array.from(placeholders).map(placeholder => (
                <div key={placeholder} className="card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <code className="text-xs px-2 py-0.5 bg-primary-600/20 text-primary-400 rounded font-mono">
                      {placeholder}
                    </code>
                    <span className="text-xs text-slate-500">→</span>
                    <span className="text-xs text-slate-400">
                      {placeholder === '{{name}}' ? '客户姓名' : placeholder === '{{orderNo}}' ? '订单号' : placeholder === '{{productName}}' ? '商品名称' : '自定义字段'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">将自动从订单数据中匹配对应字段</p>
                </div>
              ))}
              {placeholders.size === 0 && (
                <p className="text-sm text-slate-500">
                  在画布文字中使用 <code className="text-primary-400 font-mono">{'{{name}}'}</code> 或 <code className="text-primary-400 font-mono">{'{{orderNo}}'}</code> 作为变量占位符
                </p>
              )}
            </div>
          </div>

          {previews.length > 0 && (
            <div className="p-5 border-t border-dark-700">
              <div className="card p-4 bg-emerald-600/10 border-emerald-600/30">
                <div className="flex items-center gap-2 mb-2">
                  <span>✅</span>
                  <span className="text-sm text-emerald-300 font-medium">预览已生成</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  已为 {previews.length} 条订单生成成品预览，点击卡片可放大查看姓名和订单号是否正确
                </p>
                <button
                  className="w-full btn-primary justify-center !py-2 text-sm"
                  onClick={handleBatchExport}
                  disabled={exporting}
                >
                  {exporting ? `⏳ 导出中 ${exportProgress}%` : '🚀 批量导出 PNG'}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {previewOrder && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-8"
          onClick={() => setPreviewOrder(null)}
        >
          <div
            className="card p-6 max-w-4xl w-full max-h-full overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  订单预览 - {previewOrder.customerName}
                </h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  订单号: {previewOrder.orderNo} · {previewOrder.productName} ×{previewOrder.quantity}
                </p>
              </div>
              <button
                className="w-8 h-8 rounded-full bg-dark-700 hover:bg-dark-600 text-slate-300 flex items-center justify-center"
                onClick={() => setPreviewOrder(null)}
              >
                ×
              </button>
            </div>
            <div className="bg-slate-100 rounded-lg p-6 flex items-center justify-center">
              <OrderPreview order={previewOrder} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="btn-secondary"
                onClick={() => setPreviewOrder(null)}
              >
                关闭
              </button>
              <button
                className="btn-primary"
                onClick={async () => {
                  const replaced = replacePlaceholders(elements, previewOrder)
                  const cvs = renderElementsToCanvas(
                    replaced,
                    { ...canvasState, exportDpi: exportConfig.dpi },
                    exportConfig.bleed > 0,
                    exportConfig.bleed
                  )
                  await saveOrDownload(canvasToPNG(cvs), `${previewOrder.orderNo}_${previewOrder.customerName}.png`)
                }}
              >
                📥 下载此订单
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OrderPreview({ order }: { order: OrderItem }) {
  const { elements, canvasState } = useDesignStore()
  const replaced = replacePlaceholders(elements, order)
  const previewScale = Math.min(700 / canvasState.width, 500 / canvasState.height, 1)

  return (
    <div
      className="relative shadow-xl"
      style={{
        width: canvasState.width * previewScale,
        height: canvasState.height * previewScale,
        backgroundColor: canvasState.backgroundColor,
      }}
    >
      {[...replaced]
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((element) => {
          const baseStyle: React.CSSProperties = {
            position: 'absolute',
            left: element.x * previewScale,
            top: element.y * previewScale,
            width: element.width * previewScale,
            height: element.height * previewScale,
            transform: `rotate(${element.rotation}deg)`,
            zIndex: element.zIndex,
          }

          if (element.type === 'text') {
            return (
              <div
                key={element.id}
                style={{
                  ...baseStyle,
                  fontSize: (element.fontSize || 16) * previewScale,
                  fontFamily: element.fontFamily,
                  fontWeight: element.fontWeight,
                  color: element.color,
                  whiteSpace: 'pre-wrap',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                {element.content}
              </div>
            )
          }
          if (element.type === 'shape') {
            return (
              <div
                key={element.id}
                style={{
                  ...baseStyle,
                  backgroundColor: element.fill,
                  borderRadius: element.shapeType === 'circle' ? '50%' : 0,
                }}
              />
            )
          }
          if (element.type === 'image') {
            return (
              <img
                key={element.id}
                src={element.src}
                alt=""
                style={{ ...baseStyle, objectFit: 'contain' }}
              />
            )
          }
          if (element.type === 'barcode') {
            const canvas = generateBarcode(
              element.barcodeValue || '',
              element.barcodeFormat || 'CODE128',
              element.width * previewScale,
              element.height * previewScale
            )
            const dataUrl = canvas ? canvas.toDataURL() : ''
            return (
              <div
                key={element.id}
                style={{
                  ...baseStyle,
                  backgroundColor: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {dataUrl && <img src={dataUrl} alt="barcode" style={{ width: '100%', height: '100%', objectFit: 'fill' }} />}
              </div>
            )
          }
          return null
        })}
    </div>
  )
}
