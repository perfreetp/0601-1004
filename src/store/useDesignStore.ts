import { create } from 'zustand'
import type {
  Template,
  CanvasElement,
  MaterialItem,
  BrandAsset,
  OrderItem,
  DesignVersion,
  ExportConfig,
  CanvasState,
  ColorScheme,
  HistorySnapshot,
} from '@/types'
import { mockTemplates, mockColorSchemes, mockMaterials, mockBrandAssets, mockVersions } from '@/data/mockData'

const STORAGE_KEYS = {
  design: 'cds_saved_design',
  templates: 'cds_templates',
  favorites: 'cds_favorites',
  brandAssets: 'cds_brand_assets',
  materials: 'cds_uploaded_materials',
  versions: 'cds_versions',
  exportConfig: 'cds_export_config',
  printNotes: 'cds_print_notes',
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch (_) { /* ignore */ }
  return fallback
}

function saveToStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (_) { /* ignore */ }
}

function deepCloneElements(els: CanvasElement[]): CanvasElement[] {
  return els.map(e => ({ ...e }))
}

interface PersistedDesign {
  elements: CanvasElement[]
  canvasState: CanvasState
  savedAt: string
}

interface DesignStore {
  templates: Template[]
  selectedTemplate: Template | null
  colorSchemes: ColorScheme[]
  materials: MaterialItem[]
  brandAssets: BrandAsset[]
  orderItems: OrderItem[]
  versions: DesignVersion[]
  canvasState: CanvasState
  elements: CanvasElement[]
  selectedElementId: string | null
  exportConfig: ExportConfig
  printNotes: string

  history: HistorySnapshot[]
  historyIndex: number
  canUndo: boolean
  canRedo: boolean

  setSelectedTemplate: (template: Template | null) => void
  toggleFavoriteTemplate: (id: string) => void
  createBlankTemplate: () => void

  addElement: (element: CanvasElement, recordHistory?: boolean) => void
  updateElement: (id: string, updates: Partial<CanvasElement>, recordHistory?: boolean) => void
  removeElement: (id: string, recordHistory?: boolean) => void
  setSelectedElementId: (id: string | null) => void
  applyColorScheme: (scheme: ColorScheme) => void
  updateCanvasState: (updates: Partial<CanvasState>, recordHistory?: boolean) => void

  undo: () => void
  redo: () => void
  _pushHistory: () => void

  saveDesign: () => string
  restoreSavedDesign: () => boolean

  addBrandAsset: (asset: BrandAsset) => void
  removeBrandAsset: (id: string) => void
  addUploadedMaterial: (material: MaterialItem) => void

  importOrderItems: (items: OrderItem[]) => void
  saveVersion: (name: string, note?: string) => void
  restoreVersion: (versionId: string) => void
  setExportConfig: (updates: Partial<ExportConfig>) => void
  setPrintNotes: (notes: string) => void
  batchReplace: (field: 'customerName' | 'orderNo' | string, values: Record<string, string>) => void
}

let versionCounter = 1

const defaultCanvasState: CanvasState = {
  width: 600,
  height: 400,
  zoom: 1,
  showBleed: true,
  bleedSize: 3,
  showGrid: false,
  gridSize: 10,
  backgroundColor: '#ffffff',
}

const defaultExportConfig: ExportConfig = {
  format: 'png',
  dpi: 300,
  quality: 90,
  bleed: 3,
  colorMode: 'rgb',
  imposition: false,
  impositionRows: 2,
  impositionCols: 3,
}

function getInitialState() {
  const persistedFavorites = loadFromStorage<Record<string, boolean>>(STORAGE_KEYS.favorites, {})
  const persistedBrandAssets = loadFromStorage<BrandAsset[]>(STORAGE_KEYS.brandAssets, [])
  const persistedMaterials = loadFromStorage<MaterialItem[]>(STORAGE_KEYS.materials, [])
  const persistedVersions = loadFromStorage<DesignVersion[]>(STORAGE_KEYS.versions, [])
  const persistedExportConfig = loadFromStorage<Partial<ExportConfig>>(STORAGE_KEYS.exportConfig, {})
  const persistedPrintNotes = loadFromStorage<string>(STORAGE_KEYS.printNotes, '')

  const templatesWithFavorites = mockTemplates.map(t => ({
    ...t,
    isFavorite: persistedFavorites[t.id] ?? t.isFavorite,
  }))

  const mergedBrandAssets = [
    ...persistedBrandAssets,
    ...mockBrandAssets.filter(a => !persistedBrandAssets.find(p => p.id === a.id)),
  ]
  const mergedMaterials = [
    ...mockMaterials,
    ...persistedMaterials,
  ]
  const mergedVersions = persistedVersions.length > 0 ? persistedVersions : mockVersions
  versionCounter = mergedVersions.length + 1

  return {
    templates: templatesWithFavorites,
    brandAssets: mergedBrandAssets,
    materials: mergedMaterials,
    versions: mergedVersions,
    exportConfig: { ...defaultExportConfig, ...persistedExportConfig },
    printNotes: persistedPrintNotes,
  }
}

