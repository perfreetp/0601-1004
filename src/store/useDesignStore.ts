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
} from '@/types'
import { mockTemplates, mockColorSchemes, mockMaterials, mockBrandAssets, mockVersions } from '@/data/mockData'

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

  setSelectedTemplate: (template: Template | null) => void
  toggleFavoriteTemplate: (id: string) => void
  addElement: (element: CanvasElement) => void
  updateElement: (id: string, updates: Partial<CanvasElement>) => void
  removeElement: (id: string) => void
  setSelectedElementId: (id: string | null) => void
  applyColorScheme: (scheme: ColorScheme) => void
  updateCanvasState: (updates: Partial<CanvasState>) => void
  addBrandAsset: (asset: BrandAsset) => void
  removeBrandAsset: (id: string) => void
  importOrderItems: (items: OrderItem[]) => void
  saveVersion: (name: string, note?: string) => void
  restoreVersion: (versionId: string) => void
  setExportConfig: (updates: Partial<ExportConfig>) => void
  setPrintNotes: (notes: string) => void
  batchReplace: (field: 'customerName' | 'orderNo' | string, values: Record<string, string>) => void
}

let versionCounter = 1

export const useDesignStore = create<DesignStore>((set, get) => ({
  templates: mockTemplates,
  selectedTemplate: null,
  colorSchemes: mockColorSchemes,
  materials: mockMaterials,
  brandAssets: mockBrandAssets,
  orderItems: [],
  versions: mockVersions,
  canvasState: {
    width: 600,
    height: 400,
    zoom: 1,
    showBleed: true,
    bleedSize: 3,
    showGrid: false,
    gridSize: 10,
    backgroundColor: '#ffffff',
  },
  elements: [],
  selectedElementId: null,
  exportConfig: {
    format: 'png',
    dpi: 300,
    quality: 90,
    bleed: 3,
    colorMode: 'rgb',
    imposition: false,
    impositionRows: 2,
    impositionCols: 3,
  },
  printNotes: '',

  setSelectedTemplate: (template) => {
    if (template) {
      set({
        selectedTemplate: template,
        elements: template.elements.map(e => ({ ...e })),
        canvasState: {
          ...get().canvasState,
          width: template.width,
          height: template.height,
        },
      })
    } else {
      set({ selectedTemplate: null, elements: [] })
    }
  },

  toggleFavoriteTemplate: (id) =>
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === id ? { ...t, isFavorite: !t.isFavorite } : t
      ),
    })),

  addElement: (element) =>
    set((state) => ({
      elements: [...state.elements, element],
      selectedElementId: element.id,
    })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),

  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((e) => e.id !== id),
      selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
    })),

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
  },

  updateCanvasState: (updates) =>
    set((state) => ({
      canvasState: { ...state.canvasState, ...updates },
    })),

  addBrandAsset: (asset) =>
    set((state) => ({
      brandAssets: [...state.brandAssets, asset],
    })),

  removeBrandAsset: (id) =>
    set((state) => ({
      brandAssets: state.brandAssets.filter((a) => a.id !== id),
    })),

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
    set((state) => ({
      versions: [newVersion, ...state.versions],
    }))
  },

  restoreVersion: (versionId) => {
    const version = get().versions.find(v => v.id === versionId)
    if (version) {
      set({ elements: version.elements.map(e => ({ ...e })) })
    }
  },

  setExportConfig: (updates) =>
    set((state) => ({
      exportConfig: { ...state.exportConfig, ...updates },
    })),

  setPrintNotes: (notes) => set({ printNotes: notes }),

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
}))
