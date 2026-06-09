import { useState } from 'react'
import { useDesignStore } from '@/store/useDesignStore'

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
  const { materials } = useDesignStore()
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredMaterials = materials.filter((m) => {
    if (activeCategory !== 'all' && activeCategory !== '上传' && m.category !== activeCategory) return false
    if (activeCategory === '上传' && !m.isUploaded) return false
    if (searchTerm && !m.name.includes(searchTerm) && !m.tags.some(t => t.includes(searchTerm))) return false
    return true
  })

  return (
    <div className="h-full flex flex-col">
      <header className="px-8 py-6 border-b border-dark-700 bg-dark-900/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">素材库</h2>
            <p className="text-slate-400 mt-1">精选设计素材，丰富你的创作</p>
          </div>
          <button className="btn-primary">
            <span>⬆️</span> 上传素材
          </button>
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
              >
                <div className="aspect-square bg-dark-700/50 rounded-lg flex items-center justify-center mb-3 overflow-hidden">
                  <span className="text-4xl group-hover:scale-110 transition-transform">
                    {material.thumbnail}
                  </span>
                </div>
                <p className="text-sm text-slate-200 font-medium truncate">{material.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{material.category}</p>
              </div>
            ))}

            <div className="card p-3 border-dashed border-dark-600 flex flex-col items-center justify-center aspect-square cursor-pointer hover:border-primary-500 hover:bg-dark-800/50 transition-colors">
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