export const useDesignStore = create<DesignStore>((set, get) => {
  const initial = getInitialState()

  return {
    templates: initial.templates,
    selectedTemplate: null,
    colorSchemes: mockColorSchemes,
    materials: initial.materials,
    brandAssets: initial.brandAssets,
    orderItems: [],
    versions: initial.versions,
    canvasState: defaultCanvasState,
    elements: [],
    selectedElementId: null,
    exportConfig: initial.exportConfig,
    printNotes: initial.printNotes,

    history: [],
    historyIndex: -1,
    canUndo: false,
    canRedo: false,

    _pushHistory: () => {
      const state = get()
      const snapshot: HistorySnapshot = {
        elements: deepCloneElements(state.elements),
        canvasState: { ...state.canvasState },
      }
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(snapshot)
      const maxHistory = 50
      if (newHistory.length > maxHistory) newHistory.splice(0, newHistory.length - maxHistory)
      set({
        history: newHistory,
        historyIndex: newHistory.length - 1,
        canUndo: newHistory.length > 1,
        canRedo: false,
      })
    },

    undo: () => {
      const state = get()
      if (state.historyIndex <= 0) return
      const newIndex = state.historyIndex - 1
      const snapshot = state.history[newIndex]
      if (!snapshot) return
      set({
        historyIndex: newIndex,
        canUndo: newIndex > 0,
        canRedo: true,
        elements: deepCloneElements(snapshot.elements),
        canvasState: { ...snapshot.canvasState },
      })
    },

    redo: () => {
      const state = get()
      if (state.historyIndex >= state.history.length - 1) return
      const newIndex = state.historyIndex + 1
      const snapshot = state.history[newIndex]
      if (!snapshot) return
      set({
        historyIndex: newIndex,
        canUndo: true,
        canRedo: newIndex < state.history.length - 1,
        elements: deepCloneElements(snapshot.elements),
        canvasState: { ...snapshot.canvasState },
      })
    },

    saveDesign: () => {
      const { elements, canvasState } = get()
      const data: PersistedDesign = {
        elements: deepCloneElements(elements),
        canvasState: { ...canvasState },
        savedAt: new Date().toISOString(),
      }
      saveToStorage(STORAGE_KEYS.design, data)
      return data.savedAt
    },

    restoreSavedDesign: () => {
      const saved = loadFromStorage<PersistedDesign | null>(STORAGE_KEYS.design, null)
      if (!saved) return false
      set({
        elements: deepCloneElements(saved.elements),
        canvasState: { ...saved.canvasState },
      })
      get()._pushHistory()
      return true
    },

    setSelectedTemplate: (template) => {
      if (template) {
        set({
          selectedTemplate: template,
          elements: template.elements.map(e => ({ ...e })),
          canvasState: {
            ...defaultCanvasState,
            width: template.width,
            height: template.height,
          },
        })
      } else {
        set({ selectedTemplate: null, elements: [] })
      }
      get()._pushHistory()
    },

    createBlankTemplate: () => {
      set({
        selectedTemplate: null,
        elements: [],
        canvasState: { ...defaultCanvasState },
        selectedElementId: null,
      })
      get()._pushHistory()
    },

    toggleFavoriteTemplate: (id) => {
      set((state) => {
        const newTemplates = state.templates.map((t) =>
          t.id === id ? { ...t, isFavorite: !t.isFavorite } : t
        )
        const favMap: Record<string, boolean> = {}
        newTemplates.forEach(t => { favMap[t.id] = t.isFavorite })
        saveToStorage(STORAGE_KEYS.favorites, favMap)
        return { templates: newTemplates }
      })
    },

    addElement: (element, recordHistory = true) => {
      set((state) => ({
        elements: [...state.elements, element],
        selectedElementId: element.id,
      }))
      if (recordHistory) get()._pushHistory()
    },

    updateElement: (id, updates, recordHistory = true) => {
      set((state) => ({
        elements: state.elements.map((e) =>
          e.id === id ? { ...e, ...updates } : e
        ),
      }))
      if (recordHistory) get()._pushHistory()
    },

    removeElement: (id, recordHistory = true) => {
      set((state) => ({
        elements: state.elements.filter((e) => e.id !== id),
        selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
      }))
      if (recordHistory) get()._pushHistory()
    },

    setSelectedElementId: (id) => set({ selectedElementId: id }),

    applyColorScheme: (scheme) => {
      const colors = scheme.colors
      set((state) => ({
        elements: state.elements.map((e) => ({
          ...e,
          color: e.type === 'text' ? colors[0] : e.color,
          fill: e.type === 'shape' ? colors[1] || colors[0] : e.fill,
        })),
      }))
      get()._pushHistory()
    },

    updateCanvasState: (updates, recordHistory = false) => {
      set((state) => ({
        canvasState: { ...state.canvasState, ...updates },
      }))
      if (recordHistory) get()._pushHistory()
    },

    addBrandAsset: (asset) => {
      set((state) => {
        const newAssets = [...state.brandAssets, asset]
        saveToStorage(STORAGE_KEYS.brandAssets, newAssets)
        return { brandAssets: newAssets }
      })
    },

    removeBrandAsset: (id) => {
      set((state) => {
        const newAssets = state.brandAssets.filter((a) => a.id !== id)
        saveToStorage(STORAGE_KEYS.brandAssets, newAssets)
        return { brandAssets: newAssets }
      })
    },

    addUploadedMaterial: (material) => {
      set((state) => {
        const newMaterials = [...state.materials, material]
        const uploadedOnly = newMaterials.filter(m => m.isUploaded)
        saveToStorage(STORAGE_KEYS.materials, uploadedOnly)
        return { materials: newMaterials }
      })
    },

    importOrderItems: (items) => set({ orderItems: items }),

    saveVersion: (name, note) => {
      const { elements } = get()
      const newVersion: DesignVersion = {
        id: `v-${Date.now()}`,
        version: versionCounter++,
        name,
        thumbnail: '',
        createdAt: new Date().toISOString(),
        elements: elements.map(e => ({ ...e })),
        note,
      }
      set((state) => {
        const newVersions = [newVersion, ...state.versions]
        saveToStorage(STORAGE_KEYS.versions, newVersions)
        return { versions: newVersions }
      })
    },

    restoreVersion: (versionId) => {
      const version = get().versions.find(v => v.id === versionId)
      if (version) {
        set({ elements: version.elements.map(e => ({ ...e })) })
        get()._pushHistory()
      }
    },

    setExportConfig: (updates) => {
      set((state) => {
        const newConfig = { ...state.exportConfig, ...updates }
        saveToStorage(STORAGE_KEYS.exportConfig, newConfig)
        return { exportConfig: newConfig }
      })
    },

    setPrintNotes: (notes) => {
      saveToStorage(STORAGE_KEYS.printNotes, notes)
      set({ printNotes: notes })
    },

    batchReplace: (field, values) => {
      const fieldMap: Record<string, string> = {
        customerName: '{{name}}',
        orderNo: '{{orderNo}}',
      }
      const placeholder = fieldMap[field] || `{{${field}}}`
      set((state) => ({
        elements: state.elements.map((e) => {
          if (e.type === 'text' && e.content?.includes(placeholder)) {
            return { ...e, content: e.content }
          }
          return e
        }),
      }))
    },
  }
})

export function replacePlaceholders(elements: CanvasElement[], order: OrderItem): CanvasElement[] {
  return elements.map(e => {
    if (e.type === 'text' && e.content) {
      let newContent = e.content
        .replace(/\{\{name\}\}/g, order.customerName)
        .replace(/\{\{orderNo\}\}/g, order.orderNo)
        .replace(/\{\{productName\}\}/g, order.productName)
      if (order.customFields) {
        Object.entries(order.customFields).forEach(([k, v]) => {
          newContent = newContent.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v)
        })
      }
      return { ...e, content: newContent }
    }
    if (e.type === 'barcode' && e.barcodeValue) {
      let newValue = e.barcodeValue
        .replace(/\{\{orderNo\}\}/g, order.orderNo)
      return { ...e, barcodeValue: newValue }
    }
    return { ...e }
  })
}
