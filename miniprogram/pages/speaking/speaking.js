const { callAI } = require('../../utils/api')
const { PROMPTS } = require('../../utils/prompts')
const app = getApp()

const TOPICS = {
  part1: ['工作/学习', '家乡', '爱好', '旅行', '食物', '音乐', '电影', '运动', '天气', '朋友'],
  part2: [
    { topic: '描述一个你最喜欢的公共场所', cueCard: 'Describe a public place you enjoy visiting.\nYou should say:\n- Where it is\n- How often you go there\n- What you do there\n- And explain why you enjoy it' },
    { topic: '描述一次难忘的旅行', cueCard: 'Describe an unforgettable trip you had.\nYou should say:\n- Where you went\n- Who you went with\n- What happened\n- And explain why it was unforgettable' },
    { topic: '描述一个对你影响很大的人', cueCard: 'Describe a person who has influenced you greatly.\nYou should say:\n- Who this person is\n- How you know them\n- What they did\n- And explain why they influenced you' },
    { topic: '描述你最喜欢的电子产品', cueCard: 'Describe a piece of electronic device you like.\nYou should say:\n- What it is\n- When you got it\n- How you use it\n- And explain why you like it' },
    { topic: '描述一次你帮助别人的经历', cueCard: 'Describe a time when you helped someone.\nYou should say:\n- Who you helped\n- How you helped them\n- Why you helped them\n- And explain how you felt about it' }
  ],
  part3: ['科技对社会的影响', '教育公平', '城市化问题', '环境保护', '全球化与文化', '社交媒体', '工作与生活平衡', '人工智能的未来']
}

