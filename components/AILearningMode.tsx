import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import OpenAI from 'openai'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import { FaPaperPlane, FaLightbulb, FaPlus, FaTrash, FaExpand, FaCompress, FaHistory, FaSignOutAlt, FaDownload, FaUpload } from 'react-icons/fa'
import Login from './Login'
import { saveAs } from 'file-saver'

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
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)

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

  const handleLogin = async (password: string, rememberMe: boolean) => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const { token } = await response.json();
        localStorage.setItem('aiTutorToken', token);
        localStorage.setItem('aiTutorRememberMe', rememberMe.toString());
        setIsLoggedIn(true);
      } else {
        throw new Error('Invalid password');
      }
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (isLoggedIn && chats.length === 0) {
      createNewChat()
    }
  }, [isLoggedIn, chats.length])

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
    setIsGeneratingSuggestions(true);
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
      setError('Gagal menghasilkan saran pertanyaan. Silakan coba lagi.')
    } finally {
      setIsGeneratingSuggestions(false)
    }
  }

  const toggleSuggestions = () => {
    if (!showSuggestions && suggestedQuestions.length === 0) {
      generateSuggestedQuestions()
    } else {
      setShowSuggestions(!showSuggestions)
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

  const handleLogout = () => {
    localStorage.removeItem('aiTutorToken');
    localStorage.removeItem('aiTutorRememberMe');
    setIsLoggedIn(false);
  };

  useEffect(() => {
    loadChatsFromLocalStorage()
  }, [])

  useEffect(() => {
    if (chats.length > 0) {
      saveChatsToLocalStorage()
    }
  }, [chats])

  const loadChatsFromLocalStorage = () => {
    const savedChats = localStorage.getItem('aiTutorChats')
    const savedCurrentChatId = localStorage.getItem('aiTutorCurrentChatId')
    if (savedChats) {
      setChats(JSON.parse(savedChats))
    }
    if (savedCurrentChatId) {
      setCurrentChatId(savedCurrentChatId)
    }
  }

  const saveChatsToLocalStorage = () => {
    localStorage.setItem('aiTutorChats', JSON.stringify(chats))
    if (currentChatId) {
      localStorage.setItem('aiTutorCurrentChatId', currentChatId)
    }
  }

  const exportChats = () => {
    const dataStr = JSON.stringify(chats)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    saveAs(dataBlob, 'ai_tutor_chats.json')
  }

  const importChats = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedChats = JSON.parse(e.target?.result as string)
          setChats(importedChats)
          saveChatsToLocalStorage()
        } catch (error) {
          console.error('Error importing chats:', error)
          setError('Failed to import chats. Please check the file format.')
        }
      }
      reader.readAsText(file)
    }
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} darkMode={darkMode} />
  }

  return (
    <div className={`w-full h-screen flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : ''} ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'} transition-colors duration-300 ease-in-out`}>
      {/* Header */}
      <div className={`flex justify-between items-center p-2 sm:p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h2 className="text-lg sm:text-2xl font-bold truncate">AI Tutor: Japanese</h2>
        <div className="flex space-x-1 sm:space-x-2">
          <button onClick={toggleChatHistory} className={`p-1 sm:p-2 rounded-full transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>
            <FaHistory className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={toggleFullscreen} className={`p-1 sm:p-2 rounded-full transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>
            {isFullscreen ? <FaCompress className="w-4 h-4 sm:w-5 sm:h-5" /> : <FaExpand className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
          <button onClick={handleLogout} className="p-1 sm:p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors">
            <FaSignOutAlt className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-grow flex overflow-hidden">
        {/* Chat history sidebar */}
        <AnimatePresence>
          {showChatHistory && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: ["0%", "100%", "100%", "30%"], opacity: 1 }}
              exit={{ width: ["30%", "100%", "100%", "0%"], opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`h-full overflow-y-auto ${darkMode ? 'bg-gray-800' : 'bg-white'} border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} absolute md:relative z-10 md:z-auto shadow-lg md:shadow-none`}
            >
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4 text-center">Riwayat Chat</h3>
                <div className="space-y-2">
                  {chats.map(chat => (
                    <div 
                      key={chat.id} 
                      className={`flex flex-col p-3 rounded-lg hover:bg-opacity-50 transition-colors ${
                        currentChatId === chat.id 
                          ? (darkMode ? 'bg-gray-700' : 'bg-gray-200') 
                          : (darkMode ? 'bg-gray-750' : 'bg-gray-50')
                      } border ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm truncate flex-grow mr-2">
                          {chat.topic}
                        </h4>
                        <button 
                          onClick={() => deleteChat(chat.id)} 
                          className="text-red-500 hover:text-red-600 transition-colors p-1"
                        >
                          <FaTrash className="w-3 h-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => {setCurrentChatId(chat.id); if (window.innerWidth < 768) toggleChatHistory();}}
                        className={`text-left text-xs ${currentChatId === chat.id ? 'font-bold' : ''} hover:underline line-clamp-2`}
                      >
                        {chat.messages[chat.messages.length - 1]?.content || "Belum ada pesan"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat area */}
        <div className="flex-grow flex flex-col overflow-hidden">
          {/* Topic selector and action buttons */}
          <div className={`flex flex-wrap items-center gap-2 p-2 sm:p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className={`p-1 sm:p-2 rounded-lg border transition-colors text-xs sm:text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:border-blue-500 flex-grow sm:flex-grow-0`}
            >
              <option value="umum">Umum</option>
              <optgroup label="Sistem Penulisan">
                <option value="waji">Waji (Aksara Jepang)</option>
                <option value="hiragana">Hiragana</option>
                <option value="katakana">Katakana</option>
                <option value="kanji">Kanji</option>
                <option value="romaji">Romaji</option>
              </optgroup>
              <optgroup label="Tata Bahasa">
                <option value="bunpo">Tata Bahasa (Bunpo)</option>
                <option value="partikel">Partikel</option>
                <option value="kata-kerja">Kata Kerja</option>
                <option value="kata-sifat">Kata Sifat</option>
                <option value="kata-benda">Kata Benda</option>
                <option value="pola-kalimat">Pola Kalimat</option>
              </optgroup>
              <option value="kosakata">Kosakata</option>
              <option value="percakapan">Percakapan</option>
              <option value="menyimak">Menyimak</option>
              <option value="membaca">Membaca</option>
              <option value="menulis">Menulis</option>
              <optgroup label="Tingkat JLPT">
                <option value="n5">N5 (Pemula)</option>
                <option value="n4">N4 (Dasar Lanjutan)</option>
                <option value="n3">N3 (Menengah)</option>
                <option value="n2">N2 (Menengah Atas)</option>
                <option value="n1">N1 (Mahir)</option>
              </optgroup>
              <optgroup label="Budaya dan Kehidupan">
                <option value="kebudayaan">Kebudayaan Jepang</option>
                <option value="etika">Etika dan Sopan Santun</option>
                <option value="kehidupan-sehari-hari">Kehidupan Sehari-hari</option>
              </optgroup>
              <optgroup label="Penggunaan Khusus">
                <option value="bisnis">Bahasa Jepang Bisnis</option>
                <option value="akademik">Bahasa Jepang Akademik</option>
                <option value="pop-culture">Pop Culture Jepang</option>
              </optgroup>
              <option value="pelafalan">Pelafalan dan Aksen</option>
              <option value="idiom">Idiom dan Peribahasa</option>
              <option value="keigo">Keigo (Bahasa Sopan)</option>
            </select>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={createNewChat}
                className={`px-2 py-1 sm:px-3 sm:py-2 ${darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} text-white rounded-lg transition-colors text-xs sm:text-sm font-semibold flex items-center`}
              >
                <FaPlus className="mr-1 sm:mr-2" /> New
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={exportChats}
                className={`px-2 py-1 sm:px-3 sm:py-2 ${darkMode ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-yellow-500 hover:bg-yellow-600'} text-white rounded-lg transition-colors text-xs sm:text-sm font-semibold flex items-center`}
              >
                <FaDownload className="mr-1 sm:mr-2" /> Export
              </motion.button>
              <label className={`px-2 py-1 sm:px-3 sm:py-2 ${darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'} text-white rounded-lg transition-colors text-xs sm:text-sm font-semibold flex items-center cursor-pointer`}>
                <FaUpload className="mr-1 sm:mr-2" /> Import
                <input type="file" accept=".json" onChange={importChats} className="hidden" />
              </label>
            </div>
          </div>

          {/* Suggestions Panel */}
          <div className={`border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <div className="flex justify-between items-center p-2 sm:p-4">
              <h4 className="text-sm sm:text-base font-semibold">Saran Pertanyaan:</h4>
              <div className="flex space-x-1 sm:space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleSuggestions}
                  className={`px-2 py-1 sm:px-3 sm:py-2 ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400'} rounded-lg transition-colors text-xs sm:text-sm font-semibold`}
                >
                  {showSuggestions ? 'Hide' : 'Show'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={generateSuggestedQuestions}
                  className={`px-2 py-1 sm:px-3 sm:py-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition-colors text-xs sm:text-sm font-semibold`}
                  disabled={isGeneratingSuggestions}
                >
                  {isGeneratingSuggestions ? 'Generating...' : 'Generate'}
                </motion.button>
              </div>
            </div>
            <AnimatePresence>
              {showSuggestions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'} p-2 sm:p-4`}
                >
                  {suggestedQuestions.length > 0 ? (
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {suggestedQuestions.map((question, index) => (
                        <motion.button
                          key={index}
                          onClick={() => setUserInput(question)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm ${
                            darkMode
                              ? 'bg-gray-700 hover:bg-gray-600 text-white'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                          } rounded-lg transition-colors`}
                        >
                          {question}
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm">Tidak ada saran pertanyaan saat ini.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Chat messages */}
          <div 
            ref={chatContainerRef} 
            className={`flex-grow overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-4 scrollbar-thin ${darkMode ? 'scrollbar-thumb-gray-600 scrollbar-track-gray-800 bg-gray-900' : 'scrollbar-thumb-gray-400 scrollbar-track-gray-200 bg-gray-100'}`}
          >
            <AnimatePresence>
              {getCurrentChat()?.messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`p-2 sm:p-4 rounded-lg ${
                    message.role === 'user' 
                      ? `${darkMode ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-900'} ml-auto` 
                      : `${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} mr-auto`
                  } max-w-[85%] sm:max-w-[75%] shadow-md`}
                >
                  <div className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2">{message.role === 'user' ? 'You' : 'AI Tutor'}</div>
                  {message.role === 'assistant' ? (
                    <div className={`prose ${darkMode ? 'prose-invert' : ''} max-w-none text-xs sm:text-sm`}>
                      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm">{message.content}</p>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className={`inline-block w-5 h-5 sm:w-6 sm:h-6 border-2 border-t-blue-500 rounded-full ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}
                />
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className={`p-2 sm:p-3 ${darkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800'} text-xs sm:text-sm`}>
              <p>{error}</p>
            </div>
          )}

          {/* Input form */}
          <form onSubmit={handleSubmit} className={`p-2 sm:p-3 ${darkMode ? 'bg-gray-800 border-t border-gray-700' : 'bg-white border-t border-gray-200'}`}>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className={`flex-grow p-2 sm:p-3 rounded-lg border transition-colors text-xs sm:text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'} focus:outline-none focus:border-blue-500`}
                placeholder="Tanyakan sesuatu..."
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                className={`p-2 sm:p-3 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg transition-colors`}
                disabled={isLoading}
              >
                <FaPaperPlane className="w-5 h-5" />
              </motion.button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}