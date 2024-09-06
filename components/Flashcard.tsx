import styles from '../styles/Flashcard.module.css'

interface FlashcardProps {
  kana: string
  roumaji: string
  type: string
  darkMode: boolean
  showAnswer: boolean
}

export default function Flashcard({ kana, roumaji, type, darkMode, showAnswer }: FlashcardProps) {
  const getTypeColor = () => {
    // ... (keep existing getTypeColor function)
  }

  return (
    <div
      className={`${styles.flashcard} ${showAnswer ? styles.flipped : ''} ${getTypeColor()} shadow-lg rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105`}
    >
      <div className={`${styles.front} flex items-center justify-center text-7xl md:text-9xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{kana}</div>
      <div className={`${styles.back} flex flex-col items-center justify-center ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
        <div className="text-5xl md:text-7xl font-bold mb-2 md:mb-4">{roumaji}</div>
        <div className="text-lg md:text-2xl uppercase font-semibold">{type}</div>
      </div>
    </div>
  )
}
