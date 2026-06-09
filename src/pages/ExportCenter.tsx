import { useState, useMemo, useRef, useEffect } from 'react'
import { useDesignStore, replacePlaceholders } from '@/store/useDesignStore'
import {
  renderElementsToCanvas,
  canvasToPNG,
  canvasToJPG,
  saveOrDownload,
  saveOrDownloadBatch,
  canvasExportPixelSize,
  canvasExportMmSize,
  generateBarcode,
  BatchSaveItem,
} from '@/utils/canvasRenderer'
import { exportConfigToPDF, saveOrDownloadPDF } from '@/utils/pdfExporter'
import type { CanvasElement, ExportConfig, DesignVersion } from '@/types'

type ExportTaskStatus = 'pending' | 'processing' | 'done' | 'error'

interface ExportTask {
  id: string
  filename: string
  format: 'png' | 'jpg' | 'pdf'
  orderNo?: string
  status: ExportTaskStatus
  savedPath?: string | null
  error?: string
  createdAt: number
}

export default function ExportCenter() {
  const {
    elements,
    canvasState,
    exportConfig,
    setExportConfig,
    versions,
    restoreVersion,
    orderItems,
  } = useDesignStore()

  const [activeTab, setActiveTab] = useState<'export' | 'history' | 'queue'>('export')
  const [tasks, setTasks] = useState<ExportTask[]>([])
  const isProcessing = useRef(false)
  const bleedMm = exportConfig.bleed || 0

  const finalPreviewDataUrl = useMemo(() => {
    const renderState = { ...canvasState, exportDpi: exportConfig.dpi }
    try {
      const canvas = renderElementsToCanvas(elements, renderState, bleedMm > 0, bleedMm)
      return canvas.toDataURL('image/png', 0.9)
    } catch (e) {
      console.warn('preview render failed', e)
      return ''
    }
  }, [elements, canvasState, exportConfig.dpi, bleedMm])

  const pxSize = useMemo(
    () => canvasExportPixelSize(canvasState, bleedMm, exportConfig.dpi),
    [canvasState, bleedMm, exportConfig.dpi]
  )
  const mmSize = useMemo(() => canvasExportMmSize(canvasState, bleedMm), [canvasState, bleedMm])

  const impositionCount = exportConfig.imposition
    ? exportConfig.impositionRows * exportConfig.impositionCols
    : 1

  const addTask = (filename: string, format: 'png' | 'jpg' | 'pdf', orderNo?: string): string => {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setTasks(prev => [
      { id, filename, format, orderNo, status: 'pending', createdAt: Date.now() },
      ...prev,
    ])
    return id
  }

  const updateTask = (id: string, patch: Partial<ExportTask>) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)))
  }

  const runTask = async (task: ExportTask): Promise<void> => {
    updateTask(task.id, { status: 'processing' })
    try {
      let dataUrl = ''
      const config = exportConfig
      if (task.format === 'pdf') {
        dataUrl = exportConfigToPDF(elements, { ...canvasState, exportDpi: config.dpi }, config, orderItems, task.filename)
      } else {
        const renderState = { ...canvasState, exportDpi: config.dpi }
        if (config.imposition) {
          const rows = config.impositionRows
          const cols = config.impositionCols
          const single = renderElementsToCanvas(elements, renderState, bleedMm > 0, bleedMm)
          const w = single.width
          const h = single.height
          const gap = Math.max(4, Math.round(4 * (config.dpi / 96)))
          const total = document.createElement('canvas')
          total.width = cols * w + (cols + 1) * gap
          total.height = rows * h + (rows + 1) * gap
          const tctx = total.getContext('2d')!
          tctx.fillStyle = '#ffffff'
          tctx.fillRect(0, 0, total.width, total.height)
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              tctx.drawImage(single, gap + c * (w + gap), gap + r * (h + gap))
            }
          }
          dataUrl = task.format === 'png' ? canvasToPNG(total) : canvasToJPG(total, config.quality / 100)
        } else {
          const canvas = renderElementsToCanvas(elements, renderState, bleedMm > 0, bleedMm)
          dataUrl = task.format === 'png' ? canvasToPNG(canvas) : canvasToJPG(canvas, config.quality / 100)
        }
      }
      const savedPath = await saveOrDownload(dataUrl, task.filename)
      updateTask(task.id, { status: 'done', savedPath: savedPath || null })
    } catch (e: any) {
      console.error(task.id, e)
      updateTask(task.id, { status: 'error', error: e?.message || '导出失败' })
    }
  }

  useEffect(() => {
    if (isProcessing.current) return
    const pending = tasks.find(t => t.status === 'pending')
    if (!pending) return
    isProcessing.current = true
    runTask(pending).finally(() => {
      isProcessing.current = false
    })
  }, [tasks])

  const buildFilename = (suffix = '', ext?: string) => {
    const e = ext || exportConfig.format
    return `design${suffix ? `_${suffix}` : ''}.${e}`
  }

  const handleSingleExport = () => {
    addTask(buildFilename(), exportConfig.format)
    setActiveTab('queue')
  }

  const handleBatchExport = async () => {
    if (orderItems.length === 0) return
    const isPDF = exportConfig.format === 'pdf'
    const isMulti = exportConfig.pdfMode === 'multi'

    if (isPDF && isMulti) {
      const filename = buildFilename(`batch_${orderItems.length}orders`, 'pdf')
      addTask(filename, 'pdf')
      setActiveTab('queue')
      return
    }

    if (isPDF) {
      for (const order of orderItems) {
        const filename = buildFilename(`${order.orderNo}_${order.customerName}`, 'pdf')
        addTask(filename, 'pdf', order.orderNo)
      }
      setActiveTab('queue')
      return
    }

    const batchItems: BatchSaveItem[] = []
    const renderState = { ...canvasState, exportDpi: exportConfig.dpi }
    for (const order of orderItems) {
      const replaced = replacePlaceholders(elements, order)
      const canvas = renderElementsToCanvas(replaced, renderState, bleedMm > 0, bleedMm)
      const dataUrl = exportConfig.format === 'png' ? canvasToPNG(canvas) : canvasToJPG(canvas, exportConfig.quality / 100)
      const filename = buildFilename(`${order.orderNo}_${order.customerName}`)
      batchItems.push({ filename, dataUrl })
    }
    const taskId = addTask(`batch_${orderItems.length}orders.${exportConfig.format}`, exportConfig.format)
    setActiveTab('queue')
    updateTask(taskId, { status: 'processing' })
    try {
      const { saved, folder } = await saveOrDownloadBatch(batchItems)
      updateTask(taskId, { status: 'done', savedPath: folder ? `${folder} (${saved}/${batchItems.length})` : `已下载 ${saved} 个文件` })
    } catch (e: any) {
      updateTask(taskId, { status: 'error', error: e?.message || '批量导出失败' })
    }
  }

  const exportVersion = (version: DesignVersion) => {
    const filename = buildFilename(`v${version.version}`)
    addTask(filename, exportConfig.format)
    setActiveTab('queue')
  }

  const renderThumbnail = (els: CanvasElement[], w: number, h: number, bleed: number = 0) => {
    const scale = 0.3
    const mmToPx = 3.7795
    const bleedPx = bleed * mmToPx * scale
    const totalW = w * scale + bleedPx * 2
    const totalH = h * scale + bleedPx * 2
    return (
      <div
        className="relative bg-white border"
        style={{ width: totalW, height: totalH }}
      >
        {bleedPx > 0 && (
          <div
            className="absolute border-2 border-dashed border-red-400 pointer-events-none"
            style={{ left: bleedPx, top: bleedPx, width: w * scale, height: h * scale }}
          />
        )}
        {[...els]
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((element) => {
            const baseStyle: React.CSSProperties = {
              position: 'absolute',
              left: bleedPx + element.x * scale,
              top: bleedPx + element.y * scale,
              width: element.width * scale,
              height: element.height * scale,
              transform: `rotate(${element.rotation}deg)`,
              zIndex: element.zIndex,
            }
            if (element.type === 'text') {
              return (
                <div
                  key={element.id}
                  style={{
                    ...baseStyle,
                    fontSize: (element.fontSize || 16) * scale,
                    fontFamily: element.fontFamily,
                    fontWeight: element.fontWeight,
                    color: element.color,
                    whiteSpace: 'pre-wrap',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      element.textAlign === 'center' ? 'center' : element.textAlign === 'right' ? 'flex-end' : 'flex-start',
                    textAlign: (element.textAlign as any) || 'center',
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
            if (element.type === 'barcode') {
              const canvas = generateBarcode(
                element.barcodeValue || '',
                element.barcodeFormat || 'CODE128',
                element.width * scale,
                element.height * scale
              )
              const dataUrl = canvas ? canvas.toDataURL() : ''
              return (
                <div
                  key={element.id}
                  style={{ ...baseStyle, backgroundColor: '#fff', overflow: 'hidden' }}
                >
                  {dataUrl && <img src={dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill' }} />}
                </div>
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
            return null
          })}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <header className="px-8 py-6 border-b border-dark-700 bg-dark-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">导出中心</h2>
            <p className="text-slate-400 mt-1">
              最终文件预览 · DPI {exportConfig.dpi} · 出血 {bleedMm}mm ·{' '}
              {exportConfig.format.toUpperCase()}
              {exportConfig.format === 'pdf' && ` (${exportConfig.pdfMode === 'multi' ? '多页合并' : exportConfig.pdfMode === 'imposition' ? '拼版' : '单页'})`}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1 border border-dark-700">
            {[
              { v: 'export', label: '📤 导出设置' },
              { v: 'history', label: '📜 历史版本' },
              { v: 'queue', label: '📋 导出任务' },
            ].map(tab => (
              <button
                key={tab.v}
                onClick={() => setActiveTab(tab.v as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.v
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-dark-700'
                }`}
              >
                {tab.label}
                {tab.v === 'queue' && tasks.some(t => t.status === 'pending' || t.status === 'processing') && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] text-white">
                    {tasks.filter(t => t.status === 'pending' || t.status === 'processing').length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {activeTab === 'export' && (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-4xl mx-auto">
              <div className="card p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">
                    👁️ 最终文件预览
                    {bleedMm > 0 && <span className="text-red-400 text-sm ml-2">（红色虚线为出血线 {bleedMm}mm）</span>}
                  </h3>
                  <span className="text-xs text-slate-500">
                    与实际导出 {exportConfig.format.toUpperCase()} 1:1 渲染
                  </span>
                </div>
                <div className="bg-dark-700/50 rounded-xl p-6 flex items-center justify-center overflow-auto min-h-[400px]">
                  {finalPreviewDataUrl ? (
                    <img
                      src={finalPreviewDataUrl}
                      alt="最终预览"
                      className="max-w-full max-h-[70vh] shadow-2xl rounded"
                      style={{ imageRendering: 'auto' }}
                    />
                  ) : (
                    <div className="text-slate-500 text-center py-20">
                      <span className="text-5xl mb-3 block">🖼️</span>
                      画布暂无内容
                    </div>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="card p-3 bg-dark-800/60">
                    <div className="text-xs text-slate-500">画布尺寸（96 DPI）</div>
                    <div className="text-slate-200 font-mono text-base mt-1">
                      {canvasState.width} × {canvasState.height} px
                    </div>
                  </div>
                  <div className="card p-3 bg-dark-800/60">
                    <div className="text-xs text-slate-500">最终像素尺寸（{exportConfig.dpi} DPI）</div>
                    <div className="text-primary-400 font-mono text-base mt-1">
                      {pxSize.widthPx} × {pxSize.heightPx} px
                    </div>
                  </div>
                  <div className="card p-3 bg-dark-800/60">
                    <div className="text-xs text-slate-500">PDF 毫米尺寸</div>
                    <div className="text-primary-400 font-mono text-base mt-1">
                      {mmSize.widthMm.toFixed(2)} × {mmSize.heightMm.toFixed(2)} mm
                    </div>
                  </div>
                  <div className="card p-3 bg-dark-800/60">
                    <div className="text-xs text-slate-500">出血设置</div>
                    <div className="text-primary-400 font-mono text-base mt-1">
                      {bleedMm} mm（每侧 {pxSize.bleedPx} px）
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <span>
                    拼版: {exportConfig.imposition
                      ? `${exportConfig.impositionCols} × ${exportConfig.impositionRows} = ${impositionCount} 个/版`
                      : '未开启'}
                  </span>
                  <span>批量订单: {orderItems.length > 0 ? `${orderItems.length} 份` : '未导入'}</span>
                  {exportConfig.format === 'pdf' && (
                    <span>PDF 模式: {exportConfig.pdfMode === 'multi' ? '按订单合并多页' : exportConfig.pdfMode === 'imposition' ? '拼版' : '单页'}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    const config: ExportConfig = { ...exportConfig, dpi: 150, bleed: 0 }
                    const renderState = { ...canvasState, exportDpi: 150 }
                    const canvas = renderElementsToCanvas(elements, renderState, false, 0)
                    saveOrDownload(canvasToPNG(canvas), 'quick-preview.png')
                  }}
                >
                  👁️ 快速预览（低清）
                </button>
                {orderItems.length > 0 ? (
                  <button className="btn-primary text-lg !px-6 !py-3" onClick={handleBatchExport}>
                    🚀 批量导出（{orderItems.length} 份）
                  </button>
                ) : (
                  <button className="btn-primary text-lg !px-6 !py-3" onClick={handleSingleExport}>
                    📥 开始导出 {exportConfig.format.toUpperCase()}
                  </button>
                )}
              </div>
            </div>
          </div>

          <aside className="w-80 bg-dark-900 border-l border-dark-700 overflow-y-auto">
            <div className="p-5 space-y-6">
              <div>
                <h3 className="font-semibold text-white mb-4">📁 导出格式</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'png', label: 'PNG', icon: '🖼️' },
                    { value: 'jpg', label: 'JPG', icon: '📷' },
                    { value: 'pdf', label: 'PDF', icon: '📄' },
                  ].map(fmt => (
                    <button
                      key={fmt.value}
                      onClick={() => setExportConfig({ format: fmt.value as any })}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border transition-colors ${
                        exportConfig.format === fmt.value
                          ? 'bg-primary-600/20 border-primary-500 text-primary-400'
                          : 'bg-dark-800 border-dark-600 text-slate-400 hover:border-dark-500 hover:text-slate-300'
                      }`}
                    >
                      <span className="text-xl">{fmt.icon}</span>
                      <span className="text-xs font-medium">{fmt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {exportConfig.format === 'pdf' && (
                <div>
                  <h3 className="font-semibold text-white mb-3">📑 PDF 交付模式</h3>
                  <div className="space-y-2">
                    {[
                      { v: 'single', label: '单页 PDF', desc: '每页一个成品' },
                      { v: 'imposition', label: '拼版 PDF', desc: `${exportConfig.impositionCols || 3}×${exportConfig.impositionRows || 2} 拼版` },
                      { v: 'multi', label: '按订单合并多页', desc: `共 ${orderItems.length || 0} 页` },
                    ].map(mode => (
                      <button
                        key={mode.v}
                        onClick={() => setExportConfig({ pdfMode: mode.v as any })}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          exportConfig.pdfMode === mode.v
                            ? 'bg-primary-600/20 border-primary-500'
                            : 'bg-dark-800 border-dark-600 hover:border-dark-500'
                        }`}
                      >
                        <div className="text-sm font-medium text-white">{mode.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-white mb-4">⚙️ 质量与分辨率</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm text-slate-400">DPI 分辨率</label>
                      <span className="text-sm text-primary-400 font-mono">{exportConfig.dpi} DPI</span>
                    </div>
                    <input
                      type="range"
                      min={72}
                      max={600}
                      step={72}
                      value={exportConfig.dpi}
                      onChange={e => setExportConfig({ dpi: Number(e.target.value) })}
                      className="w-full accent-primary-500"
                    />
                    <div className="flex justify-between text-xs text-slate-600 mt-1">
                      <span>72</span>
                      <span>300</span>
                      <span>600</span>
                    </div>
                  </div>

                  {exportConfig.format === 'jpg' && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm text-slate-400">图片质量</label>
                        <span className="text-sm text-primary-400 font-mono">{exportConfig.quality}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={exportConfig.quality}
                        onChange={e => setExportConfig({ quality: Number(e.target.value) })}
                        className="w-full accent-primary-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-slate-400 block mb-1.5">色彩模式</label>
                    <div className="flex gap-2">
                      {['rgb', 'cmyk'].map(mode => (
                        <button
                          key={mode}
                          onClick={() => setExportConfig({ colorMode: mode as any })}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                            exportConfig.colorMode === mode
                              ? 'bg-primary-600 text-white'
                              : 'bg-dark-800 text-slate-400 hover:bg-dark-700 hover:text-slate-300'
                          }`}
                        >
                          {mode.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm text-slate-400">出血线大小</label>
                      <span className="text-sm text-primary-400 font-mono">{bleedMm} mm</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={bleedMm}
                      onChange={e => setExportConfig({ bleed: Number(e.target.value) })}
                      className="w-full accent-primary-500"
                    />
                    <div className="flex justify-between text-xs text-slate-600 mt-1">
                      <span>0 mm</span>
                      <span>3 mm</span>
                      <span>10 mm</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white">🖼️ 拼版设置</h3>
                  <button
                    onClick={() => setExportConfig({ imposition: !exportConfig.imposition })}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      exportConfig.imposition ? 'bg-primary-600' : 'bg-dark-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        exportConfig.imposition ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                {exportConfig.imposition && (
                  <div className="space-y-3 card p-3 bg-dark-800">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">列数</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={exportConfig.impositionCols}
                          onChange={e => setExportConfig({ impositionCols: Number(e.target.value) })}
                          className="input-field !py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">行数</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={exportConfig.impositionRows}
                          onChange={e => setExportConfig({ impositionRows: Number(e.target.value) })}
                          className="input-field !py-1.5 text-sm"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">每版 {impositionCount} 个</p>
                  </div>
                )}
              </div>

              {orderItems.length > 0 && (
                <div className="card p-4 bg-primary-600/10 border-primary-600/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span>📦</span>
                    <span className="text-sm text-primary-300 font-medium">批量导出已就绪</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    订单 {orderItems.length} 条
                    {exportConfig.format === 'pdf' && exportConfig.pdfMode === 'multi' && (
                      <span>，将合并为一个多页 PDF</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-5xl mx-auto">
            {versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <span className="text-6xl mb-4">📜</span>
                <p className="text-slate-400 text-lg">暂无历史版本</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {versions.map(version => (
                  <div key={version.id} className="card p-4 hover:border-primary-500/50 transition-all">
                    <div className="aspect-[3/2] rounded-lg overflow-hidden mb-3 bg-white flex items-center justify-center">
                      {renderThumbnail(version.elements, 600, 400, 0)}
                    </div>
                    <div className="mb-2">
                      <h4 className="font-semibold text-white">
                        v{version.version} · {version.name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {new Date(version.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    {version.note && <p className="text-sm text-slate-400 mb-3 line-clamp-2">{version.note}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => restoreVersion(version.id)}
                        className="flex-1 btn-secondary !py-1.5 text-sm justify-center"
                      >
                        恢复
                      </button>
                      <button
                        className="btn-primary !py-1.5 text-sm justify-center"
                        onClick={() => exportVersion(version)}
                      >
                        导出
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-white">导出任务清单</h3>
              <button
                className="text-sm text-slate-400 hover:text-slate-200"
                onClick={() => setTasks(prev => prev.filter(t => t.status !== 'done' && t.status !== 'error'))}
              >
                清理已完成
              </button>
            </div>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <span className="text-6xl mb-4">📋</span>
                <p className="text-slate-400 text-lg mb-2">暂无导出任务</p>
                <p className="text-slate-500 text-sm">在「导出设置」页点击「开始导出」</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className={`card p-4 flex items-center gap-4 ${
                      task.status === 'done'
                        ? 'border-emerald-600/40'
                        : task.status === 'error'
                        ? 'border-red-600/40'
                        : task.status === 'processing'
                        ? 'border-primary-600/40'
                        : ''
                    }`}
                  >
                    <div className="text-2xl w-10 text-center flex-shrink-0">
                      {task.status === 'pending' && '⏳'}
                      {task.status === 'processing' && '⚙️'}
                      {task.status === 'done' && '✅'}
                      {task.status === 'error' && '❌'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-200 font-mono truncate">{task.filename}</span>
                        <span className="text-xs uppercase px-2 py-0.5 rounded bg-dark-700 text-slate-400">
                          {task.format}
                        </span>
                        {task.orderNo && (
                          <span className="text-xs text-slate-500">#{task.orderNo}</span>
                        )}
                      </div>
                      <div className="text-xs mt-1">
                        {task.status === 'done' && (
                          <span className="text-emerald-400">
                            完成 {task.savedPath ? `· ${task.savedPath}` : '· 已下载'}
                          </span>
                        )}
                        {task.status === 'processing' && <span className="text-primary-400">正在处理...</span>}
                        {task.status === 'pending' && <span className="text-slate-500">排队中</span>}
                        {task.status === 'error' && <span className="text-red-400">失败 · {task.error}</span>}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 flex-shrink-0">
                      {new Date(task.createdAt).toLocaleTimeString('zh-CN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
