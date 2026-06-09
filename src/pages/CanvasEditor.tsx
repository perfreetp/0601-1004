import { useState, useRef, useEffect } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import type { CanvasElement } from '@/types'

export default function CanvasEditor() {
  const {
    selectedTemplate,
    canvasState,
    updateCanvasState,
    elements,
    addElement,
    updateElement,
    removeElement,
    selectedElementId,
    setSelectedElementId,
    colorSchemes,
    applyColorScheme,
  } = useDesignStore()

  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  const selectedElement = elements.find((e) => e.id === selectedElementId)

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedElementId(null)
    }
  }

  const handleElementMouseDown = (e: React.MouseEvent, element: CanvasElement) => {
    e.stopPropagation()
    setSelectedElementId(element.id)
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setDragging(element.id)
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const newX = (e.clientX - canvasRect.left - dragOffset.x) / canvasState.zoom
    const newY = (e.clientY - canvasRect.top - dragOffset.y) / canvasState.zoom
    updateElement(dragging, {
      x: Math.max(0, Math.min(newX, canvasState.width - 50)),
      y: Math.max(0, Math.min(newY, canvasState.height - 20)),
    })
  }

  const handleMouseUp = () => {
    setDragging(null)
  }

  const addTextElement = () => {
    const newElement: CanvasElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: 50,
      y: 50,
      width: 200,
      height: 40,
      rotation: 0,
      zIndex: elements.length,
      content: '双击编辑文字',
      fontSize: 24,
      fontFamily: 'sans-serif',
      fontWeight: 'normal',
      textAlign: 'left',
      color: '#1e293b',
    }
    addElement(newElement)
  }

  const addShapeElement = (shape: 'rect' | 'circle') => {
    const newElement: CanvasElement = {
      id: `shape-${Date.now()}`,
      type: 'shape',
      x: 50,
      y: 50,
      width: 100,
      height: 100,
      rotation: 0,
      zIndex: elements.length,
      shapeType: shape,
      fill: '#a855f7',
    }
    addElement(newElement)
  }

  const addImageElement = () => {
    const newElement: CanvasElement = {
      id: `img-${Date.now()}`,
      type: 'image',
      x: 50,
      y: 50,
      width: 120,
      height: 120,
      rotation: 0,
      zIndex: elements.length,
      src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiMzMzQxNTUiLz48dGV4dCB4PSI2MCIgeT0iNjgiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjQwIiBmaWxsPSIjOTRhM2I4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn5SkPC90ZXh0Pjwvc3ZnPg==',
    }
    addElement(newElement)
  }

  const renderElement = (element: CanvasElement) => {
    const isSelected = element.id === selectedElementId
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: element.x * canvasState.zoom,
      top: element.y * canvasState.zoom,
      width: element.width * canvasState.zoom,
      height: element.height * canvasState.zoom,
      transform: `rotate(${element.rotation}deg)`,
      cursor: 'move',
      outline: isSelected ? '2px solid #a855f7' : 'none',
      outlineOffset: '2px',
      zIndex: element.zIndex,
      boxSizing: 'border-box',
    }

    if (element.type === 'text') {
      return (
        <div
          key={element.id}
          style={{
            ...baseStyle,
            fontSize: (element.fontSize || 16) * canvasState.zoom,
            fontFamily: element.fontFamily,
            fontWeight: element.fontWeight,
            color: element.color,
            textAlign: element.textAlign as CanvasTextAlign,
            whiteSpace: 'pre-wrap',
            display: 'flex',
            alignItems: 'center',
            justifyContent: element.textAlign === 'center' ? 'center' : element.textAlign === 'right' ? 'flex-end' : 'flex-start',
            padding: '4px',
            userSelect: 'none',
          }}
          onMouseDown={(e) => handleElementMouseDown(e, element)}
          onDoubleClick={() => {
            const newContent = prompt('编辑文字内容', element.content)
            if (newContent !== null) {
              updateElement(element.id, { content: newContent })
            }
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
          onMouseDown={(e) => handleElementMouseDown(e, element)}
        />
      )
    }

    if (element.type === 'image') {
      return (
        <img
          key={element.id}
          src={element.src}
          alt=""
          style={{
            ...baseStyle,
            objectFit: 'contain',
          }}
          onMouseDown={(e) => handleElementMouseDown(e, element)}
        />
      )
    }

    return null
  }

  return (
    <div className="h-full flex flex-col">
      <header className="px-6 py-4 border-b border-dark-700 bg-dark-900 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">画布编辑</h2>
          {selectedTemplate && (
            <span className="px-3 py-1 bg-dark-700 rounded-full text-sm text-slate-300">
              当前模板: {selectedTemplate.name}
            </span>
          )}
          {!selectedTemplate && (
            <span className="px-3 py-1 bg-dark-800 border border-dashed border-dark-600 rounded-full text-sm text-slate-500">
              空白画布 - 可从模板广场选择模板
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">
            ↶ 撤销
          </button>
          <button className="btn-secondary">
            ↷ 重做
          </button>
          <button className="btn-primary">
            💾 保存
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-16 bg-dark-900 border-r border-dark-700 flex flex-col items-center py-4 gap-2">
          <ToolButton icon="📝" label="文字" onClick={addTextElement} />
          <ToolButton icon="⬜" label="矩形" onClick={() => addShapeElement('rect')} />
          <ToolButton icon="⭕" label="圆形" onClick={() => addShapeElement('circle')} />
          <ToolButton icon="🖼️" label="图片" onClick={addImageElement} />
          <ToolButton icon="📱" label="条码" onClick={() => {}} />
          <div className="flex-1" />
          <ToolButton
            icon="🔍+"
            label="放大"
            onClick={() => updateCanvasState({ zoom: Math.min(canvasState.zoom + 0.1, 3) })}
          />
          <span className="text-xs text-slate-500 my-1">
            {Math.round(canvasState.zoom * 100)}%
          </span>
          <ToolButton
            icon="🔍-"
            label="缩小"
            onClick={() => updateCanvasState({ zoom: Math.max(canvasState.zoom - 0.1, 0.25) })}
          />
        </div>

        <div
          className="flex-1 bg-dark-800 overflow-auto flex items-center justify-center p-8"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="relative shadow-2xl"
            style={{
              width: canvasState.width * canvasState.zoom,
              height: canvasState.height * canvasState.zoom,
              backgroundColor: canvasState.backgroundColor,
            }}
          >
            {canvasState.showBleed && (
              <div
                className="absolute border-2 border-dashed border-red-500/60 pointer-events-none"
                style={{
                  inset: -canvasState.bleedSize * canvasState.zoom,
                }}
              />
            )}

            {canvasState.showGrid && (
              <div
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `linear-gradient(to right, #ccc 1px, transparent 1px), linear-gradient(to bottom, #ccc 1px, transparent 1px)`,
                  backgroundSize: `${canvasState.gridSize * canvasState.zoom}px ${canvasState.gridSize * canvasState.zoom}px`,
                }}
              />
            )}

            <div
              ref={canvasRef}
              className="absolute inset-0"
              onClick={handleCanvasClick}
            >
              {[...elements]
                .sort((a, b) => a.zIndex - b.zIndex)
                .map(renderElement)}
            </div>
          </div>
        </div>

        <div className="w-72 bg-dark-900 border-l border-dark-700 overflow-y-auto">
          <div className="p-4 border-b border-dark-700">
            <h3 className="font-semibold text-white mb-3">画布设置</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">宽度(px)</label>
                  <input
                    type="number"
                    value={canvasState.width}
                    onChange={(e) => updateCanvasState({ width: Number(e.target.value) })}
                    className="input-field !py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">高度(px)</label>
                  <input
                    type="number"
                    value={canvasState.height}
                    onChange={(e) => updateCanvasState({ height: Number(e.target.value) })}
                    className="input-field !py-1.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">背景色</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={canvasState.backgroundColor}
                    onChange={(e) => updateCanvasState({ backgroundColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent border border-dark-600"
                  />
                  <input
                    type="text"
                    value={canvasState.backgroundColor}
                    onChange={(e) => updateCanvasState({ backgroundColor: e.target.value })}
                    className="input-field flex-1 !py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">显示出血线</span>
                <button
                  onClick={() => updateCanvasState({ showBleed: !canvasState.showBleed })}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    canvasState.showBleed ? 'bg-primary-600' : 'bg-dark-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      canvasState.showBleed ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">显示网格</span>
                <button
                  onClick={() => updateCanvasState({ showGrid: !canvasState.showGrid })}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    canvasState.showGrid ? 'bg-primary-600' : 'bg-dark-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      canvasState.showGrid ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-dark-700">
            <h3 className="font-semibold text-white mb-3">配色方案</h3>
            <div className="grid grid-cols-2 gap-2">
              {colorSchemes.map((scheme) => (
                <button
                  key={scheme.id}
                  onClick={() => applyColorScheme(scheme)}
                  className="rounded-lg overflow-hidden border border-dark-600 hover:border-primary-500 transition-colors group"
                >
                  <div
                    className="h-12"
                    style={{ background: scheme.preview }}
                  />
                  <div className="p-2 bg-dark-800">
                    <p className="text-xs text-slate-300 group-hover:text-white">{scheme.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedElement && (
            <div className="p-4">
              <h3 className="font-semibold text-white mb-3">元素属性</h3>
              <div className="space-y-3">
                {selectedElement.type === 'text' && (
                  <>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">文字内容</label>
                      <textarea
                        value={selectedElement.content || ''}
                        onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                        className="input-field !py-1.5 text-sm resize-none"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">字体大小</label>
                      <input
                        type="number"
                        value={selectedElement.fontSize || 16}
                        onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                        className="input-field !py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">文字颜色</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={selectedElement.color || '#000000'}
                          onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer bg-transparent border border-dark-600"
                        />
                        <input
                          type="text"
                          value={selectedElement.color || '#000000'}
                          onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                          className="input-field flex-1 !py-1.5 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">对齐方式</label>
                      <div className="flex gap-1">
                        {['left', 'center', 'right'].map((align) => (
                          <button
                            key={align}
                            onClick={() => updateElement(selectedElement.id, { textAlign: align })}
                            className={`flex-1 py-1.5 rounded text-sm ${
                              selectedElement.textAlign === align
                                ? 'bg-primary-600 text-white'
                                : 'bg-dark-700 text-slate-300 hover:bg-dark-600'
                            }`}
                          >
                            {align === 'left' ? '左' : align === 'center' ? '中' : '右'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {(selectedElement.type === 'shape') && (
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">填充颜色</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={selectedElement.fill || '#000000'}
                        onChange={(e) => updateElement(selectedElement.id, { fill: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer bg-transparent border border-dark-600"
                      />
                      <input
                        type="text"
                        value={selectedElement.fill || '#000000'}
                        onChange={(e) => updateElement(selectedElement.id, { fill: e.target.value })}
                        className="input-field flex-1 !py-1.5 text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">X</label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.x)}
                      onChange={(e) => updateElement(selectedElement.id, { x: Number(e.target.value) })}
                      className="input-field !py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Y</label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.y)}
                      onChange={(e) => updateElement(selectedElement.id, { y: Number(e.target.value) })}
                      className="input-field !py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">宽度</label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.width)}
                      onChange={(e) => updateElement(selectedElement.id, { width: Number(e.target.value) })}
                      className="input-field !py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">高度</label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.height)}
                      onChange={(e) => updateElement(selectedElement.id, { height: Number(e.target.value) })}
                      className="input-field !py-1.5 text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={() => removeElement(selectedElement.id)}
                  className="w-full py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors text-sm"
                >
                  🗑️ 删除元素
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ToolButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-12 h-12 flex flex-col items-center justify-center gap-0.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors group"
      title={label}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[10px]">{label}</span>
    </button>
  )
}
