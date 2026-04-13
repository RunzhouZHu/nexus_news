import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Graph layout store: manages node positions with localStorage persistence.
 *
 * Two-state system:
 * - isLayoutManual = false: Use grid layout (default)
 * - isLayoutManual = true: Use user-dragged positions
 */
export const useGraphLayoutStore = create(
  persist(
    (set, get) => ({
      // { nodeId: { x, y }, ... }
      nodePositions: {},

      // true if user has dragged any node, false if using default grid
      isLayoutManual: false,

      /**
       * Update node positions (called during drag)
       * Merges with existing positions, so partial updates work
       */
      setNodePositions: (newPositions) => {
        set((state) => ({
          nodePositions: {
            ...state.nodePositions,
            ...newPositions,
          },
          isLayoutManual: true, // Enable manual layout on first drag
        }))
      },

      /**
       * Reset to grid layout (called by reset button)
       * Clears positions and disables manual layout
       */
      resetToGridLayout: () => {
        set({
          nodePositions: {},
          isLayoutManual: false,
        })
      },
    }),
    {
      name: 'nexus-layout', // localStorage key
      version: 1,
    }
  )
)
