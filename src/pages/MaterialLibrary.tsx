import { useState, useRef } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import type { MaterialItem, CanvasElement } from '@/types'

const categories = [
  { id: 'all', name: '全部', icon: '📁' },
  { id: '花卉', name: '花卉', icon: '🌸' },
  { id: '植物', name: '植物', icon: '🌿' },
  { id: '图标', name: '图标', icon: '⭐' },
  { id: '图案', name: '图案', icon: '🔷' },
  { id: '装饰', name: '装饰', icon: '🎀' },
  { id: '边框', name: '边框', icon: '🖼️' },
  { id: '上传', name: '我的上传', icon: '☁️' },
]

export default function MaterialLibrary() {
  const { materials, addUploadedMaterial, addElement, canvasState, elements } = useDesignStore()
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredMaterials = materials.filter((m) => {
    if (activeCategory !== 'all' && activeCategory !== '上传' && m.category !== activeCategory) return false
    if (activeCategory === '上传' && !m.isUploaded) return false
    if (searchTerm && !m.name.includes(searchTerm) && !m.tags.some(t => t.includes(searchTerm))) return false
    return true
  })

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const img = new Image()
        img.onload = () => {
          const material: MaterialItem = {
            id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            category: '上传',
            type: 'image',
            thumbnail: result,
            url: result,
            tags: ['上传'],
            isUploaded: true,
          }
          addUploadedMaterial(material)
        }
        img.src = result
      }
      reader.readAsDataURL(file)
    })

    e.target.value = ''
  }

  const handleInsertToCanvas = (material: MaterialItem) => {
    if (material.isUploaded && material.url) {
      const newElement: CanvasElement = {
        id: `img-${Date.now()}`,
        type: 'image',
        x: 50,
        y: 50,
        width: Math.min(150, canvasState.width * 0.3),
        height: Math.min(150, canvasState.height * 0.3),
        rotation: 0,
        zIndex: elements.length,
        src: material.url,
      }
      addElement(newElement)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <header className="px-8 py-6 border-b border-dark-700 bg-dark-900/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">素材库</h2>
            <p className="text-slate-400 mt-1">精选设计素材，点击即可插入画布</p>
          </div>
          <button className="btn-primary" onClick={handleUploadClick}>
            <span>⬆️</span> 上传素材
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="relative max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
          <input
            type="text"
            placeholder="搜索素材名称或标签..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-52 bg-dark-900 border-r border-dark-700 p-3">
          <div className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-primary-600 text-white shadow-glow'
                    : 'text-slate-400 hover:text-white hover:bg-dark-700'
                }`}
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="text-sm font-medium">{cat.name}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredMaterials.map((material) => (
              <div
                key={material.id}
                className="card p-3 group cursor-pointer hover:border-primary-500/50 transition-all hover:shadow-glow"
                onClick={() => handleInsertToCanvas(material)}
                title={material.isUploaded ? '点击插入画布' : '示例素材'}
              >
                <div className="aspect-square bg-dark-700/50 rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                  {material.isUploaded && material.url ? (
                    <img
                      src={material.url}
                      alt={material.name}
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                    />
                  ) : (
                    <span className="text-4xl group-hover:scale-110 transition-transform">
                      {material.thumbnail}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-200 font-medium truncate">{material.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {material.category}
                  {material.isUploaded && <span className="ml-1 text-primary-400">· 点击插入</span>}
                </p>
              </div>
            ))}

            <div
              className="card p-3 border-dashed border-dark-600 flex flex-col items-center justify-center aspect-square cursor-pointer hover:border-primary-500 hover:bg-dark-800/50 transition-colors"
              onClick={handleUploadClick}
            >
              <span className="text-3xl text-slate-500 mb-2">+</span>
              <p className="text-sm text-slate-500">上传素材</p>
            </div>
          </div>

          {filteredMaterials.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <span className="text-6xl mb-4">🖼️</span>
              <p className="text-slate-400 text-lg">暂无素材</p>
              <p className="text-slate-500 text-sm mt-1">试试其他分类或上传新素材</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
