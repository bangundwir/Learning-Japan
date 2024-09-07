import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import OpenAI from 'openai'

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  userAnswer?: string;
}

interface TestResult {
  id: string;
  date: string;
  score: number;
  totalQuestions: number;
  topic: string;
  level: string;
  questions: Question[];
}

type Topic = 'hiragana' | 'katakana' | 'kanji' | 'kotoba' | 'bunpo' | 'dokkai';
type Level = 'Sangat Pemula' | 'Pemula' | 'Dasar' | 'Menengah' | 'Lanjutan' | 'Mahir';

export default function AIJapaneseTest({ darkMode, updateProgress }: { darkMode: boolean; updateProgress: (progress: number) => void }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isTestComplete, setIsTestComplete] = useState(false)
  const [testHistory, setTestHistory] = useState<TestResult[]>([])
  const [selectedTopic, setSelectedTopic] = useState<Topic>('hiragana')
  const [selectedLevel, setSelectedLevel] = useState<Level>('Sangat Pemula')
  const [questionCount, setQuestionCount] = useState<number>(5)
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)
  const [showTestHistory, setShowTestHistory] = useState(false)

  useEffect(() => {
    loadTestHistory()
  }, [])

  const loadTestHistory = () => {
    const savedHistory = localStorage.getItem('aiJapaneseTestHistory')
    if (savedHistory) {
      setTestHistory(JSON.parse(savedHistory))
    }
  }

  const generateQuestions = async () => {
    setIsLoading(true)
    try {
      const openai = new OpenAI({
        apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
        dangerouslyAllowBrowser: true,
        defaultHeaders: {
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL,
          "X-Title": process.env.NEXT_PUBLIC_SITE_NAME,
        }
      })

      const topicPrompts = {
        hiragana: "Fokus pada pengenalan dan penulisan karakter hiragana. Sertakan contoh kata sederhana.",
        katakana: "Fokus pada pengenalan dan penulisan karakter katakana. Sertakan contoh kata serapan sederhana.",
        kanji: "Sertakan kanji dasar dengan informasi tentang arti dan cara baca. Sesuaikan tingkat kesulitan dengan level yang dipilih.",
        kotoba: "Fokus pada kosakata sehari-hari yang sangat dasar. Pilih kata-kata yang sesuai dengan level yang dipilih.",
        bunpo: "Jelaskan aturan tata bahasa dasar dan berikan contoh kalimat sederhana. Pilih pola kalimat yang sesuai dengan level yang dipilih.",
        dokkai: "Sertakan teks sangat pendek dan sederhana dalam bahasa Jepang diikuti dengan pertanyaan pemahaman dasar. Sesuaikan panjang dan kompleksitas teks dengan level yang dipilih."
      }

      const response = await openai.chat.completions.create({
        model: "google/gemini-flash-1.5",
        messages: [
          { role: "system", content: `Anda adalah pembuat tes bahasa Jepang yang ahli. Buatlah ${questionCount} pertanyaan pilihan ganda tentang ${selectedTopic} bahasa Jepang untuk level ${selectedLevel}. ${topicPrompts[selectedTopic]} Setiap pertanyaan harus memiliki 4 pilihan jawaban dan penjelasan detail dalam bahasa Indonesia. Pastikan pertanyaan sangat sederhana dan sesuai untuk pemula absolut. Berikan output dalam format JSON yang valid.` },
          { role: "user", content: `Buat ${questionCount} pertanyaan pilihan ganda tes bahasa Jepang tentang ${selectedTopic} untuk level ${selectedLevel}. Sertakan penjelasan detail dalam bahasa Indonesia untuk setiap pertanyaan. Kembalikan hasilnya sebagai array JSON dari objek pertanyaan, di mana setiap objek memiliki properti 'text' (teks pertanyaan dalam bahasa Indonesia), 'options' (array pilihan jawaban), 'correctAnswer' (jawaban yang benar), dan 'explanation' (penjelasan dalam bahasa Indonesia). Pastikan format JSON valid dan dapat di-parse.` }
        ],
      })

      const content = response.choices?.[0]?.message?.content

      if (!content) {
        throw new Error('Tidak ada konten yang dihasilkan dari API')
      }

      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
      const jsonString = jsonMatch ? jsonMatch[0] : ''

      let generatedQuestions: Question[]
      try {
        generatedQuestions = JSON.parse(jsonString)
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError)
        generatedQuestions = extractQuestionsManually(content)
      }

      if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
        throw new Error('Gagal menghasilkan pertanyaan yang valid')
      }

      setQuestions(generatedQuestions)
      setIsLoading(false)
      setCurrentQuestionIndex(0)
      setScore(0)
      setIsTestComplete(false)
      setShowCorrectAnswer(false)
    } catch (error) {
      console.error('Error generating questions:', error)
      setIsLoading(false)
      // Type-cast error to any or use type narrowing
      alert(`Terjadi kesalahan saat menghasilkan pertanyaan: ${(error as Error).message || 'Unknown error'}`)
    }
  }

  const extractQuestionsManually = (content: string): Question[] => {
    const questions: Question[] = []
    const questionBlocks = content.split(/\d+\./).filter(block => block.trim() !== '')

    questionBlocks.forEach((block, index) => {
      const lines = block.split('\n').filter(line => line.trim() !== '')
      if (lines.length >= 5) {
        const text = lines[0].trim()
        const options = lines.slice(1, 5).map(line => line.replace(/^[a-d]\)\s*/, '').trim())
        const correctAnswerLine = lines.find(line => line.toLowerCase().includes('correct answer'))
        const correctAnswer = correctAnswerLine 
          ? options[['a', 'b', 'c', 'd'].indexOf(correctAnswerLine.toLowerCase().charAt(correctAnswerLine.toLowerCase().indexOf('correct answer') + 15))]
          : options[0]
        const explanation = lines.find(line => line.toLowerCase().includes('explanation'))?.replace(/^explanation:\s*/i, '') || ''

        questions.push({
          id: index + 1,
          text,
          options,
          correctAnswer,
          explanation
        })
      }
    })

    return questions
  }

  const handleAnswerSelection = (answer: string) => {
    setSelectedAnswer(answer)
    setShowCorrectAnswer(true)
    const updatedQuestions = [...questions]
    updatedQuestions[currentQuestionIndex].userAnswer = answer
    setQuestions(updatedQuestions)
  }

  const handleNextQuestion = () => {
    if (selectedAnswer === questions[currentQuestionIndex].correctAnswer) {
      setScore(score + 1)
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(null)
      setShowCorrectAnswer(false)
    } else {
      setIsTestComplete(true)
      updateProgress(score * 2)
      saveTestResult()
    }
  }

  const saveTestResult = () => {
    const newResult: TestResult = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      score: score,
      totalQuestions: questions.length,
      topic: selectedTopic,
      level: selectedLevel,
      questions: questions
    }
    const updatedHistory = [...testHistory, newResult]
    setTestHistory(updatedHistory)
    localStorage.setItem('aiJapaneseTestHistory', JSON.stringify(updatedHistory))
  }

  const restartTest = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setScore(0)
    setIsTestComplete(false)
    setShowCorrectAnswer(false)
  }

  const startNewTest = () => {
    setQuestions([])
    setIsTestComplete(false)
  }

  const retryTest = (result: TestResult) => {
    setSelectedTopic(result.topic as Topic)
    setSelectedLevel(result.level as Level)
    setQuestionCount(result.totalQuestions)
    setQuestions(result.questions)
    restartTest()
  }

  const clearTestHistory = () => {
    setTestHistory([])
    localStorage.removeItem('aiJapaneseTestHistory')
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className={`w-12 h-12 border-t-2 border-b-2 ${darkMode ? 'border-white' : 'border-gray-800'} rounded-full`}
        />
      </div>
    )
  }

  if (isTestComplete) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        <h2 className="text-2xl font-bold mb-4">Tes Selesai!</h2>
        <p className="text-xl mb-4">Skor Anda: {score} / {questions.length}</p>
        <div className="w-full max-w-2xl mb-8">
          <h3 className="text-lg font-bold mb-2">Hasil Tes:</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2">No.</th>
                <th className="border p-2">Pertanyaan</th>
                <th className="border p-2">Jawaban Anda</th>
                <th className="border p-2">Jawaban Benar</th>
                <th className="border p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, index) => (
                <tr key={q.id}>
                  <td className="border p-2">{index + 1}</td>
                  <td className="border p-2">{q.text}</td>
                  <td className="border p-2">{q.userAnswer}</td>
                  <td className="border p-2">{q.correctAnswer}</td>
                  <td className={`border p-2 ${q.userAnswer === q.correctAnswer ? 'text-green-500' : 'text-red-500'}`}>
                    {q.userAnswer === q.correctAnswer ? 'Benar' : 'Salah'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-x-4 mb-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={restartTest}
            className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
          >
            Ulangi Tes
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startNewTest}
            className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} text-white`}
          >
            Tes Baru
          </motion.button>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowTestHistory(!showTestHistory)}
          className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'} text-white mb-4`}
        >
          {showTestHistory ? 'Sembunyikan Riwayat Tes' : 'Tampilkan Riwayat Tes'}
        </motion.button>
        {showTestHistory && (
          <div className="mt-4 max-h-60 overflow-y-auto w-full">
            <h3 className="text-xl font-bold mb-2">Riwayat Tes</h3>
            {testHistory.map((result) => (
              <div key={result.id} className="mb-2 p-2 border rounded">
                <p>{new Date(result.date).toLocaleDateString()}: {result.score}/{result.totalQuestions} ({result.topic} - {result.level})</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => retryTest(result)}
                  className={`px-2 py-1 rounded-lg ${darkMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-yellow-500 hover:bg-yellow-600'} text-white mt-1`}
                >
                  Ulangi Tes Ini
                </motion.button>
              </div>
            ))}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={clearTestHistory}
              className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white mt-4`}
            >
              Hapus Riwayat Tes
            </motion.button>
          </div>
        )}
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        <h2 className="text-2xl font-bold mb-4">Tes Bahasa Jepang</h2>
        <div className="mb-4 space-y-2">
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value as Topic)}
            className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-800'}`}
          >
            <option value="hiragana">Hiragana</option>
            <option value="katakana">Katakana</option>
            <option value="kanji">Kanji</option>
            <option value="kotoba">Kotoba (Kosakata)</option>
            <option value="bunpo">Bunpo (Tata Bahasa)</option>
            <option value="dokkai">Dokkai (Membaca)</option>
          </select>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as Level)}
            className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-800'}`}
          >
            <option value="Sangat Pemula">Sangat Pemula</option>
            <option value="Pemula">Pemula</option>
            <option value="Dasar">Dasar</option>
            <option value="Menengah">Menengah</option>
            <option value="Lanjutan">Lanjutan</option>
            <option value="Mahir">Mahir</option>
          </select>
          <select
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-800'}`}
          >
            <option value={5}>5 Pertanyaan</option>
            <option value={10}>10 Pertanyaan</option>
            <option value={15}>15 Pertanyaan</option>
            <option value={20}>20 Pertanyaan</option>
          </select>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={generateQuestions}
          className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
        >
          Buat Pertanyaan
        </motion.button>
        {testHistory.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowTestHistory(!showTestHistory)}
            className={`px-4 py-2 mt-4 rounded-lg ${darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'} text-white`}
          >
            Lihat Riwayat Tes
          </motion.button>
        )}
        {showTestHistory && (
          <div className="mt-4 max-h-60 overflow-y-auto w-full">
            <h3 className="text-xl font-bold mb-2">Riwayat Tes</h3>
            {testHistory.map((result) => (
              <div key={result.id} className="mb-2 p-2 border rounded">
                <p>{new Date(result.date).toLocaleDateString()}: {result.score}/{result.totalQuestions} ({result.topic} - {result.level})</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => retryTest(result)}
                  className={`px-2 py-1 rounded-lg ${darkMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-yellow-500 hover:bg-yellow-600'} text-white mt-1`}
                >
                  Ulangi Tes Ini
                </motion.button>
              </div>
            ))}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={clearTestHistory}
              className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white mt-4`}
            >
              Hapus Riwayat Tes
            </motion.button>
          </div>
        )}
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div className={`flex flex-col h-full p-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
      <h2 className="text-xl font-bold mb-4">Pertanyaan {currentQuestionIndex + 1} dari {questions.length}</h2>
      <p className="text-lg mb-4">{currentQuestion.text}</p>
      <div className="space-y-2 mb-4">
        {currentQuestion.options.map((option, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAnswerSelection(option)}
            className={`w-full px-4 py-2 rounded-lg ${
              selectedAnswer === option
                ? option === currentQuestion.correctAnswer
                  ? 'bg-green-500'
                  : 'bg-red-500'
                : darkMode
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-gray-200 hover:bg-gray-300'
            } ${showCorrectAnswer ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            disabled={showCorrectAnswer}
          >
            {option}
          </motion.button>
        ))}
      </div>
      {showCorrectAnswer && (
        <div className="mb-4">
          <p className="font-bold">Jawaban yang benar:</p>
          <p>{currentQuestion.correctAnswer}</p>
          <p className="mt-2">Penjelasan: {currentQuestion.explanation}</p>
        </div>
      )}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleNextQuestion}
        className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white ${showCorrectAnswer ? '' : 'opacity-50 cursor-not-allowed'}`}
        disabled={!showCorrectAnswer}
      >
        {currentQuestionIndex < questions.length - 1 ? 'Lanjut' : 'Selesai'}
      </motion.button>
    </div>
  )
}