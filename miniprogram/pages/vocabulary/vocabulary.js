const { callAI } = require('../../utils/api')
const { PROMPTS } = require('../../utils/prompts')
const app = getApp()

const WORD_POOL = [
  { word: 'significant', phonetic: '/sɪɡˈnɪfɪkənt/', meaning: '重要的，显著的', example: 'There has been a significant increase in online learning.' },
  { word: 'consequence', phonetic: '/ˈkɒnsɪkwəns/', meaning: '结果，后果', example: 'The consequence of pollution is global warming.' },
  { word: 'inevitable', phonetic: '/ɪnˈevɪtəbl/', meaning: '不可避免的', example: 'Change is inevitable in modern society.' },
  { word: 'contribute', phonetic: '/kənˈtrɪbjuːt/', meaning: '贡献，促成', example: 'Technology contributes to economic growth.' },
  { word: 'phenomenon', phonetic: '/fəˈnɒmɪnən/', meaning: '现象', example: 'Globalization is a complex phenomenon.' },
  { word: 'perspective', phonetic: '/pəˈspektɪv/', meaning: '视角，观点', example: 'We should consider this from a different perspective.' },
  { word: 'implement', phonetic: '/ˈɪmplɪment/', meaning: '实施，执行', example: 'The government plans to implement new policies.' },
  { word: 'acquire', phonetic: '/əˈkwaɪə/', meaning: '获得，习得', example: 'Children acquire language naturally.' },
  { word: 'ubiquitous', phonetic: '/juːˈbɪkwɪtəs/', meaning: '无处不在的', example: 'Smartphones have become ubiquitous in modern society.' },
  { word: 'deteriorate', phonetic: '/dɪˈtɪəriəreɪt/', meaning: '恶化，变坏', example: 'Air quality has deteriorated rapidly in recent years.' },
  { word: 'comprehensive', phonetic: '/ˌkɒmprɪˈhensɪv/', meaning: '全面的，综合的', example: 'The report provides a comprehensive analysis of the issue.' },
  { word: 'controversial', phonetic: '/ˌkɒntrəˈvɜːʃl/', meaning: '有争议的', example: 'The topic of genetic engineering remains controversial.' },
  { word: 'diverse', phonetic: '/daɪˈvɜːs/', meaning: '多样的，不同的', example: 'The city has a diverse and multicultural population.' },
  { word: 'emphasize', phonetic: '/ˈemfəsaɪz/', meaning: '强调，重视', example: 'The report emphasizes the need for urgent action.' },
  { word: 'flexible', phonetic: '/ˈfleksəbl/', meaning: '灵活的，可变通的', example: 'Distance learning offers flexible study arrangements.' },
  { word: 'fundamental', phonetic: '/ˌfʌndəˈmentl/', meaning: '基本的，根本的', example: 'Education is a fundamental human right.' },
  { word: 'initiative', phonetic: '/ɪˈnɪʃətɪv/', meaning: '倡议，主动性', example: 'The government launched a new environmental initiative.' },
  { word: 'numerous', phonetic: '/ˈnjuːmərəs/', meaning: '许多的，大量的', example: 'Numerous studies have shown the benefits of exercise.' },
  { word: 'promote', phonetic: '/prəˈməʊt/', meaning: '促进，推广', example: 'The policy aims to promote renewable energy.' },
  { word: 'reluctant', phonetic: '/rɪˈlʌktənt/', meaning: '不情愿的，勉强的', example: 'Many people are reluctant to change their habits.' },
  { word: 'sustainable', phonetic: '/səˈsteɪnəbl/', meaning: '可持续的', example: 'We need to find sustainable solutions to urban development.' },
  { word: 'transform', phonetic: '/trænsˈfɔːm/', meaning: '转变，变革', example: 'The internet has transformed the way we communicate.' },
  { word: 'vulnerable', phonetic: '/ˈvʌlnərəbl/', meaning: '脆弱的，易受伤的', example: 'Children are particularly vulnerable to air pollution.' },
  { word: 'widespread', phonetic: '/ˈwaɪdspred/', meaning: '广泛的，普遍的', example: 'There is widespread concern about climate change.' }
]

const DAILY_WORD_COUNT = 8

