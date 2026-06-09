import { useState } from 'react'
import { useDesignStore, replacePlaceholders } from '@/store/useDesignStore'
import { renderElementsToCanvas, canvasToPNG, canvasToJPG, downloadDataURL } from '@/utils/canvasRenderer'
import { exportDesignToPDF, exportImpositionToPDF } from '@/utils/pdfExporter'
import { generateBarcode } from '@/utils/canvasRenderer'
import type { CanvasElement } from '@/types'

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

  const [activeTab, setActiveTab] = useState<'export' | 'history'>('export')
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const renderThumbnail = (els: CanvasElement[], w: number, h: number) => {
    const scale = 0.3
    return (
      <div
        className="relative bg-white"
        style={{ width: w * scale, height: h * scale }}
      >
        {[...els]
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((element) => {
            const baseStyle: React.CSSProperties = {
              position: 'absolute',
              left: element.x * scale,
              top: element.y * scale,
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

  const exportSingle = (els: CanvasElement[], suffix = '') => {
    const ext = exportConfig.format
    const filename = `design${suffix ? `_${suffix}` : ''}.${ext}`

    if (ext === 'pdf') {
      const dataUrl = exportConfig.imposition
        ? exportImpositionToPDF(els, canvasState, exportConfig)
        : exportDesignToPDF(els, canvasState, exportConfig)
      downloadDataURL(dataUrl, filename)
      return
    }

    const canvas = renderElementsToCanvas(
      els,
      { ...canvasState, exportDpi: exportConfig.dpi },
      exportConfig.bleed > 0
    )

    if (exportConfig.imposition) {
      const rows = exportConfig.impositionRows
      const cols = exportConfig.impositionCols
      const count = rows * cols
      const w = canvas.width
      const h = canvas.height
      const gap = 4
      const total = document.createElement('canvas')
      total.width = cols * w + (cols + 1) * gap
      total.height = rows * h + (rows + 1) * gap
      const tctx = total.getContext('2d')!
      tctx.fillStyle = '#ffffff'
      tctx.fillRect(0, 0, total.width, total.height)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          tctx.drawImage(canvas, gap + c * (w + gap), gap + r * (h + gap))
        }
      }
      const dataUrl = ext === 'png'
        ? total.toDataURL('image/png')
        : total.toDataURL('image/jpeg', exportConfig.quality / 100)
      downloadDataURL(dataUrl, filename)
      return
    }

    const dataUrl = ext === 'png'
      ? canvasToPNG(canvas)
      : canvasToJPG(canvas, exportConfig.quality / 100)
    downloadDataURL(dataUrl, filename)
  }

  const handleExport = async () => {
    setExporting(true)
    setExportProgress(0)

    if (orderItems.length > 0) {
      for (let i = 0; i < orderItems.length; i++) {
        const order = orderItems[i]
        const replaced = replacePlaceholders(elements, order)
        exportSingle(replaced, `${order.orderNo}_${order.customerName}`)
        setExportProgress(Math.round(((i + 1) / orderItems.length) * 100))
        await new Promise(r => setTimeout(r, 200))
      }
    } else {
      exportSingle(elements)
      setExportProgress(50)
      await new Promise(r => setTimeout(r, 300))
      setExportProgress(100)
    }

    await new Promise(r => setTimeout(r, 500))
    setExporting(false)
  }

  const impositionCount = exportConfig.imposition
    ? exportConfig.impositionRows * exportConfig.impositionCols
    : 1

  return (
    <div className="h-full flex flex-col">
      <header className="px-8 py-6 border-b border-dark-700 bg-dark-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">导出中心</h2>
            <p className="text-slate-400 mt-1">配置导出参数、拼版预览、下载文件</p>
          </div>
          <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1 border border-dark-700">
            <button
              onClick={() => setActiveTab('export')}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'export'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              📤 导出设置
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              📜 历史版本
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'export' ? (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-4xl mx-auto">
              <div className="card p-6 mb-6">
                <h3 className="font-semibold text-white mb-4">👁️ 拼版预览</h3>
                <div className="bg-dark-700/50 rounded-xl p-8 flex items-center justify-center overflow-auto">
                  {exportConfig.imposition ? (
                    <div
                      className="grid gap-2 p-4 bg-white rounded-lg"
                      style={{
                        gridTemplateColumns: `repeat(${exportConfig.impositionCols}, 1fr)`,
                      }}
                    >
                      {Array.from({ length: impositionCount }).map((_, idx) => (
                        <div key={idx} className="border border-slate-200">
                          {renderThumbnail(elements, canvasState.width, canvasState.height)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-white rounded-lg shadow-lg">
                      {renderThumbnail(elements, canvasState.width, canvasState.height)}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                  <span>画布尺寸: {canvasState.width} × {canvasState.height} px</span>
                  <span>•</span>
                  <span>
                    拼版: {exportConfig.imposition
                      ? `${exportConfig.impositionCols} × ${exportConfig.impositionRows} = ${impositionCount} 个/版`
                      : '未开启'}
                  </span>
                  <span>•</span>
                  <span>
                    批量: {orderItems.length > 0 ? `${orderItems.length} 份` : '单份'}
                  </span>
                </div>
              </div>

              {exporting && (
                <div className="card p-6 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-200 font-medium">正在导出...</span>
                    <span className="text-primary-400 font-mono">{exportProgress}%</span>
                  </div>
                  <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  className="btn-secondary"
                  onClick={() => exportSingle(elements, 'preview')}
                >
                  👁️ 导出预览
                </button>
                <button
                  className="btn-primary text-lg !px-6 !py-3"
                  onClick={handleExport}
                  disabled={exporting}
                >
                  {exporting ? '⏳ 导出中...' : '📥 开始导出'}
                </button>
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
                  ].map((fmt) => (
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
                      onChange={(e) => setExportConfig({ dpi: Number(e.target.value) })}
                      className="w-full accent-primary-500"
                    />
                    <div className="flex justify-between text-xs text-slate-600 mt-1">
                      <span>72 (屏幕)</span>
                      <span>300 (印刷)</span>
                      <span>600 (高清)</span>
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
                        onChange={(e) => setExportConfig({ quality: Number(e.target.value) })}
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
                      <span className="text-sm text-primary-400 font-mono">{exportConfig.bleed} mm</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={exportConfig.bleed}
                      onChange={(e) => setExportConfig({ bleed: Number(e.target.value) })}
                      className="w-full accent-primary-500"
                    />
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
                          onChange={(e) => setExportConfig({ impositionCols: Number(e.target.value) })}
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
                          onChange={(e) => setExportConfig({ impositionRows: Number(e.target.value) })}
                          className="input-field !py-1.5 text-sm"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      每版可排 {impositionCount} 个设计
                    </p>
                  </div>
                )}
              </div>

              {orderItems.length > 0 && (
                <div className="card p-4 bg-primary-600/10 border-primary-600/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span>📦</span>
                    <span className="text-sm text-primary-300 font-medium">批量导出</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    已导入 {orderItems.length} 条订单数据，将为每条订单生成独立文件
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="card p-4 hover:border-primary-500/50 transition-all group"
                >
                  <div
                    className="aspect-[3/2] rounded-lg overflow-hidden mb-4 bg-white flex items-center justify-center"
                  >
                    {renderThumbnail(version.elements, 600, 400)}
                  </div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-white">
                        v{version.version} · {version.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(version.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  {version.note && (
                    <p className="text-sm text-slate-400 mb-3 line-clamp-2">{version.note}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => restoreVersion(version.id)}
                      className="flex-1 btn-secondary !py-1.5 text-sm justify-center"
                    >
                      恢复
                    </button>
                    <button
                      className="btn-primary !py-1.5 text-sm justify-center"
                      onClick={() => exportSingle(version.elements, `v${version.version}`)}
                    >
                      导出
                    </button>
                  </div>
                </div>
              ))}

              {versions.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20">
                  <span className="text-6xl mb-4">📜</span>
                  <p className="text-slate-400 text-lg">暂无历史版本</p>
                  <p className="text-slate-500 text-sm mt-1">在预览校对页面保存设计版本</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
