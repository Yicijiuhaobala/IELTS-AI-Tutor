const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  try {
    const { result } = await cloud.callFunction({
      name: 'ai-proxy',
      data: event
    })
    return result
  } catch (e) {
    return { success: false, error: e.message }
  }
}
