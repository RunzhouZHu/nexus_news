import { create } from 'zustand'

export const useFilterStore = create((set) => ({
  searchQuery: '',
  activeTags: [],
  viewMode: 'graph',

  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleTag: (tag) => set((state) => ({
    activeTags: state.activeTags.includes(tag)
      ? state.activeTags.filter(t => t !== tag)
      : [...state.activeTags, tag]
  })),
  clearTags: () => set({ activeTags: [] }),
  setViewMode: (mode) => set({ viewMode: mode }),
}))
