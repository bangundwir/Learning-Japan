import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface MemoryGameProps {
  cards: { kana: string; roumaji: string; type: string }[]
  darkMode: boolean
  updateProgress: (progress: number) => void
}

interface MemoryCard {
  id: number
  content: string
  isFlipped: boolean
  isMatched: boolean
}

export default function MemoryGame({ cards, darkMode, updateProgress }: MemoryGameProps) {
  const [gameCards, setGameCards] = useState<MemoryCard[]>([])
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [matchedPairs, setMatchedPairs] = useState(0)

  useEffect(() => {
    const shuffledCards = [...cards].sort(() => Math.random() - 0.5).slice(0, 8)
    const memoryCards = shuffledCards.flatMap((card, index) => [
      { id: index * 2, content: card.kana, isFlipped: false, isMatched: false },
      { id: index * 2 + 1, content: card.roumaji, isFlipped: false, isMatched: false }
    ]).sort(() => Math.random() - 0.5)
    setGameCards(memoryCards)
  }, [cards])

  useEffect(() => {
    updateProgress((matchedPairs / 8) * 100)
  }, [matchedPairs, updateProgress])

  const handleCardClick = (id: number) => {
    if (flippedCards.length === 2) return
    const newGameCards = gameCards.map(card =>
      card.id === id ? { ...card, isFlipped: true } : card
    )
    setGameCards(newGameCards)
    setFlippedCards([...flippedCards, id])

    if (flippedCards.length === 1) {
      const firstCard = gameCards.find(card => card.id === flippedCards[0])
      const secondCard = gameCards.find(card => card.id === id)
      if (firstCard && secondCard) {
        if (
          (cards.find(c => c.kana === firstCard.content)?.roumaji === secondCard.content) ||
          (cards.find(c => c.kana === secondCard.content)?.roumaji === firstCard.content)
        ) {
          setMatchedPairs(matchedPairs + 1)
          setGameCards(gameCards.map(card =>
            card.id === firstCard.id || card.id === secondCard.id
              ? { ...card, isMatched: true }
              : card
          ))
        } else {
          setTimeout(() => {
            setGameCards(gameCards.map(card =>
              card.id === firstCard.id || card.id === secondCard.id
                ? { ...card, isFlipped: false }
                : card
            ))
          }, 1000)
        }
        setFlippedCards([])
      }
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {gameCards.map(card => (
          <motion.div
            key={card.id}
            className={`aspect-w-3 aspect-h-4 ${darkMode ? 'bg-gray-700' : 'bg-white'} rounded-lg shadow-md cursor-pointer`}
            onClick={() => !card.isFlipped && !card.isMatched && handleCardClick(card.id)}
            animate={{ rotateY: card.isFlipped || card.isMatched ? 180 : 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center text-2xl sm:text-3xl font-bold">
              <motion.div
                animate={{ rotateY: card.isFlipped || card.isMatched ? 180 : 0 }}
                transition={{ duration: 0.6 }}
                style={{ backfaceVisibility: 'hidden' }}
                className={darkMode ? 'text-white' : 'text-gray-800'}
              >
                {card.isFlipped || card.isMatched ? '' : '?'}
              </motion.div>
              <motion.div
                animate={{ rotateY: card.isFlipped || card.isMatched ? 0 : -180 }}
                transition={{ duration: 0.6 }}
                style={{ backfaceVisibility: 'hidden', position: 'absolute' }}
                className={darkMode ? 'text-white' : 'text-gray-800'}
              >
                {card.content}
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className={`mt-6 text-xl sm:text-2xl font-bold text-center ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
        Matched Pairs: {matchedPairs} / 8
      </div>
    </div>
  )
}