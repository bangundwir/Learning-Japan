import React, { useState, useEffect } from 'react'
import styles from '../styles/Flashcard.module.css'

interface TestModeProps {
  cards: { kana: string; roumaji: string; type: string }[]
  onFinish: (score: number) => void
  darkMode: boolean
  updateProgress: (progress: number) => void
}

export default function TestMode({ cards, onFinish, darkMode, updateProgress }: TestModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [shuffledCards, setShuffledCards] = useState(cards)

  useEffect(() => {
    setShuffledCards([...cards].sort(() => Math.random() - 0.5).slice(0, 10))
  }, [cards])

  useEffect(() => {
    updateProgress((currentIndex / shuffledCards.length) * 100)
  }, [currentIndex, shuffledCards.length, updateProgress])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const isCorrect = userAnswer.toLowerCase().trim() === shuffledCards[currentIndex].roumaji.toLowerCase()
    if (isCorrect) setScore(score + 1)
    setShowResult(true)
  }

  const nextQuestion = () => {
    if (currentIndex < shuffledCards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setUserAnswer('')
      setShowResult(false)
    } else {
      onFinish(score)
    }
  }

  return (
    <div className="flex flex-col items-center w-full max-w-md">
      <div className={`${styles.flashcard} ${styles.testMode} shadow-lg rounded-lg mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`text-8xl md:text-9xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{shuffledCards[currentIndex].kana}</div>
      </div>
      <form onSubmit={handleSubmit} className="w-full">
        <input
          type="text"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          className={`w-full px-4 py-3 rounded-lg border-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:border-blue-500 text-xl`}
          placeholder="Enter romaji"
          disabled={showResult}
          autoFocus
        />
        {!showResult && (
          <button type="submit" className={`w-full mt-4 px-6 py-3 ${darkMode ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition-colors text-xl font-semibold`}>
            Submit
          </button>
        )}
      </form>
      {showResult && (
        <div className="mt-6 text-center w-full">
          <p className={`text-2xl font-bold ${userAnswer.toLowerCase().trim() === shuffledCards[currentIndex].roumaji.toLowerCase() ? 'text-green-500' : 'text-red-500'}`}>
            {userAnswer.toLowerCase().trim() === shuffledCards[currentIndex].roumaji.toLowerCase() ? 'Correct!' : 'Incorrect!'}
          </p>
          <p className={`text-xl mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Your answer: <span className="font-semibold">{userAnswer}</span>
          </p>
          <p className={`text-xl mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Correct answer: <span className="font-semibold">{shuffledCards[currentIndex].roumaji}</span>
          </p>
          <button onClick={nextQuestion} className={`mt-6 px-6 py-3 ${darkMode ? 'bg-green-700 hover:bg-green-800' : 'bg-green-500 hover:bg-green-600'} text-white rounded-lg transition-colors text-xl font-semibold w-full`}>
            {currentIndex < shuffledCards.length - 1 ? 'Next Question' : 'Finish Test'}
          </button>
        </div>
      )}
      <div className={`mt-6 text-xl font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        Question {currentIndex + 1} of {shuffledCards.length} | Score: {score}
      </div>
    </div>
  )
}