import { useState } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import type { OrderItem } from '@/types'

const sampleOrders: OrderItem[] = [
  { id: '1', orderNo: 'DD20240201001', customerName: '张小明', productName: '手工香薰蜡烛', quantity: 2 },
  { id: '2', orderNo: 'DD20240201002', customerName: '李雨晴', productName: '手绘明信片套装', quantity: 1 },
  { id: '3', orderNo: 'DD20240201003', customerName: '王大伟', productName: '手工编织挂件', quantity: 3 },
  { id: '4', orderNo: 'DD20240201004', customerName: '赵小美', productName: '手工香薰蜡烛', quantity: 1 },
  { id: '5', orderNo: 'DD20240201005', customerName: '陈思远', productName: '陶瓷手工杯', quantity: 2 },
]

export default function BatchGenerator() {
  const { orderItems, importOrderItems, elements } = useDesignStore()
  const [barcodeValue, setBarcodeValue] = useState('123456789012')
  const [barcodeFormat, setBarcodeFormat] = useState('CODE128')

  const handleImportSample = () => {
    importOrderItems(sampleOrders)
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
      }
    } else {
      importOrderItems(sampleOrders)
    }
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
            <p className="text-slate-400 mt-1">导入订单数据，批量替换变量并生成条码</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={handleImportCSV}>
              📄 导入 CSV
            </button>
            <button className="btn-secondary" onClick={handleImportSample}>
              📋 导入示例数据
            </button>
            <button className="btn-primary">
              🚀 开始批量生成
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-8 py-4 border-b border-dark-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">订单清单 ({orderItems.length} 条)</h3>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-primary-600/20 text-primary-400 rounded-full text-sm">
                模板变量: {placeholders.size > 0 ? Array.from(placeholders).join(', ') : '暂无 (请在画布中添加 {{name}} 等变量)'}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
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
            ) : (
              <table className="w-full">
                <thead className="bg-dark-800/50 sticky top-0">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">#</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">订单号</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">客户姓名</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">商品名称</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">数量</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">预览替换</th>
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
                        <button className="text-primary-400 hover:text-primary-300 text-sm">预览</button>
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
                  placeholder="输入条码内容"
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
                  <option value="pharmacode">Pharmacode</option>
                </select>
              </div>

              <div className="card p-4 flex items-center justify-center bg-dark-800">
                <svg width="200" height="60" viewBox="0 0 200 60">
                  {Array.from({ length: 50 }).map((_, i) => (
                    <rect
                      key={i}
                      x={10 + i * 3.6}
                      y={10}
                      width={i % 3 === 0 ? 2.5 : 1.2}
                      height={35}
                      fill={i % 2 === 0 ? '#1e293b' : 'transparent'}
                    />
                  ))}
                  <text x="100" y="55" textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="monospace">
                    {barcodeValue}
                  </text>
                </svg>
              </div>

              <button className="w-full btn-primary justify-center">
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
                      {placeholder === '{{name}}' ? '客户姓名' : placeholder === '{{orderNo}}' ? '订单号' : '自定义字段'}
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
        </aside>
      </div>
    </div>
  )
}
