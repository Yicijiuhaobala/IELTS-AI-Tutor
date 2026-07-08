const cloud = require('wx-server-sdk')
const https = require('https')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const PROVIDERS = {
  deepseek: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    key: process.env.DEEPSEEK_API_KEY
  },
  glm: {
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4-flash',
    key: process.env.GLM_API_KEY
  },
  volc: {
    url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    model: process.env.VOLC_ENDPOINT_ID || '',
    key: process.env.VOLC_API_KEY
  }
}

exports.main = async (event) => {
  const { provider = 'deepseek', model, systemPrompt, messages, maxTokens = 4096 } = event
  const config = PROVIDERS[provider]

  if (!config || !config.key) {
    return { success: false, error: `未配置 ${provider} 的 API Key，请在 ai-proxy 云函数环境变量中设置` }
  }

  const body = {
    model: model || config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
    stream: false
  }

  return new Promise((resolve) => {
    const postData = JSON.stringify(body)
    const parsedUrl = new URL(config.url)
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.key}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 60000
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve({
            success: true,
            content: parsed.choices?.[0]?.message?.content || ''
          })
        } catch (e) {
          resolve({ success: false, error: `解析响应失败: ${data.substring(0, 200)}` })
        }
      })
    })

    req.on('error', (e) => resolve({ success: false, error: e.message }))
    req.on('timeout', () => { req.destroy(); resolve({ success: false, error: '请求超时' }) })
    req.write(postData)
    req.end()
  })
}
