const app = getApp()

Page({
  data: {
    totalStats: { speakingSessions: 0, writingPieces: 0, vocabMastered: 0, streakDays: 0, totalStudyDays: 0 },
    todayStats: { speakingCount: 0, writingCount: 0, vocabLearned: 0, studyMinutes: 0 },
    last7Days: [],
    historyList: [],
    historyTab: 'all',
    modelOptions: ['DeepSeek', 'GLM-4', '火山引擎'],
    modelIndex: 0,
    targetOptions: ['Band 6.0', 'Band 6.5', 'Band 7.0', 'Band 7.5', 'Band 8.0'],
    targetIndex: 2
  },

  onShow() {
    this.loadData()
    const modelIndex = wx.getStorageSync('ai_model') || 0
    const targetIndex = wx.getStorageSync('target_band') || 2
    this.setData({ modelIndex, targetIndex })
  },

  async loadData() {
    this.setData({
      totalStats: app.globalData.totalStats,
      todayStats: app.globalData.todayStats
    })
    this.generateStreak()
    this.loadHistory()
  },

  generateStreak() {
    const days = []
    const dayNames = ['日', '一', '二', '三', '四', '五', '六']
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      days.push({
        label: dayNames[d.getDay()],
        date: dateStr,
        active: i < this.data.totalStats.streakDays,
        today: i === 0
      })
    }
    this.setData({ last7Days: days })
  },

  async loadHistory() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'user-data',
        data: {
          action: 'getHistory',
          module: this.data.historyTab === 'all' ? undefined : this.data.historyTab,
          limit: 50
        }
      })
      if (result && result.list) {
        const list = result.list.map(item => ({
          ...item,
          title: (item.content || '').substring(0, 50) || '学习记录'
        }))
        this.setData({ historyList: list })
      }
    } catch (e) {
      console.warn('Load history failed:', e)
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ historyTab: tab }, () => {
      this.loadHistory()
    })
  },

  onModelChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({ modelIndex: index })
    wx.setStorageSync('ai_model', index)
  },

  onTargetChange(e) {
    const index = parseInt(e.detail.value)
    this.setData({ targetIndex: index })
    wx.setStorageSync('target_band', index)
  },

  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${h}:${m}`
  }
})
