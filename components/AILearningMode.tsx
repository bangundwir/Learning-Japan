import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import OpenAI from 'openai'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import { FaPaperPlane, FaLightbulb, FaPlus, FaTrash, FaExpand, FaCompress, FaHistory } from 'react-icons/fa'

interface AILearningModeProps {
  darkMode: boolean
  updateProgress: (progress: number) => void
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Chat {
  id: string
  topic: string
  messages: Message[]
}

export default function AILearningMode({ darkMode, updateProgress }: AILearningModeProps) {
  const [userInput, setUserInput] = useState('')
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [topic, setTopic] = useState('umum')
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showChatHistory, setShowChatHistory] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chats.length === 0) {
      createNewChat()
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [chats])

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  const getCurrentChat = () => chats.find(chat => chat.id === currentChatId) || null

  const createNewChat = () => {
    const newChatId = Date.now().toString()
    setChats(prev => [...prev, { id: newChatId, topic, messages: [] }])
    setCurrentChatId(newChatId)
    sendInitialMessage(newChatId)
  }

  const deleteChat = (chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId))
    if (currentChatId === chatId) {
      setCurrentChatId(chats[chats.length - 2]?.id || null)
    }
  }

  const sendInitialMessage = async (chatId: string) => {
    const initialMessage = { role: 'assistant' as const, content: `Halo! Saya adalah asisten AI untuk belajar bahasa Jepang. Topik kita kali ini adalah "${topic}". Apa yang ingin Anda pelajari tentang ${topic}?` }
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, messages: [initialMessage] }
        : chat
    ))
  }

  const generateSuggestedQuestions = async () => {
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

      const response = await openai.chat.completions.create({
        model: "google/gemini-flash-1.5",
        messages: [
          { role: "system", content: "Anda adalah asisten untuk membuat saran pertanyaan tentang belajar bahasa Jepang. Berikan 3 saran pertanyaan singkat dalam bahasa Indonesia." },
          { role: "user", content: `Buat 3 saran pertanyaan singkat tentang topik ${topic} dalam bahasa Jepang.` }
        ],
      })

      const suggestions = response.choices[0]?.message?.content?.split('\n').filter(q => q.trim() !== '') || []
      setSuggestedQuestions(suggestions)
      setShowSuggestions(true)
    } catch (error) {
      console.error('Error generating suggested questions:', error)
      setSuggestedQuestions([
        "Bagaimana cara memulai belajar bahasa Jepang?",
        "Apa perbedaan antara hiragana dan katakana?",
        "Berapa lama waktu yang dibutuhkan untuk menguasai bahasa Jepang?"
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userInput.trim()) return
    if (!currentChatId) {
      createNewChat()
    }

    const newMessage: Message = { role: 'user', content: userInput }
    setChats(prev => prev.map(chat => 
      chat.id === currentChatId 
        ? { ...chat, messages: [...chat.messages, newMessage] }
        : chat
    ))
    setUserInput('')
    setIsLoading(true)
    setError('')

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

      const currentChat = getCurrentChat()
      const stream = await openai.chat.completions.create({
        model: "google/gemini-flash-1.5",
        messages: [
          { role: "system", content: "Anda adalah tutor bahasa Jepang yang membantu, khusus mengajar Hiragana, Katakana, Kanji, tata bahasa (bunpo), dan aspek lain dari bahasa Jepang. Berikan penjelasan dalam bahasa Indonesia. Gunakan format Markdown untuk menyusun respons Anda." },
          ...(currentChat?.messages || []),
          { role: "user", content: `Topik: ${topic}. Pertanyaan: ${userInput}` }
        ],
        stream: true,
      })

      let aiResponse = ''
      const aiMessage: Message = { role: 'assistant', content: '' }
      setChats(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: [...chat.messages, aiMessage] }
          : chat
      ))

      for await (const chunk of stream) {
        aiResponse += chunk.choices[0]?.delta?.content || ''
        setChats(prev => prev.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, messages: [...chat.messages.slice(0, -1), { ...aiMessage, content: aiResponse }] }
            : chat
        ))
      }

      updateProgress(Math.random() * 10)
    } catch (error) {
      console.error('Error memanggil AI:', error)
      setError("Terjadi kesalahan saat berkomunikasi dengan AI. Silakan periksa kunci API Anda dan coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const toggleChatHistory = () => {
    setShowChatHistory(!showChatHistory)
  }

  return (
    <div className={`w-full mx-auto flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' : 'h-[calc(100vh-200px)]'} px-4 sm:px-6 lg:px-8`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Asisten Belajar AI Bahasa Jepang</h2>
        <div className="flex space-x-2">
          <button onClick={toggleChatHistory} className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}>
            <FaHistory />
          </button>
          <button onClick={toggleFullscreen} className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}>
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className={`${darkMode ? 'text-white' : 'text-gray-800'}`}>Topik:</label>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className={`p-2 rounded-lg border-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:border-blue-500`}
        >
          <option value="umum">Umum</option>
          <option value="hiragana">Hiragana</option>
          <option value="katakana">Katakana</option>
          <option value="kanji">Kanji</option>
          <option value="bunpo">Tata Bahasa (Bunpo)</option>
          <option value="kosakata">Kosakata</option>
          <option value="percakapan">Percakapan</option>
        </select>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={createNewChat}
          className={`px-4 py-2 ${darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} text-white rounded-lg transition-colors text-sm font-semibold flex items-center`}
        >
          <FaPlus className="mr-2" /> Chat Baru
        </motion.button>
      </div>
      <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
        <AnimatePresence>
          {showChatHistory && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "25%", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="w-full md:w-1/4 overflow-y-auto pr-4 max-h-[60vh] md:max-h-full"
            >
              <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Riwayat Chat</h3>
              {chats.map(chat => (
                <div key={chat.id} className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setCurrentChatId(chat.id)}
                    className={`text-left truncate ${currentChatId === chat.id ? 'font-bold' : ''} ${darkMode ? 'text-white' : 'text-gray-800'}`}
                  >
                    {chat.topic}
                  </button>
                  <button onClick={() => deleteChat(chat.id)} className="text-red-500">
                    <FaTrash />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <div className={`w-full ${showChatHistory ? 'md:w-3/4' : 'md:w-full'} flex flex-col overflow-hidden`}>
          <div 
            ref={chatContainerRef} 
            className={`flex-grow overflow-y-auto mb-4 p-4 rounded-lg border-2 space-y-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}
            style={{ maxHeight: 'calc(100vh - 400px)' }}
          >
            <AnimatePresence>
              {getCurrentChat()?.messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`p-3 rounded-lg ${message.role === 'user' ? 'bg-blue-100 text-blue-900 ml-auto' : `${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} mr-auto`} max-w-[80%]`}
                >
                  {message.role === 'assistant' ? (
                    <div className={`prose ${darkMode ? 'dark:prose-invert' : ''} max-w-none`}>
                      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="inline-block w-6 h-6 border-2 border-gray-400 border-t-blue-500 rounded-full"
                />
              </div>
            )}
          </div>
          {error && (
            <div className={`p-4 rounded-lg bg-red-100 text-red-800 mb-4`}>
              <p>{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className={`flex-grow p-2 rounded-lg border-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:border-blue-500`}
                placeholder="Tanyakan sesuatu tentang bahasa Jepang..."
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                className={`px-4 py-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition-colors text-lg font-semibold`}
                disabled={isLoading}
              >
                <FaPaperPlane />
              </motion.button>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={generateSuggestedQuestions}
              className={`px-4 py-2 ${darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'} text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center`}
            >
              <FaLightbulb className="mr-2" /> Saran Pertanyaan
            </motion.button>
          </form>
          {showSuggestions && (
            <div className="mt-4 overflow-x-auto">
              <h4 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Saran Pertanyaan:</h4>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <motion.button
                    key={index}
                    type="button"
                    onClick={() => setUserInput(question)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-1 text-sm ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} rounded-full transition-colors`}
                  >
                    {question}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}