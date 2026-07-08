const app = getApp()

Page({
  data: {
    words: [],
    accent: 0,
    searchKey: ''
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const words = wx.getStorageSync('mastered_words') || []
    this.setData({ words })
  },

  onSearchInput(e) {
    const key = e.detail.value.toLowerCase()
    const all = wx.getStorageSync('mastered_words') || []
    const words = key
      ? all.filter(w => w.word.toLowerCase().includes(key) || w.meaning.includes(key))
      : all
    this.setData({ searchKey: key, words })
  },

  playSound(e) {
    const word = e.currentTarget.dataset.word
    if (!word) return

    if (!this._audio) {
      this._audio = wx.createInnerAudioContext()
      this._audio.obeyMuteSwitch = false
    }

    const accent = this.data.accent === 0 ? 0 : 1
    this._audio.stop()
    this._audio.onEnded = null
    this._audio.onError = null
    this._audio.autoplay = true
    this._audio.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${accent}`
  },

  toggleAccent() {
    this.setData({ accent: this.data.accent === 0 ? 1 : 0 })
  }
})