Page({
  data: {
    inSession: false,
    mode: '',
    modeName: '',
    messages: [],
    userInput: '',
    isThinking: false,
    showScore: false,
    scores: [],
    totalBand: 0,
    advice: [],
    scrollTo: '',
    conversationHistory: [],
    currentTopic: ''
  },

  onShow() {
    app.startTimer('speaking')
  },

  onHide() {
    app.stopTimer('speaking')
  },

  onUnload() {
    app.stopTimer('speaking')
  },

  startSession(e) {
    const mode = e.currentTarget.dataset.mode
    const modeNames = { part1: 'Part 1 日常问答', part2: 'Part 2 话题陈述', part3: 'Part 3 深度讨论', free: '自由对话' }

    this.setData({
      inSession: true,
      mode,
      modeName: modeNames[mode],
      messages: [],
      showScore: false,
      conversationHistory: [],
      currentTopic: ''
    })

    this.generateFirstQuestion(mode)
  },

  async generateFirstQuestion(mode) {
    this.setData({ isThinking: true })

    let systemPrompt, userMessage, topic

    if (mode === 'part1') {
      topic = TOPICS.part1[Math.floor(Math.random() * TOPICS.part1.length)]
      systemPrompt = PROMPTS.speaking.part1.replace('{{topic}}', topic)
      userMessage = `请开始Part 1对话，话题是${topic}。先问第一个问题。`
    } else if (mode === 'part2') {
      const card = TOPICS.part2[Math.floor(Math.random() * TOPICS.part2.length)]
      topic = card.topic
      systemPrompt = PROMPTS.speaking.part2
        .replace('{{topic}}', card.topic)
        .replace('{{cueCard}}', card.cueCard)
      userMessage = `请给出Cue Card，话题是${card.topic}。`
    } else if (mode === 'part3') {
      topic = TOPICS.part3[Math.floor(Math.random() * TOPICS.part3.length)]
      systemPrompt = PROMPTS.speaking.part3.replace('{{topic}}', topic)
      userMessage = `请开始Part 3对话，话题是${topic}。先问第一个问题。`
    } else {
      systemPrompt = '你是一位友好的英语对话伙伴。请用英语与用户自由对话，话题不限。如果用户有语法或表达错误，在对话结束后给出改进建议。'
      userMessage = '你好！我们开始自由对话吧。'
    }

    this.setData({ currentTopic: topic })

    try {
      const content = await callAI(systemPrompt, userMessage)

      const aiMsg = {
        role: 'ai',
        content,
        time: this.getTime()
      }
      this.setData({
        messages: [aiMsg],
        conversationHistory: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }, { role: 'assistant', content }],
        isThinking: false,
        scrollTo: 'msg-0'
      })
    } catch (e) {
      console.error('AI call failed:', e)
      this.setData({
        messages: [{ role: 'ai', content: `抱歉，连接AI服务失败，请稍后重试。错误信息: ${e.message || e}`, time: this.getTime() }],
        isThinking: false
      })
    }
  },

  async sendMessage() {
    const { userInput, isThinking, conversationHistory } = this.data
    if (!userInput.trim() || isThinking) return

    const userMsg = {
      role: 'user',
      content: userInput.trim(),
      time: this.getTime()
    }

    const updatedMessages = [...this.data.messages, userMsg]
    this.setData({
      messages: updatedMessages,
      userInput: '',
      isThinking: true,
      scrollTo: `msg-${updatedMessages.length}`
    })

    const history = [...conversationHistory, { role: 'user', content: userInput.trim() }]

    try {
      const chatHistory = history.slice(1) // Exclude system prompt from history, we pass it separately as systemPrompt
      const content = await callAI(history[0]?.content || '', chatHistory)

      const aiMsg = {
        role: 'ai',
        content,
        time: this.getTime()
      }
      const finalMessages = [...updatedMessages, aiMsg]
      this.setData({
        messages: finalMessages,
        conversationHistory: [...history, { role: 'assistant', content }],
        isThinking: false,
        scrollTo: `msg-${finalMessages.length}`
      })

      if (this.shouldShowScore(content)) {
        this.parseScore(content)
      }
    } catch (e) {
      console.error('SendMessage call failed:', e)
      const errMsg = {
        role: 'ai',
        content: `抱歉，连接失败，请重试。错误信息: ${e.message || e}`,
        time: this.getTime()
      }
      this.setData({
        messages: [...updatedMessages, errMsg],
        isThinking: false
      })
    }
  },

  shouldShowScore(content) {
    return content.includes('Fluency') || content.includes('流利度') || content.includes('Band')
  },

  parseScore(content) {
    const scores = []
    const dimensions = [
      { key: 'fluency', label: '流利度与连贯性', regex: /(?:Fluency|流利度)[^0-9]*([\d.]+)/i },
      { key: 'lexical', label: '词汇资源', regex: /(?:Lexical|词汇)[^0-9]*([\d.]+)/i },
      { key: 'grammar', label: '语法范围与准确性', regex: /(?:Grammatical|语法)[^0-9]*([\d.]+)/i },
      { key: 'pronunciation', label: '发音', regex: /(?:Pronunciation|发音)[^0-9]*([\d.]+)/i }
    ]

    dimensions.forEach(dim => {
      const match = content.match(dim.regex)
      if (match) {
        scores.push({ key: dim.key, label: dim.label, band: parseFloat(match[1]) })
      }
    })

    if (scores.length > 0) {
      const totalBand = (scores.reduce((sum, s) => sum + s.band, 0) / scores.length).toFixed(1)

      const adviceLines = content.split('\n')
        .filter(line => line.includes('建议') || line.includes('improve') || line.includes('建议'))
        .slice(0, 5)
        .map(line => line.replace(/^[•\-\d.、\s]+/, ''))

      this.setData({
        showScore: true,
        scores,
        totalBand,
        advice: adviceLines.length > 0 ? adviceLines : ['继续练习，注意词汇多样性和语法准确性']
      })

      app.updateStats('speaking')
      this.saveHistory(content)
    }
  },

  continuePractice() {
    this.setData({
      showScore: false,
      messages: [],
      conversationHistory: []
    })
    this.generateFirstQuestion(this.data.mode)
  },

  endSession() {
    this.setData({
      inSession: false,
      messages: [],
      showScore: false,
      conversationHistory: []
    })
  },

  async saveHistory(aiResponse) {
    const lastUserMsg = [...this.data.messages].reverse().find(m => m.role === 'user')
    try {
      await wx.cloud.callFunction({
        name: 'user-data',
        data: {
          action: 'saveHistory',
          data: {
            module: 'speaking',
            content: lastUserMsg?.content || '口语练习',
            aiResponse
          }
        }
      })
    } catch (e) {
      console.warn('Save history failed:', e)
    }
  },

  getTime() {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
})
