import React from 'react'

interface ProgressBarProps {
  progress: number
  darkMode: boolean
}

export default function ProgressBar({ progress, darkMode }: ProgressBarProps) {
  return (
    <div className="w-full max-w-4xl mb-8">
      <div className={`w-full h-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded-full overflow-hidden`}>
        <div
          className={`h-full ${darkMode ? 'bg-green-600' : 'bg-green-500'} transition-all duration-300 ease-out`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className={`text-center mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        Progress: {progress.toFixed(1)}%
      </p>
    </div>
  )
}