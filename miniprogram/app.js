wx.cloud.init({
  env: wx.cloud.DYNAMIC_CURRENT_ENV,
  traceUser: true
})

const db = wx.cloud.database()

App({
  globalData: {
    userInfo: null,
    todayStats: {
      speakingCount: 0,
      writingCount: 0,
      vocabLearned: 0,
      studyMinutes: 0
    },
    totalStats: {
      speakingSessions: 0,
      writingPieces: 0,
      vocabMastered: 0,
      streakDays: 0,
      totalStudyDays: 0
    }
  },

  onLaunch() {
    this.loadUserStats()
  },

  async loadUserStats() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'user-data',
        data: { action: 'getStats' }
      })
      if (result) {
        this.globalData.totalStats = result.totalStats || this.globalData.totalStats
        this.globalData.todayStats = result.todayStats || this.globalData.todayStats
      }
    } catch (e) {
      console.warn('Failed to load stats:', e)
    }
  },

  updateStats(type, delta = 1) {
    const stats = this.globalData.todayStats
    if (type === 'speaking') stats.speakingCount += delta
    if (type === 'writing') stats.writingCount += delta
    if (type === 'vocab') stats.vocabLearned += delta
    if (type === 'minutes') stats.studyMinutes += delta

    wx.cloud.callFunction({
      name: 'user-data',
      data: { action: 'updateStats', type, delta }
    }).catch(() => {})
  },

  startTimer(page) {
    if (!this.globalData.pageTimers) this.globalData.pageTimers = {}
    this.globalData.pageTimers[page] = Date.now()
  },

  stopTimer(page) {
    const timers = this.globalData.pageTimers || {}
    const start = timers[page]
    if (!start) return
    const elapsed = Math.floor((Date.now() - start) / 60000)
    if (elapsed > 0) {
      this.updateStats('minutes', elapsed)
    }
    delete timers[page]
  }
})
