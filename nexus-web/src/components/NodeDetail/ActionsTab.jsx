import { useAuth } from '@clerk/clerk-react'
import { useSaveNode, useFollowTopic } from '../../api/hooks/useUser'
import { useGraphStore } from '../../store/graphStore'
import { useNode } from '../../api/hooks/useNode'

export default function ActionsTab() {
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId)
  const { data } = useNode(selectedNodeId)
  const { isSignedIn } = useAuth()
  const saveNode = useSaveNode()
  const followTopic = useFollowTopic()

  if (!isSignedIn) {
    return <p className="text-gray-600">Login to save and follow</p>
  }

  const handleSave = () => {
    saveNode.mutate(selectedNodeId)
  }

  const handleFollowTag = (tag) => {
    followTopic.mutate(tag)
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleSave}
        disabled={saveNode.isPending}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saveNode.isPending ? 'Saving...' : 'Save Node'}
      </button>

      {data?.node?.tags && data.node.tags.length > 0 && (
        <div>
          <div className="text-sm font-semibold mb-2">Follow Tags</div>
          <div className="flex flex-wrap gap-2">
            {data.node.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleFollowTag(tag)}
                disabled={followTopic.isPending}
                className="px-3 py-1 bg-gray-200 hover:bg-blue-200 rounded text-sm disabled:opacity-50"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
