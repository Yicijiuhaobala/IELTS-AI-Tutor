const app = getApp()

Page({
  data: {
    stats: [
      { key: 'speaking', value: '0', label: '口语练习' },
      { key: 'writing', value: '0', label: '写作批改' },
      { key: 'vocab', value: '0', label: '今日词汇' },
      { key: 'streak', value: '0', label: '连续天数' }
    ],
    todayHistory: [],
    tips: [
      { bullet: '1', text: '每天15分钟口语对练，提分最快' },
      { bullet: '2', text: '写作写完先让AI批改，再对照改进版学习' },
      { bullet: '3', text: '做完阅读用同义替换功能，积累高频替换对' },
      { bullet: '4', text: '利用通勤时间背场景词汇，睡前复习' }
    ]
  },

  onShow() {
    this.loadStats()
    this.loadTodayHistory()
    this.updateGreeting()
  },

  updateGreeting() {
    const hour = new Date().getHours()
    let greeting = '你好'
    if (hour < 12) greeting = '早上好'
    else if (hour < 18) greeting = '下午好'
    else greeting = '晚上好'

    this.setData({
      greeting: `${greeting} 👋`
    })
  },

  loadStats() {
    const todayStats = app.globalData.todayStats
    const totalStats = app.globalData.totalStats
    this.setData({
      stats: [
        { key: 'speaking', value: String(todayStats.speakingCount || 0), label: '口语练习' },
        { key: 'writing', value: String(todayStats.writingCount || 0), label: '写作批改' },
        { key: 'vocab', value: String(todayStats.vocabLearned || 0), label: '今日词汇' },
        { key: 'streak', value: String(totalStats.streakDays || 0), label: '连续天数' }
      ]
    })
  },

  async loadTodayHistory() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'user-data',
        data: { action: 'getHistory', limit: 5 }
      })
      if (result && result.list) {
        const history = result.list.map(item => ({
          icon: item.module === 'speaking' ? '🎤' : item.module === 'writing' ? '✍️' : '📚',
          title: item.content?.substring(0, 30) || '学习记录',
          time: formatTime(item.createdAt)
        }))
        this.setData({ todayHistory: history })
      }
    } catch (e) {
      console.warn('Failed to load history:', e)
    }
  },

  navigateTo(e) {
    const type = e.currentTarget.dataset.type
    wx.switchTab({ url: `/pages/${type}/${type}` })
  }
})

function formatTime(date) {
  if (!date) return ''
  const d = new Date(date)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}
