import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDesignStore } from '@/store/useDesignStore'
import type { Template } from '@/types'

export default function TemplateSquare() {
  const navigate = useNavigate()
  const { templates, toggleFavoriteTemplate, setSelectedTemplate } = useDesignStore()
  const [category, setCategory] = useState<'all' | 'box-sticker' | 'thank-you-card'>('all')
  const [showFavorites, setShowFavorites] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTemplates = templates.filter((t) => {
    if (category !== 'all' && t.category !== category) return false
    if (showFavorites && !t.isFavorite) return false
    if (searchTerm && !t.name.includes(searchTerm) && !t.tags.some(tag => tag.includes(searchTerm))) return false
    return true
  })

  const handleUseTemplate = (template: Template) => {
    setSelectedTemplate(template)
    navigate('/editor')
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="px-8 py-6 border-b border-dark-700 bg-dark-900/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">模板广场</h2>
            <p className="text-slate-400 mt-1">精选盒贴与感谢卡模板，快速开始你的设计</p>
          </div>
          <button className="btn-primary">
            <span>+</span> 新建空白模板
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="搜索模板名称或标签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1 border border-dark-700">
            {[
              { value: 'all', label: '全部' },
              { value: 'box-sticker', label: '盒贴' },
              { value: 'thank-you-card', label: '感谢卡' },
            ].map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value as typeof category)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  category === c.value
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-dark-700'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={`btn-secondary ${showFavorites ? '!bg-primary-600/20 !border-primary-600 !text-primary-400' : ''}`}
          >
            {showFavorites ? '⭐' : '☆'} 我的收藏
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="card group overflow-hidden hover:border-primary-600/50 transition-all duration-300 hover:shadow-glow"
            >
              <div
                className="aspect-[3/2] relative overflow-hidden"
                style={{ background: template.thumbnail }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl opacity-50">
                    {template.category === 'box-sticker' ? '📦' : '💌'}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavoriteTemplate(template.id)
                  }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-lg hover:bg-black/60 transition-colors"
                >
                  {template.isFavorite ? '⭐' : '☆'}
                </button>

                <div className="absolute bottom-3 left-3 flex gap-1.5">
                  <span className="px-2 py-0.5 text-xs bg-black/40 backdrop-blur-sm text-white rounded-full">
                    {template.category === 'box-sticker' ? '盒贴' : '感谢卡'}
                  </span>
                  <span className="px-2 py-0.5 text-xs bg-black/40 backdrop-blur-sm text-white rounded-full">
                    {template.width}×{template.height}
                  </span>
                </div>

                <div className="absolute inset-0 bg-dark-900/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="btn-primary !px-5"
                  >
                    使用模板
                  </button>
                  <button className="btn-secondary !px-4">
                    预览
                  </button>
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-white mb-2">{template.name}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs bg-dark-700 text-slate-300 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="text-6xl mb-4">🔍</span>
            <p className="text-slate-400 text-lg">没有找到匹配的模板</p>
            <p className="text-slate-500 text-sm mt-1">试试调整筛选条件或搜索关键词</p>
          </div>
        )}
      </div>
    </div>
  )
}
