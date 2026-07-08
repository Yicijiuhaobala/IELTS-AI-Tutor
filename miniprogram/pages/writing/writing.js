const { callAI } = require('../../utils/api')
const { PROMPTS } = require('../../utils/prompts')
const app = getApp()

const QUESTIONS = {
  task1: [
    'The chart below shows the percentage of households in the UK with various types of technology from 1997 to 2017. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    'The graph below shows the number of international tourists visiting five different countries between 2010 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    'The table below shows the average monthly rainfall in three different cities. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.'
  ],
  task2: [
    'Some people believe that unpaid community service should be a compulsory part of high school programmes. To what extent do you agree or disagree?',
    'In many countries, people are living in a "throwaway society" where they use things once and then discard them. What are the causes of this problem and what solutions can you suggest?',
    'Some people think that governments should spend more money on railways rather than roads. Others believe the opposite. Discuss both views and give your own opinion.',
    'The rise of social media has affected personal relationships and society as a whole. Do the advantages of social media outweigh the disadvantages?',
    'Many people believe that learning a foreign language is essential for children at an early age. Do you agree or disagree?'
  ]
}

Page({
  data: {
    inSession: false,
    taskType: '',
    question: '',
    essay: '',
    wordCount: 0,
    minWords: 150,
    isGrading: false,
    showResult: false,
    score: 0,
    dimensions: [],
    analysis: '',
    improvedVersion: '',
    vocabList: [],
    history: []
  },

  onShow() {
    app.startTimer('writing')
    this.loadHistory()
  },

  onHide() {
    app.stopTimer('writing')
  },

  onUnload() {
    app.stopTimer('writing')
  },

  async loadHistory() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'user-data',
        data: { action: 'getHistory', module: 'writing', limit: 10 }
      })
      if (result && result.list) {
        const list = result.list.map(item => ({
          ...item,
          title: (item.content || '').substring(0, 40) || '作文'
        }))
        this.setData({ history: list })
      }
    } catch (e) {
      console.warn('Load history failed:', e)
    }
  },

  selectTask(e) {
    const taskType = e.currentTarget.dataset.task
    const questions = QUESTIONS[taskType]
    const question = questions[Math.floor(Math.random() * questions.length)]

    this.setData({
      inSession: true,
      taskType,
      question,
      essay: '',
      wordCount: 0,
      showResult: false,
      isGrading: false,
      minWords: taskType === 'task1' ? 150 : 250
    })
  },

  onEssayInput(e) {
    const essay = e.detail.value
    const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0
    this.setData({ essay, wordCount })
  },

  async submitEssay() {
    const { essay, taskType, question, wordCount, minWords } = this.data
    if (wordCount < minWords) {
      wx.showToast({ title: `至少${minWords}词`, icon: 'none' })
      return
    }

    this.setData({ isGrading: true })
    const prompt = PROMPTS.writing[taskType]
      .replace('{{question}}', question)
      .replace('{{essay}}', essay)

    try {
      const content = await callAI(prompt, '请批改我的作文')
      this.parseResult(content)
      app.updateStats('writing')
      this.saveHistory(content)
    } catch (e) {
      wx.showToast({ title: e.message || '网络错误', icon: 'none' })
    }

    this.setData({ isGrading: false })
  },

  parseResult(content) {
    const scoreMatch = content.match(/Band\s*([\d.]+)/i)
    const score = scoreMatch ? parseFloat(scoreMatch[1]) : 6.0

    const dimensions = [
      { key: 'task', label: '任务完成度', score: 0 },
      { key: 'coherence', label: '连贯与衔接', score: 0 },
      { key: 'lexical', label: '词汇资源', score: 0 },
      { key: 'grammar', label: '语法范围', score: 0 }
    ]

    const dimLabels = ['任务完成度|Task Achievement|Task Response', '连贯|Coherence', '词汇|Lexical', '语法|Grammatical']
    dimLabels.forEach((pattern, i) => {
      const regex = new RegExp(pattern + '[^0-9]*([\\d.]+)', 'i')
      const match = content.match(regex)
      if (match) dimensions[i].score = parseFloat(match[1])
    })

    dimensions.forEach(d => {
      if (d.score === 0) d.score = score
      d.percent = (d.score / 9) * 100
    })

    const sections = content.split(/【|\[|\n(?=改进|问题|词汇)/)
    const analysis = sections.find(s => s.includes('问题') || s.includes('分析')) || '请参考评分结果'
    const improved = sections.find(s => s.includes('改进') || s.includes('改写') || s.includes('版本')) || ''
    const vocabSection = sections.find(s => s.includes('词汇') || s.includes('表达'))
    const vocabList = vocabSection
      ? vocabSection.match(/[A-Z][a-z]+(?:\s+[a-z]+)*/g)?.slice(0, 10) || []
      : []

    this.setData({
      showResult: true,
      score: score.toFixed(1),
      dimensions,
      analysis: analysis.replace(/^[【\[][^】\]]*[】\]]/, '').trim(),
      improvedVersion: improved.replace(/^[【\[][^】\]]*[】\]]/, '').trim(),
      vocabList
    })
  },

  newEssay() {
    this.selectTask({ currentTarget: { dataset: { task: this.data.taskType } } })
  },

  endSession() {
    this.setData({
      inSession: false,
      showResult: false
    })
    this.loadHistory()
  },

  async saveHistory(aiResponse) {
    try {
      await wx.cloud.callFunction({
        name: 'user-data',
        data: {
          action: 'saveHistory',
          data: {
            module: 'writing',
            content: this.data.essay?.substring(0, 100) || '写作练习',
            aiResponse
          }
        }
      })
    } catch (e) {
      console.warn('Save history failed:', e)
    }
  },

  viewHistory(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.history.find(h => h._id === id)
    if (item && item.aiResponse) {
      this.setData({
        inSession: true,
        taskType: item.content?.includes('Task 1') ? 'task1' : 'task2',
        showResult: true
      })
      this.parseResult(item.aiResponse)
    }
  }
})
