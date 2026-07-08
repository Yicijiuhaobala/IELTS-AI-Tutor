const MODEL_CONFIG = {
  current: 'deepseek',
  providers: {
    deepseek: {
      name: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      maxTokens: 4096
    },
    glm: {
      name: 'GLM-4',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      model: 'glm-4-flash',
      maxTokens: 4096
    },
    volc: {
      name: '火山引擎',
      baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      model: 'YOUR_ENDPOINT_ID',
      maxTokens: 4096
    }
  }
}

function getSelectedModel() {
  const modelIndex = wx.getStorageSync('ai_model') || 0
  const keys = ['deepseek', 'glm', 'volc']
  return keys[modelIndex]
}

function callAI(systemPrompt, userMessageOrHistory, onStream) {
  return new Promise((resolve, reject) => {
    const currentModel = getSelectedModel()
    const provider = MODEL_CONFIG.providers[currentModel]
    const useStream = typeof onStream === 'function'

    const messages = Array.isArray(userMessageOrHistory)
      ? userMessageOrHistory
      : [{ role: 'user', content: userMessageOrHistory }]

    wx.cloud.callFunction({
      name: 'ai-' + getCurrentScene(),
      data: {
        provider: currentModel,
        model: currentModel === 'volc' ? undefined : provider.model, // volc model will be read from environment variable VOLC_ENDPOINT_ID in cloud function
        systemPrompt,
        messages,
        stream: useStream,
        maxTokens: provider.maxTokens
      },
      success: (res) => {
        if (res.result && res.result.success) {
          resolve(res.result.content)
        } else {
          reject(new Error(res.result?.error || 'AI调用失败'))
        }
      },
      fail: (err) => reject(err)
    })
  })
}

function getCurrentScene() {
  const pages = getCurrentPages()
  if (pages.length === 0) return 'speak'
  const route = pages[pages.length - 1].route || ''
  if (route.includes('speaking')) return 'speak'
  if (route.includes('writing')) return 'writing'
  if (route.includes('vocabulary')) return 'vocabulary'
  return 'speak'
}

module.exports = {
  callAI,
  MODEL_CONFIG
}
