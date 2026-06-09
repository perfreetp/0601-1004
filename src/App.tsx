import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import TemplateSquare from './pages/TemplateSquare'
import CanvasEditor from './pages/CanvasEditor'
import MaterialLibrary from './pages/MaterialLibrary'
import BrandAssets from './pages/BrandAssets'
import BatchGenerator from './pages/BatchGenerator'
import PreviewProof from './pages/PreviewProof'
import ExportCenter from './pages/ExportCenter'

interface NavItem {
  path: string
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { path: '/templates', label: '模板广场', icon: '🎨' },
  { path: '/editor', label: '画布编辑', icon: '✏️' },
  { path: '/materials', label: '素材库', icon: '🖼️' },
  { path: '/brand', label: '品牌资产', icon: '🏷️' },
  { path: '/batch', label: '批量生成', icon: '📦' },
  { path: '/preview', label: '预览校对', icon: '👁️' },
  { path: '/export', label: '导出中心', icon: '📤' },
]

function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-700 flex flex-col">
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-xl shadow-glow">
            ✨
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">创意设计工作室</h1>
            <p className="text-xs text-slate-500">Creative Design Studio</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <div
            key={item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-dark-700">
        <div className="card p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">
              手
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">手作生活馆</p>
              <p className="text-xs text-slate-500">专业版</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

function App() {
  return (
    <div className="flex h-screen bg-dark-900">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/templates" replace />} />
          <Route path="/templates" element={<TemplateSquare />} />
          <Route path="/editor" element={<CanvasEditor />} />
          <Route path="/materials" element={<MaterialLibrary />} />
          <Route path="/brand" element={<BrandAssets />} />
          <Route path="/batch" element={<BatchGenerator />} />
          <Route path="/preview" element={<PreviewProof />} />
          <Route path="/export" element={<ExportCenter />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
