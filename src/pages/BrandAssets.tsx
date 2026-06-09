import { useState } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import type { BrandAsset } from '@/types'

type AssetTab = 'logo' | 'font' | 'color'

export default function BrandAssets() {
  const { brandAssets, addBrandAsset, removeBrandAsset } = useDesignStore()
  const [activeTab, setActiveTab] = useState<AssetTab>('logo')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newAssetName, setNewAssetName] = useState('')
  const [newAssetData, setNewAssetData] = useState('')

  const filteredAssets = brandAssets.filter((a) => a.type === activeTab)

  const handleAddAsset = () => {
    if (!newAssetName || !newAssetData) return
    const newAsset: BrandAsset = {
      id: `ba-${Date.now()}`,
      type: activeTab,
      name: newAssetName,
      data: newAssetData,
      createdAt: new Date().toISOString(),
    }
    addBrandAsset(newAsset)
    setNewAssetName('')
    setNewAssetData('')
    setShowAddModal(false)
  }

  const renderAssetCard = (asset: BrandAsset) => {
    if (asset.type === 'logo') {
      return (
        <div className="aspect-[4/3] bg-dark-700/50 rounded-lg flex items-center justify-center p-4">
          {asset.data.startsWith('data:') ? (
            <img src={asset.data} alt={asset.name} className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-3xl">🏷️</span>
          )}
        </div>
      )
    }
    if (asset.type === 'font') {
      return (
        <div className="aspect-[4/3] bg-dark-700/50 rounded-lg flex items-center justify-center">
          <span style={{ fontFamily: asset.data }} className="text-3xl text-slate-200">
            Aa 字
          </span>
        </div>
      )
    }
    return (
      <div className="aspect-[4/3] rounded-lg" style={{ backgroundColor: asset.data }} />
    )
  }

  return (
    <div className="h-full flex flex-col">
      <header className="px-8 py-6 border-b border-dark-700 bg-dark-900/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">品牌资产</h2>
            <p className="text-slate-400 mt-1">管理你的 Logo、常用字体和品牌色彩</p>
          </div>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <span>+</span> 添加{activeTab === 'logo' ? 'Logo' : activeTab === 'font' ? '字体' : '颜色'}
          </button>
        </div>

        <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1 border border-dark-700 w-fit">
          {[
            { value: 'logo', label: 'Logo', icon: '🏷️' },
            { value: 'font', label: '字体', icon: '🔤' },
            { value: 'color', label: '品牌色', icon: '🎨' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value as AssetTab)}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.value
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="card p-4 group relative hover:border-primary-500/50 transition-all"
            >
              <button
                onClick={() => removeBrandAsset(asset.id)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-dark-700/80 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 hover:text-white flex items-center justify-center text-sm"
              >
                ×
              </button>
              {renderAssetCard(asset)}
              <div className="mt-3">
                <p className="font-medium text-white">{asset.name}</p>
                {asset.type === 'font' && (
                  <p className="text-xs text-slate-500 mt-1 font-mono">{asset.data}</p>
                )}
                {asset.type === 'color' && (
                  <p className="text-xs text-slate-500 mt-1 font-mono uppercase">{asset.data}</p>
                )}
                <p className="text-xs text-slate-600 mt-1">
                  {new Date(asset.createdAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>
          ))}

          <div
            className="card p-4 border-dashed border-dark-600 flex flex-col items-center justify-center aspect-[4/5] cursor-pointer hover:border-primary-500 hover:bg-dark-800/50 transition-colors"
            onClick={() => setShowAddModal(true)}
          >
            <span className="text-4xl text-slate-500 mb-3">+</span>
            <p className="text-slate-400">添加新的{activeTab === 'logo' ? 'Logo' : activeTab === 'font' ? '字体' : '品牌色'}</p>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">
              添加{activeTab === 'logo' ? 'Logo' : activeTab === 'font' ? '字体' : '品牌色'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 block mb-1.5">名称</label>
                <input
                  type="text"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  placeholder="输入名称"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1.5">
                  {activeTab === 'logo' ? '图片 Data URL' : activeTab === 'font' ? '字体名称' : '颜色值 (HEX)'}
                </label>
                {activeTab === 'color' ? (
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={newAssetData || '#9333ea'}
                      onChange={(e) => setNewAssetData(e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer bg-transparent border border-dark-600"
                    />
                    <input
                      type="text"
                      value={newAssetData}
                      onChange={(e) => setNewAssetData(e.target.value)}
                      placeholder="#9333ea"
                      className="input-field flex-1"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={newAssetData}
                    onChange={(e) => setNewAssetData(e.target.value)}
                    placeholder={activeTab === 'logo' ? 'data:image/...' : 'SimSun'}
                    className="input-field"
                  />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-secondary"
              >
                取消
              </button>
              <button onClick={handleAddAsset} className="btn-primary">
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
