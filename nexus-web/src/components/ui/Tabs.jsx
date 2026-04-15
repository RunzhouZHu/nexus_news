import { useState } from 'react'

export default function Tabs({ tabs, dark = false }) {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div>
      {/* Tab buttons */}
      <div className={`flex ${dark ? 'border-b border-white/10' : 'border-b'}`}>
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === index
                ? dark
                  ? 'border-b-2 border-sky-400 text-sky-400'
                  : 'border-b-2 border-blue-600 text-blue-600'
                : dark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4 px-4 pb-4">
        {tabs[activeTab]?.content}
      </div>
    </div>
  )
}
