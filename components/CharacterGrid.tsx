import React from 'react'

interface CharacterGridProps {
  characters: { kana: string; roumaji: string; type: string }[]
  darkMode: boolean
}

export default function CharacterGrid({ characters, darkMode }: CharacterGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-5 w-full max-w-4xl mx-auto">
      {characters.map((char, index) => (
        <div key={index} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-3 md:p-5 rounded-lg shadow-md text-center transform hover:scale-105 transition-all duration-200 hover:shadow-lg`}>
          <div className={`text-3xl md:text-5xl font-bold mb-1 md:mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{char.kana}</div>
          <div className={`text-lg md:text-2xl font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{char.roumaji}</div>
          <div className={`text-sm md:text-base ${darkMode ? 'text-gray-400' : 'text-gray-500'} font-medium`}>{char.type}</div>
        </div>
      ))}
    </div>
  )
}