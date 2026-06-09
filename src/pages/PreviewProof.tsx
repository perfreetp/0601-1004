import { useState } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import type { CanvasElement } from '@/types'

export default function PreviewProof() {
  const {
    elements,
    canvasState,
    versions,
    restoreVersion,
    printNotes,
    setPrintNotes,
    saveVersion,
  } = useDesignStore()

  const [compareMode, setCompareMode] = useState<'single' | 'compare'>('single')
  const [selectedCompareVersion, setSelectedCompareVersion] = useState<string | null>(null)
  const [showBleedWarning, setShowBleedWarning] = useState(true)
  const [showVersionModal, setShowVersionModal] = useState(false)
  const [versionName, setVersionName] = useState('')
  const [versionNote, setVersionNote] = useState('')

  const renderDesignPreview = (els: CanvasElement[], w: number, h: number, scale = 1) => {
    return (
      <div
        className="relative bg-white shadow-lg"
        style={{ width: w * scale, height: h * scale }}
      >
        {canvasState.showBleed && (
          <div
            className="absolute border-2 border-dashed border-red-500/70 pointer-events-none"
            style={{ inset: -canvasState.bleedSize * scale }}
          />
        )}
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
                    textAlign: element.textAlign as CanvasTextAlign,
                    whiteSpace: 'pre-wrap',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: element.textAlign === 'center' ? 'center' : element.textAlign === 'right' ? 'flex-end' : 'flex-start',
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

            return null
          })}
      </div>
    )
  }

  const compareVersion = versions.find(v => v.id === selectedCompareVersion)
  const previewScale = 0.5

  const bleedIssues = elements.filter(e => {
    const nearEdge =
      e.x < 10 ||
      e.y < 10 ||
      e.x + e.width > canvasState.width - 10 ||
      e.y + e.height > canvasState.height - 10
    return nearEdge
  })

  const handleSaveVersion = () => {
    if (!versionName) return
    saveVersion(versionName, versionNote || undefined)
    setVersionName('')
    setVersionNote('')
    setShowVersionModal(false)
  }

  return (
    <div className="h-full flex flex-col">
      <header className="px-8 py-6 border-b border-dark-700 bg-dark-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">预览校对</h2>
            <p className="text-slate-400 mt-1">检查设计细节、对比版本、添加印刷备注</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1 border border-dark-700">
              <button
                onClick={() => setCompareMode('single')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  compareMode === 'single'
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-dark-700'
                }`}
              >
                单页预览
              </button>
              <button
                onClick={() => setCompareMode('compare')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  compareMode === 'compare'
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-dark-700'
                }`}
              >
                版本对比
              </button>
            </div>
            <button className="btn-secondary" onClick={() => setShowVersionModal(true)}>
              💾 保存版本
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto bg-dark-800 p-8">
          {compareMode === 'single' ? (
            <div className="flex flex-col items-center justify-center min-h-full">
              <div className="mb-4 flex items-center gap-4">
                <span className="text-sm text-slate-400">
                  尺寸: {canvasState.width} × {canvasState.height} px
                </span>
                <span className="text-sm text-slate-400">
                  出血: {canvasState.bleedSize}mm
                </span>
              </div>
              <div className="relative p-8">
                {renderDesignPreview(elements, canvasState.width, canvasState.height, previewScale)}
              </div>
              {showBleedWarning && bleedIssues.length > 0 && (
                <div className="mt-6 card p-4 bg-amber-900/20 border-amber-700/50 max-w-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-amber-400 text-xl">⚠️</span>
                    <div>
                      <p className="text-amber-300 font-medium">出血线警告</p>
                      <p className="text-amber-200/70 text-sm mt-1">
                        检测到 {bleedIssues.length} 个元素靠近画布边缘，印刷时可能被裁切。请确认重要内容在安全区域内。
                      </p>
                    </div>
                    <button
                      onClick={() => setShowBleedWarning(false)}
                      className="text-amber-300/60 hover:text-amber-300"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-full">
              <p className="text-slate-400 mb-6">
                {compareVersion ? '左右对比当前设计与历史版本' : '请从右侧选择一个版本进行对比'}
              </p>
              <div className="flex gap-8 items-start">
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-3 font-medium">当前版本</p>
                  {renderDesignPreview(elements, canvasState.width, canvasState.height, previewScale * 0.7)}
                </div>
                <div className="text-4xl text-slate-600 self-center">⇄</div>
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-3 font-medium">
                    {compareVersion ? `版本 ${compareVersion.version}: ${compareVersion.name}` : '未选择'}
                  </p>
                  {compareVersion
                    ? renderDesignPreview(compareVersion.elements, canvasState.width, canvasState.height, previewScale * 0.7)
                    : (
                      <div
                        className="flex items-center justify-center border-2 border-dashed border-dark-600 text-slate-600"
                        style={{ width: canvasState.width * previewScale * 0.7, height: canvasState.height * previewScale * 0.7 }}
                      >
                        请选择历史版本
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="w-80 bg-dark-900 border-l border-dark-700 overflow-y-auto">
          <div className="p-5 border-b border-dark-700">
            <h3 className="font-semibold text-white mb-4">📋 校对检查清单</h3>
            <div className="space-y-3">
              {[
                { label: '文字无错别字', checked: true, status: 'pass' },
                { label: '字体已正确嵌入', checked: true, status: 'pass' },
                { label: '图片分辨率 ≥ 300DPI', checked: false, status: 'warning' },
                { label: '色彩模式正确 (CMYK/RGB)', checked: true, status: 'pass' },
                { label: '出血线设置正确', checked: bleedIssues.length === 0, status: bleedIssues.length === 0 ? 'pass' : 'warning' },
                { label: '重要内容在安全区内', checked: bleedIssues.length === 0, status: bleedIssues.length === 0 ? 'pass' : 'warning' },
                { label: '条码可正常扫描', checked: false, status: 'pending' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className={`text-lg ${
                    item.status === 'pass' ? 'text-green-400' :
                    item.status === 'warning' ? 'text-amber-400' : 'text-slate-500'
                  }`}>
                    {item.status === 'pass' ? '✓' : item.status === 'warning' ? '⚠' : '○'}
                  </span>
                  <span className={`text-sm ${item.checked ? 'text-slate-300' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 border-b border-dark-700">
            <h3 className="font-semibold text-white mb-4">🖨️ 印刷备注</h3>
            <textarea
              value={printNotes}
              onChange={(e) => setPrintNotes(e.target.value)}
              placeholder="添加印刷说明、特殊工艺要求等..."
              className="input-field resize-none h-32"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {['覆哑膜', '覆光膜', 'UV工艺', '烫金', '模切', '压线'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setPrintNotes(printNotes ? `${printNotes}\n${tag}` : tag)}
                  className="px-2.5 py-1 bg-dark-700 hover:bg-dark-600 text-slate-300 text-xs rounded-md transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {compareMode === 'compare' && (
            <div className="p-5">
              <h3 className="font-semibold text-white mb-4">📚 历史版本</h3>
              <div className="space-y-2">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`card p-3 cursor-pointer transition-all ${
                      selectedCompareVersion === version.id
                        ? 'border-primary-500 bg-primary-600/10'
                        : 'hover:border-dark-500'
                    }`}
                    onClick={() => setSelectedCompareVersion(version.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex-shrink-0"
                        style={{ background: version.thumbnail }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">
                          v{version.version} · {version.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(version.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    {version.note && (
                      <p className="text-xs text-slate-500 mt-2 pl-13">{version.note}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          restoreVersion(version.id)
                        }}
                        className="text-xs text-primary-400 hover:text-primary-300"
                      >
                        恢复此版本
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {showVersionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">保存设计版本</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 block mb-1.5">版本名称</label>
                <input
                  type="text"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="如：调整配色方案"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1.5">备注说明 (可选)</label>
                <textarea
                  value={versionNote}
                  onChange={(e) => setVersionNote(e.target.value)}
                  placeholder="记录此版本的修改内容..."
                  className="input-field resize-none h-24"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowVersionModal(false)}
                className="btn-secondary"
              >
                取消
              </button>
              <button onClick={handleSaveVersion} className="btn-primary">
                保存版本
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
