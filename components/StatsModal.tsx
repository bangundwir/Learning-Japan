import React from 'react'
import GithubStyleProgress from './GithubStyleProgress'
import { motion, AnimatePresence } from 'framer-motion'

interface StatsModalProps {
  isOpen: boolean
  onClose: () => void
  progress: number
  dailyProgress: number[]
  darkMode: boolean
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, progress, dailyProgress, darkMode }) => {
  const totalReviews = dailyProgress.reduce((sum, day) => sum + day, 0)
  const averageReviews = totalReviews / dailyProgress.length
  const streakDays = dailyProgress.reverse().findIndex(day => day === 0)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} p-6 rounded-lg shadow-xl max-w-lg w-full`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-3xl font-bold mb-6 text-center">Your Progress Stats</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Overall Progress</h3>
                <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1 }}
                    className="bg-blue-600 h-4 rounded-full"
                  />
                </div>
                <p className="mt-2 text-center font-bold">{progress.toFixed(1)}% Complete</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-center">
                    <p className="text-sm">Total Reviews</p>
                    <p className="text-2xl font-bold">{totalReviews}</p>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-center">
                    <p className="text-sm">Avg Reviews/Day</p>
                    <p className="text-2xl font-bold">{averageReviews.toFixed(1)}</p>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-center col-span-2">
                    <p className="text-sm">Current Streak</p>
                    <p className="text-2xl font-bold">{streakDays} days</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Daily Activity</h3>
                <GithubStyleProgress progress={dailyProgress} darkMode={darkMode} />
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className={`w-full mt-6 px-4 py-3 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition-colors text-lg font-semibold`}
            >
              Close
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default StatsModal