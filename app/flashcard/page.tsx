'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import FlashcardDeck from '../../components/FlashcardDeck'
import CharacterGrid from '../../components/CharacterGrid'
import TestMode from '../../components/TestMode'
import hiraganaData from '../../data/hiragana.json'
import katakanaData from '../../data/katakana.json'
import WritingPractice from '../../components/WritingPractice'
import MemoryGame from '../../components/MemoryGame'
import StatsModal from '../../components/StatsModal'
import AILearningMode from '../../components/AILearningMode'
import { FaSignOutAlt } from 'react-icons/fa'

export default function FlashcardPage() {
  const [deck, setDeck] = useState('hiragana')
  const [cards, setCards] = useState(hiraganaData)
  const [mode, setMode] = useState('flashcard')
  const [_, setTestScore] = useState(0) // Ganti testScore menjadi _ jika tidak digunakan
  const [darkMode, setDarkMode] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dailyProgress, setDailyProgress] = useState<number[]>(Array(28).fill(0))
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setCards(deck === 'hiragana' ? hiraganaData : katakanaData)
  }, [deck])

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('aiTutorToken');
      const rememberLogin = localStorage.getItem('rememberLogin');
      if (token && rememberLogin === 'true') {
        try {
          const response = await fetch('/api/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            setIsLoggedIn(true);
          } else {
            localStorage.removeItem('aiTutorToken');
            localStorage.removeItem('rememberLogin');
          }
        } catch (error) {
          console.error('Error verifying token:', error);
          localStorage.removeItem('aiTutorToken');
          localStorage.removeItem('rememberLogin');
        }
      }
    };
    checkAuth();
  }, [])

  const handleTestFinish = (score: number) => {
    setTestScore(score)
    setMode('flashcard')
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  const updateProgress = (newProgress: number) => {
    setProgress(newProgress)
    setDailyProgress(prev => {
      const newDailyProgress = [...prev]
      newDailyProgress[newDailyProgress.length - 1] += 1
      return newDailyProgress
    })
  }

  useEffect(() => {
    const token = localStorage.getItem('aiTutorToken');
    const rememberMe = localStorage.getItem('aiTutorRememberMe') === 'true';
    if (token && rememberMe) {
      verifyToken(token);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem('aiTutorToken');
        localStorage.removeItem('aiTutorRememberMe');
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      localStorage.removeItem('aiTutorToken');
      localStorage.removeItem('aiTutorRememberMe');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('aiTutorToken');
    localStorage.removeItem('aiTutorRememberMe');
    setIsLoggedIn(false);
  };

  return (
    <div className={`flex flex-col min-h-screen p-4 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'} transition-all duration-300`}>
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
          {mode === 'test' ? 'Test Mode' : `${deck === 'hiragana' ? 'Hiragana' : 'Katakana'} Flashcards`}
        </h1>
        <div className="flex space-x-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsStatsModalOpen(true)}
            className="p-2 rounded-full bg-blue-500 text-white shadow-md"
          >
            📊
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-md"
          >
            {darkMode ? '🌞' : '🌙'}
          </motion.button>
          {isLoggedIn && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleLogout}
              className="p-2 rounded-full bg-red-500 text-white shadow-md"
            >
              <FaSignOutAlt className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
          )}
        </div>
      </header>

      <nav className="mb-8">
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {['grid', 'flashcard', 'test', 'writing', 'memory', 'ai'].map((m) => (
            <motion.button
              key={m}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-full transition-all duration-200 text-sm md:text-base font-semibold shadow-md
                ${mode === m
                  ? 'bg-green-600 text-white dark:bg-green-500'
                  : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            >
              {m === 'ai' ? 'AI Tutor' : m.charAt(0).toUpperCase() + m.slice(1)}
            </motion.button>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {['hiragana', 'katakana'].map((d) => (
            <motion.button
              key={d}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDeck(d)}
              className={`px-4 py-2 rounded-full transition-all duration-200 text-sm md:text-base font-semibold shadow-md
                ${deck === d 
                  ? 'bg-blue-600 text-white dark:bg-blue-500' 
                  : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </motion.button>
          ))}
        </div>
      </nav>

      <main className="flex-grow flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl">
          {mode === 'grid' && <CharacterGrid characters={cards} darkMode={darkMode} />}
          {mode === 'flashcard' && <FlashcardDeck cards={cards} deck={deck} setDeck={setDeck} darkMode={darkMode} updateProgress={updateProgress} />}
          {mode === 'test' && <TestMode cards={cards} onFinish={handleTestFinish} darkMode={darkMode} updateProgress={updateProgress} />}
          {mode === 'writing' && <WritingPractice cards={cards} darkMode={darkMode} updateProgress={updateProgress} />}
          {mode === 'memory' && <MemoryGame cards={cards} darkMode={darkMode} updateProgress={updateProgress} />}
          {mode === 'ai' && (
            <AILearningMode
              darkMode={darkMode}
              updateProgress={updateProgress}
            />
          )}
        </div>
      </main>

      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        progress={progress}
        dailyProgress={dailyProgress}
        darkMode={darkMode}
      />
    </div>
  )
}
