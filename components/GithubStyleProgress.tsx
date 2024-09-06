import React from 'react'

interface GithubStyleProgressProps {
  progress: number[]
  darkMode: boolean
}

const GithubStyleProgress: React.FC<GithubStyleProgressProps> = ({ progress, darkMode }) => {
  const getColor = (value: number) => {
    if (value === 0) return darkMode ? 'bg-gray-800' : 'bg-gray-200'
    if (value < 2) return 'bg-green-200'
    if (value < 4) return 'bg-green-400'
    if (value < 6) return 'bg-green-600'
    return 'bg-green-800'
  }

  return (
    <div className="w-full max-w-4xl mb-8">
      <div className="grid grid-cols-7 gap-1">
        {progress.map((value, index) => (
          <div
            key={index}
            className={`w-full aspect-square rounded-sm ${getColor(value)}`}
            title={`Day ${index + 1}: ${value} reviews`}
          ></div>
        ))}
      </div>
      <div className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Less
        <span className="mx-1 inline-block w-3 h-3 bg-green-200"></span>
        <span className="mx-1 inline-block w-3 h-3 bg-green-400"></span>
        <span className="mx-1 inline-block w-3 h-3 bg-green-600"></span>
        <span className="mx-1 inline-block w-3 h-3 bg-green-800"></span>
        More
      </div>
    </div>
  )
}

export default GithubStyleProgress