Page({
  data: {
    currentMode: '',
    dailyWords: [],
    passageText: '',
    questionText: '',
    isExtracting: false,
    showSynonymResult: false,
    synonymPairs: [],
    synonymPattern: '',
    showModeContent: false,
    modeContent: '',
    modeTitle: '',
    isGenerating: false,
    userWords: '',
    accent: 0,
    showMastered: false,
    masteredWords: []
  },

  onShow() {
    this.loadDailyWords()
    app.startTimer('vocabulary')
  },

  onHide() {
    app.stopTimer('vocabulary')
  },

  onUnload() {
    app.stopTimer('vocabulary')
  },

  pickRandomWords() {
    const shuffled = [...WORD_POOL].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, DAILY_WORD_COUNT).map(w => ({ ...w, mastered: false }))
  },

  loadDailyWords() {
    const today = new Date().toDateString()
    const cached = wx.getStorageSync('daily_words')
    if (cached && cached.date === today) {
      this.setData({ dailyWords: cached.words })
      return
    }

    const words = this.pickRandomWords()
    wx.setStorageSync('daily_words', { date: today, words })
    this.setData({ dailyWords: words })
  },

  refreshDailyWords() {
    const words = this.pickRandomWords()
    wx.setStorageSync('daily_words', { date: new Date().toDateString(), words })
    this.setData({ dailyWords: words })
    wx.showToast({ title: '已更新今日词汇', icon: 'success' })
  },

  toggleMastered(e) {
    const index = e.currentTarget.dataset.index
    const key = `dailyWords[${index}].mastered`
    const word = this.data.dailyWords[index]
    const newVal = !word.mastered
    this.setData({ [key]: newVal })

    if (newVal) {
      app.updateStats('vocab')
      const cached = wx.getStorageSync('daily_words')
      if (cached) {
        cached.words[index].mastered = true
        wx.setStorageSync('daily_words', cached)
      }

      const mastered = wx.getStorageSync('mastered_words') || []
      if (!mastered.find(w => w.word === word.word)) {
        mastered.unshift({
          word: word.word,
          phonetic: word.phonetic,
          meaning: word.meaning,
          date: new Date().toLocaleDateString()
        })
        wx.setStorageSync('mastered_words', mastered.slice(0, 200))
      }
    }
  },

  loadMasteredWords() {
    const mastered = wx.getStorageSync('mastered_words') || []
    this.setData({ masteredWords: mastered })
  },

  toggleMasteredList() {
    const show = !this.data.showMastered
    if (show) this.loadMasteredWords()
    this.setData({ showMastered: show })
  },

  switchMode(e) {
    const mode = e.currentTarget.dataset.mode
    const titles = {
      story: '场景故事记忆',
      quiz: '填空测验',
      synonym: '同义替换提取',
      etymology: '词根词缀学习'
    }

    if (mode === 'synonym') {
      this.setData({ currentMode: mode })
      return
    }

    this.setData({
      currentMode: mode,
      showModeContent: false,
      modeTitle: titles[mode],
      userWords: ''
    })

    if (mode === 'story') {
      this.generateStory()
    } else if (mode === 'quiz') {
      this.generateQuiz()
    } else if (mode === 'etymology') {
      this.generateEtymology()
    }
  },

  async generateStory() {
    this.setData({ isGenerating: true })
    const words = this.data.dailyWords
      .filter(w => !w.mastered)
      .slice(0, 8)
      .map(w => w.word)
      .join(', ')

    if (!words) {
      this.setData({
        isGenerating: false,
        showModeContent: true,
        modeContent: '今天的词汇都已掌握！明天再来学新词吧。'
      })
      return
    }

    const prompt = PROMPTS.vocabulary.story.replace('{{words}}', words)

    try {
      const content = await callAI(prompt, `请用这些单词编故事：${words}`)
      this.setData({
        showModeContent: true,
        modeContent: content,
        isGenerating: false
      })
      app.updateStats('vocab', 0)
    } catch (e) {
      this.setData({
        showModeContent: true,
        modeContent: `生成失败，请重试。错误: ${e.message || e}`,
        isGenerating: false
      })
    }
  },

  async generateQuiz() {
    this.setData({ isGenerating: true })
    const words = this.data.dailyWords
      .filter(w => !w.mastered)
      .slice(0, 10)
      .map(w => w.word)
      .join(', ')

    if (!words) {
      this.setData({
        isGenerating: false,
        showModeContent: true,
        modeContent: '今天的词汇都已掌握！'
      })
      return
    }

    const prompt = PROMPTS.vocabulary.quiz.replace('{{words}}', words)

    try {
      const content = await callAI(prompt, `请生成填空题：${words}`)
      this.setData({
        showModeContent: true,
        modeContent: content,
        isGenerating: false
      })
    } catch (e) {
      this.setData({
        showModeContent: true,
        modeContent: `生成失败，请重试。错误: ${e.message || e}`,
        isGenerating: false
      })
    }
  },

  async generateEtymology() {
    this.setData({ isGenerating: true })
    const roots = ['dict', 'graph/gram', 'spect', 'port', 'struct', 'tract', 'fer', 'mit/miss']
    const root = roots[Math.floor(Math.random() * roots.length)]
    const prompt = PROMPTS.vocabulary.etymology.replace('{{root}}', root)

    try {
      const content = await callAI(prompt, `请教学词根：${root}`)
      this.setData({
        showModeContent: true,
        modeContent: content,
        isGenerating: false
      })
    } catch (e) {
      this.setData({
        showModeContent: true,
        modeContent: `生成失败，请重试。错误: ${e.message || e}`,
        isGenerating: false
      })
    }
  },

  async extractSynonyms() {
    const { passageText, questionText } = this.data
    if (!passageText.trim()) {
      wx.showToast({ title: '请输入文章段落', icon: 'none' })
      return
    }

    this.setData({ isExtracting: true })

    const prompt = PROMPTS.synonym
      .replace('{{passage}}', passageText)
      .replace('{{question}}', questionText || '未提供题目')
      .replace('{{options}}', '未提供选项')

    try {
      const content = await callAI(prompt, '请提取同义替换对')
      const pairs = []
      const pairRegex = /([^→\n]+)\s*→\s*([^\n]+)/g
      let match
      while ((match = pairRegex.exec(content)) !== null) {
        pairs.push({ source: match[1].trim(), target: match[2].trim() })
      }

      const patternMatch = content.match(/(?:替换模式|类型)[：:]\s*([^\n]+)/)
      const pattern = patternMatch ? patternMatch[1] : '请查看完整分析'

      this.setData({
        showSynonymResult: true,
        synonymPairs: pairs.slice(0, 15),
        synonymPattern: pattern,
        isExtracting: false
      })
      app.updateStats('vocab', 2)
    } catch (e) {
      this.setData({ isExtracting: false })
      wx.showToast({ title: e.message || '提取失败', icon: 'none' })
    }
  },

  toggleAccent() {
    this.setData({ accent: this.data.accent === 0 ? 1 : 0 })
  },

  playSound(e) {
    const text = e.currentTarget.dataset.word
    if (!text) return

    if (!this._audio) {
      this._audio = wx.createInnerAudioContext()
      this._audio.obeyMuteSwitch = false
    }
    const audio = this._audio

    const isSentence = text.includes(' ')

    if (isSentence) {
      if (this._playingSentence) return
      this._playingSentence = true
      const words = text.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(Boolean)
      this.playWordSequence(words, 0)
      return
    }

    const accent = this.data.accent === 0 ? 0 : 1
    audio.stop()
    audio.onEnded = null
    audio.onError = null
    audio.autoplay = true
    audio.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=${accent}`
  },

  playWordSequence(words, index) {
    if (index >= words.length) {
      this._playingSentence = false
      return
    }
    const word = words[index]
    const type = this.data.accent === 0 ? 0 : 1
    const audio = this._audio
    audio.stop()
    audio.onEnded = null
    audio.onError = null
    audio.autoplay = true
    audio.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`

    const delay = word.length > 8 ? 1400 : word.length > 4 ? 1000 : 700
    if (this._seqTimer) clearTimeout(this._seqTimer)
    this._seqTimer = setTimeout(() => {
      this.playWordSequence(words, index + 1)
    }, delay)
  },

  backToGrid() {
    this.setData({
      currentMode: '',
      showModeContent: false,
      modeContent: '',
      isGenerating: false
    })
  },

  clearSynonym() {
    this.setData({
      showSynonymResult: false,
      synonymPairs: [],
      synonymPattern: '',
      passageText: '',
      questionText: ''
    })
  }
})
