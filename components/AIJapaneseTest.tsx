import React, { useState, useEffect } from 'react'
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

type Topic = 'hiragana' | 'katakana' | 'kanji' | 'kotoba' | 'bunpo' | 'dokkai' | 'n5' | 'n4' | 'n3' | 'n2' | 'n1';
type Level = 'Sangat Pemula' | 'Pemula' | 'Dasar' | 'Menengah' | 'Lanjutan' | 'Mahir';
type Model = 'google/gemini-flash-1.5' | 'openai/gpt-4o-mini';

export default function AIJapaneseTest({ updateProgress }: { updateProgress: (progress: number) => void }) {
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
  const [selectedModel, setSelectedModel] = useState<Model>('google/gemini-flash-1.5')

  useEffect(() => {
    loadTestHistory()
  }, [])

  const loadTestHistory = () => {
    const savedHistory = localStorage.getItem('aiJapaneseTestHistory')
    if (savedHistory) {
      setTestHistory(JSON.parse(savedHistory))
    }
  }

  const generateQuestions = async (isNewTest: boolean) => {
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
        kanji: "Sertakan kanji dengan informasi tentang arti, cara baca (onyomi dan kunyomi), dan penggunaan dalam kalimat. Berikan furigana untuk setiap kanji.",
        kotoba: "Fokus pada kosakata sehari-hari. Pilih kata-kata yang sesuai dengan level yang dipilih. Jika ada kanji, sertakan furigana.",
        bunpo: "Jelaskan aturan tata bahasa dan berikan contoh kalimat. Pilih pola kalimat yang sesuai dengan level yang dipilih. Sertakan furigana untuk kanji.",
        dokkai: "Sertakan teks pendek dalam bahasa Jepang diikuti dengan pertanyaan pemahaman. Sesuaikan panjang dan kompleksitas teks dengan level yang dipilih. Sertakan furigana untuk kanji.",
        n5: "Fokus pada materi JLPT N5. Mencakup kosakata, tata bahasa, dan pemahaman teks sesuai level N5.",
        n4: "Fokus pada materi JLPT N4. Mencakup kosakata, tata bahasa, dan pemahaman teks sesuai level N4.",
        n3: "Fokus pada materi JLPT N3. Mencakup kosakata, tata bahasa, dan pemahaman teks sesuai level N3.",
        n2: "Fokus pada materi JLPT N2. Mencakup kosakata, tata bahasa, dan pemahaman teks sesuai level N2.",
        n1: "Fokus pada materi JLPT N1. Mencakup kosakata, tata bahasa, dan pemahaman teks sesuai level N1."
      }

      const response = await openai.chat.completions.create({
        model: selectedModel,
        messages: [
          { role: "system", content: `Anda adalah pembuat tes bahasa Jepang yang ahli. Buatlah ${questionCount} pertanyaan pilihan ganda tentang ${selectedTopic} bahasa Jepang untuk level ${selectedLevel}. ${topicPrompts[selectedTopic]} Setiap pertanyaan harus memiliki 4 pilihan jawaban dan penjelasan detail dalam bahasa Indonesia. Pastikan pertanyaan sesuai dengan topik dan level yang dipilih. Jika ada kanji, sertakan furigana dalam format [漢字]{ふりがな}. Berikan output dalam format JSON yang valid.` },
          { role: "user", content: `Buat ${questionCount} pertanyaan pilihan ganda tes bahasa Jepang tentang ${selectedTopic} untuk level ${selectedLevel}. Sertakan penjelasan detail dalam bahasa Indonesia untuk setiap pertanyaan. Kembalikan hasilnya sebagai array JSON dari objek pertanyaan, di mana setiap objek memiliki properti 'text' (teks pertanyaan dalam bahasa Indonesia), 'options' (array pilihan jawaban), 'correctAnswer' (jawaban yang benar), dan 'explanation' (penjelasan dalam bahasa Indonesia). Jika ada kanji, sertakan furigana dalam format [漢字]{ふりがな}. Pastikan format JSON valid dan dapat di-parse.` }
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

      if (isNewTest) {
        setQuestions(generatedQuestions)
      } else {
        setQuestions(prevQuestions => [...prevQuestions, ...generatedQuestions])
      }
      setIsLoading(false)
      setCurrentQuestionIndex(0)
      setScore(0)
      setIsTestComplete(false)
      setShowCorrectAnswer(false)
    } catch (error) {
      console.error('Error generating questions:', error)
      setIsLoading(false)
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

  const resetTest = () => {
    setQuestions([])
    setCurrentQuestionIndex(0)
    setScore(0)
    setIsTestComplete(false)
    setShowCorrectAnswer(false)
    setSelectedTopic('hiragana')
    setSelectedLevel('Sangat Pemula')
    setQuestionCount(5)
    setSelectedModel('google/gemini-flash-1.5')
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

  const renderWithFurigana = (text: string) => {
    return text.replace(/\[(.+?)\]\{(.+?)\}/g, (match, kanji, furigana) => {
      // Jika kanji hanya satu karakter, tampilkan furigana di atasnya
      if (kanji.length === 1) {
        return `<ruby>${kanji}<rt>${furigana}</rt></ruby>`;
      }
      // Jika kanji lebih dari satu karakter, tampilkan furigana hanya untuk karakter yang tidak umum
      return kanji.split('').map((char: string, index: number) => {
        if (char.match(/[\u4e00-\u9faf]/)) { // Cek apakah karakter adalah kanji
          return `<ruby>${char}<rt>${furigana.split('')[index] || ''}</rt></ruby>`;
        }
        return char;
      }).join('');
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-t-4 border-blue-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  if (isTestComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <h2 className="text-2xl font-bold mb-4">Tes Selesai!</h2>
        <p className="text-xl mb-4">Skor Anda: {score} / {questions.length}</p>
        <div className="w-full max-w-4xl mb-8 overflow-x-auto bg-white rounded-lg shadow-lg">
          <h3 className="text-lg font-bold p-4 bg-gray-100">Hasil Tes:</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2 text-left">No.</th>
                <th className="border p-2 text-left">Pertanyaan</th>
                <th className="border p-2 text-left">Jawaban Anda</th>
                <th className="border p-2 text-left">Jawaban Benar</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Penjelasan</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, index) => (
                <tr key={q.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="border p-2 text-center">{index + 1}</td>
                  <td className="border p-2" dangerouslySetInnerHTML={{ __html: renderWithFurigana(q.text) }}></td>
                  <td className={`border p-2 ${q.userAnswer === q.correctAnswer ? 'text-green-600' : 'text-red-600'}`} dangerouslySetInnerHTML={{ __html: q.userAnswer ? renderWithFurigana(q.userAnswer) : '-' }}></td>
                  <td className="border p-2 text-green-600" dangerouslySetInnerHTML={{ __html: renderWithFurigana(q.correctAnswer) }}></td>
                  <td className={`border p-2 font-bold ${q.userAnswer === q.correctAnswer ? 'text-green-600' : 'text-red-600'}`}>
                    {q.userAnswer === q.correctAnswer ? 'Benar' : 'Salah'}
                  </td>
                  <td className="border p-2" dangerouslySetInnerHTML={{ __html: renderWithFurigana(q.explanation) }}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-x-4 mb-8">
          <button
            onClick={restartTest}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Ulangi Tes
          </button>
          <button
            onClick={resetTest}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Tes Baru
          </button>
        </div>
        <button
          onClick={() => setShowTestHistory(!showTestHistory)}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors mb-4"
        >
          {showTestHistory ? 'Sembunyikan Riwayat Tes' : 'Tampilkan Riwayat Tes'}
        </button>
        {showTestHistory && (
          <div className="mt-4 max-h-60 overflow-y-auto w-full">
            <h3 className="text-xl font-bold mb-2">Riwayat Tes</h3>
            {testHistory.map((result) => (
              <div key={result.id} className="mb-2 p-2 border rounded">
                <p>{new Date(result.date).toLocaleDateString()}: {result.score}/{result.totalQuestions} ({result.topic} - {result.level})</p>
                <button
                  onClick={() => retryTest(result)}
                  className="px-2 py-1 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white mt-1"
                >
                  Ulangi Tes Ini
                </button>
              </div>
            ))}
            <button
              onClick={clearTestHistory}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white mt-4"
            >
              Hapus Riwayat Tes
            </button>
          </div>
        )}
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-2xl font-bold mb-4">Tes Bahasa Jepang</h2>
        <div className="mb-4 space-y-2">
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value as Topic)}
            className="p-2 rounded-lg bg-gray-200 text-gray-800"
          >
            <option value="hiragana">Hiragana</option>
            <option value="katakana">Katakana</option>
            <option value="kanji">Kanji</option>
            <option value="kotoba">Kotoba (Kosakata)</option>
            <option value="bunpo">Bunpo (Tata Bahasa)</option>
            <option value="dokkai">Dokkai (Membaca)</option>
            <option value="n5">JLPT N5</option>
            <option value="n4">JLPT N4</option>
            <option value="n3">JLPT N3</option>
            <option value="n2">JLPT N2</option>
            <option value="n1">JLPT N1</option>
          </select>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as Level)}
            className="p-2 rounded-lg bg-gray-200 text-gray-800"
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
            className="p-2 rounded-lg bg-gray-200 text-gray-800"
          >
            <option value={5}>5 Pertanyaan</option>
            <option value={10}>10 Pertanyaan</option>
            <option value={15}>15 Pertanyaan</option>
            <option value={20}>20 Pertanyaan</option>
          </select>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as Model)}
            className="p-2 rounded-lg bg-gray-200 text-gray-800"
          >
            <option value="google/gemini-flash-1.5">Google Gemini Flash 1.5</option>
            <option value="openai/gpt-4o-mini">OpenAI GPT-4O Mini</option>
          </select>
        </div>
        <button
          onClick={() => generateQuestions(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Buat Pertanyaan
        </button>
        {testHistory.length > 0 && (
          <button
            onClick={() => setShowTestHistory(!showTestHistory)}
            className="px-4 py-2 mt-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Lihat Riwayat Tes
          </button>
        )}
        {showTestHistory && (
          <div className="mt-4 max-h-60 overflow-y-auto w-full">
            <h3 className="text-xl font-bold mb-2">Riwayat Tes</h3>
            {testHistory.map((result) => (
              <div key={result.id} className="mb-2 p-2 border rounded">
                <p>{new Date(result.date).toLocaleDateString()}: {result.score}/{result.totalQuestions} ({result.topic} - {result.level})</p>
                <button
                  onClick={() => retryTest(result)}
                  className="px-2 py-1 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white mt-1"
                >
                  Ulangi Tes Ini
                </button>
              </div>
            ))}
            <button
              onClick={clearTestHistory}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white mt-4"
            >
              Hapus Riwayat Tes
            </button>
          </div>
        )}
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-xl font-bold mb-4">Pertanyaan {currentQuestionIndex + 1} dari {questions.length}</h2>
      <p className="text-lg mb-4" dangerouslySetInnerHTML={{ __html: renderWithFurigana(currentQuestion.text) }}></p>
      <div className="space-y-2 mb-4">
        {currentQuestion.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswerSelection(option)}
            className={`w-full px-4 py-2 rounded-lg transition-colors ${
              selectedAnswer === option
                ? option === currentQuestion.correctAnswer
                  ? 'bg-green-500 text-white'
                  : 'bg-red-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            } ${showCorrectAnswer ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            disabled={showCorrectAnswer}
            dangerouslySetInnerHTML={{ __html: renderWithFurigana(option) }}
          ></button>
        ))}
      </div>
      {showCorrectAnswer && (
        <div className="mb-4 p-4 bg-gray-100 rounded-lg">
          <p className="font-bold">Jawaban yang benar:</p>
          <p className="text-green-600" dangerouslySetInnerHTML={{ __html: renderWithFurigana(currentQuestion.correctAnswer) }}></p>
          <p className="mt-2 font-bold">Penjelasan:</p>
          <p dangerouslySetInnerHTML={{ __html: renderWithFurigana(currentQuestion.explanation) }}></p>
        </div>
      )}
      <button
        onClick={handleNextQuestion}
        className={`px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors ${showCorrectAnswer ? '' : 'opacity-50 cursor-not-allowed'}`}
        disabled={!showCorrectAnswer}
      >
        {currentQuestionIndex < questions.length - 1 ? 'Lanjut' : 'Selesai'}
      </button>
    </div>
  )
}