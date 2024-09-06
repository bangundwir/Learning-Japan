import { useState, useEffect } from 'react'
import Flashcard from './Flashcard'
import { motion, AnimatePresence } from 'framer-motion'

interface FlashcardDeckProps {
  cards: { kana: string; roumaji: string; type: string }[]
  deck: string
  setDeck: (deck: string) => void
  darkMode: boolean
  updateProgress: (progress: number) => void
}

interface SRSCard {
  kana: string
  roumaji: string
  type: string
  interval: number
  nextReview: number
}

export default function FlashcardDeck({ cards, deck, setDeck, darkMode, updateProgress }: FlashcardDeckProps) {
  const [srsCards, setSRSCards] = useState<SRSCard[]>([])
  const [currentCard, setCurrentCard] = useState<SRSCard | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)

  useEffect(() => {
    const initialSRSCards = cards.map(card => ({
      ...card,
      interval: 0,
      nextReview: Date.now()
    }))
    setSRSCards(initialSRSCards)
  }, [cards])

  useEffect(() => {
    const nextCard = srsCards.find(card => card.nextReview <= Date.now())
    setCurrentCard(nextCard || null)
  }, [srsCards])

  useEffect(() => {
    const totalProgress = srsCards.reduce((sum, card) => sum + Math.min(card.interval, 5), 0)
    const maxProgress = srsCards.length * 5
    updateProgress((totalProgress / maxProgress) * 100)
  }, [srsCards, updateProgress])

  const handleKnown = () => {
    if (currentCard) {
      const newInterval = currentCard.interval === 0 ? 1 : currentCard.interval * 2
      const updatedCard = {
        ...currentCard,
        interval: newInterval,
        nextReview: Date.now() + newInterval * 24 * 60 * 60 * 1000
      }
      setSRSCards(srsCards.map(card => card.kana === currentCard.kana ? updatedCard : card))
    }
    setShowAnswer(false)
  }

  const handleUnknown = () => {
    if (currentCard) {
      const updatedCard = {
        ...currentCard,
        interval: 0,
        nextReview: Date.now()
      }
      setSRSCards(srsCards.map(card => card.kana === currentCard.kana ? updatedCard : card))
    }
    setShowAnswer(false)
  }

  if (!currentCard) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`text-2xl font-bold text-center ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}
      >
        No more cards to review. Come back later!
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentCard.kana}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          <Flashcard {...currentCard} darkMode={darkMode} showAnswer={showAnswer} />
        </motion.div>
      </AnimatePresence>
      <div className="mt-6 w-full flex flex-col space-y-2">
        {!showAnswer ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAnswer(true)}
            className={`w-full px-4 py-3 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition-colors text-lg font-semibold shadow-md`}
          >
            Show Answer
          </motion.button>
        ) : (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleKnown}
              className={`w-full px-4 py-3 ${darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} text-white rounded-lg transition-colors text-lg font-semibold shadow-md`}
            >
              Known
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleUnknown}
              className={`w-full px-4 py-3 ${darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white rounded-lg transition-colors text-lg font-semibold shadow-md`}
            >
              Unknown
            </motion.button>
          </>
        )}
      </div>
    </div>
  )
}
