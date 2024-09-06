import React, { useState, useRef, useEffect } from 'react'

interface WritingPracticeProps {
  cards: { kana: string; roumaji: string; type: string }[]
  darkMode: boolean
  updateProgress: (progress: number) => void
}

export default function WritingPractice({ cards, darkMode, updateProgress }: WritingPracticeProps) {
  const [currentCard, setCurrentCard] = useState(cards[0])
  const [userInput, setUserInput] = useState('')
  const [feedback, setFeedback] = useState('')
  const [correctCount, setCorrectCount] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.strokeStyle = darkMode ? 'white' : 'black'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
      }
    }
  }, [darkMode])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (userInput.toLowerCase() === currentCard.roumaji.toLowerCase()) {
      setFeedback('Correct!')
      setCorrectCount(correctCount + 1)
    } else {
      setFeedback(`Incorrect. The correct answer is ${currentCard.roumaji}.`)
    }
    updateProgress((correctCount / cards.length) * 100)
  }

  const nextCard = () => {
    const nextIndex = (cards.indexOf(currentCard) + 1) % cards.length
    setCurrentCard(cards[nextIndex])
    setUserInput('')
    setFeedback('')
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.beginPath()
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
      }
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx && e.buttons === 1) {
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        ctx.stroke()
      }
    }
  }

  return (
    <div className="flex flex-col items-center w-full max-w-md">
      <div className={`text-8xl md:text-9xl font-bold mb-6 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
        {currentCard.kana}
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className={`border-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'} rounded-lg mb-6`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
      />
      <form onSubmit={handleSubmit} className="w-full">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          className={`w-full px-4 py-3 rounded-lg border-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:border-blue-500 text-xl`}
          placeholder="Enter romaji"
          autoFocus
        />
        <button type="submit" className={`w-full mt-4 px-6 py-3 ${darkMode ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition-colors text-xl font-semibold`}>
          Check
        </button>
      </form>
      {feedback && (
        <div className={`mt-4 text-xl font-semibold ${feedback.startsWith('Correct') ? 'text-green-500' : 'text-red-500'}`}>
          {feedback}
        </div>
      )}
      <button onClick={nextCard} className={`mt-6 px-6 py-3 ${darkMode ? 'bg-green-700 hover:bg-green-800' : 'bg-green-500 hover:bg-green-600'} text-white rounded-lg transition-colors text-xl font-semibold`}>
        Next Character
      </button>
    </div>
  )
}