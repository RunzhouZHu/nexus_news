import { useState } from 'react'

export default function Tabs({ tabs }) {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex border-b">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === index
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {tabs[activeTab]?.content}
      </div>
    </div>
  )
}
