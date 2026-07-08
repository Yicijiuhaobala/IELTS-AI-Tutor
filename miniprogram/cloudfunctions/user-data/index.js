const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { action, type, delta, data } = event

  switch (action) {
    case 'getStats': {
      const totalRes = await db.collection('user_stats').where({ _openid: OPENID }).get()
      const todayRes = await db.collection('daily_logs').where({
        _openid: OPENID,
        date: getTodayDate()
      }).get()

      return {
        totalStats: totalRes.data[0]?.stats || getDefaultTotalStats(),
        todayStats: todayRes.data[0]?.stats || getDefaultTodayStats()
      }
    }

    case 'updateStats': {
      await updateTotalStats(OPENID, type, delta)
      await updateDailyStats(OPENID, type, delta)
      await updateStreak(OPENID)
      return { success: true }
    }

    case 'saveHistory': {
      const { module, content, aiResponse } = data
      await db.collection('study_history').add({
        data: {
          _openid: OPENID,
          module,
          content,
          aiResponse,
          createdAt: db.serverDate()
        }
      })
      return { success: true }
    }

    case 'getHistory': {
      const { module, limit = 20, offset = 0 } = event
      const query = { _openid: OPENID }
      if (module) query.module = module

      const { data: list } = await db.collection('study_history')
        .where(query)
        .orderBy('createdAt', 'desc')
        .skip(offset)
        .limit(limit)
        .get()

      const { total } = await db.collection('study_history')
        .where(query)
        .count()

      return { list, total }
    }

    case 'getStreak': {
      const { data: logs } = await db.collection('daily_logs')
        .where({ _openid: OPENID })
        .orderBy('date', 'desc')
        .limit(30)
        .get()

      return { logs }
    }

    default:
      return { error: 'Unknown action' }
  }
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getTodayDate() {
  return formatDate(new Date())
}

function getDefaultTotalStats() {
  return { speakingSessions: 0, writingPieces: 0, vocabMastered: 0, streakDays: 0, totalStudyDays: 0 }
}

function getDefaultTodayStats() {
  return { speakingCount: 0, writingCount: 0, vocabLearned: 0, studyMinutes: 0 }
}

async function updateTotalStats(OPENID, type, delta) {
  const fieldMap = {
    speaking: 'speakingSessions',
    writing: 'writingPieces',
    vocab: 'vocabMastered',
    minutes: 'studyMinutes'
  }
  const field = fieldMap[type]
  if (!field) return

  const res = await db.collection('user_stats').where({ _openid: OPENID }).get()
  if (res.data.length === 0) {
    const stats = getDefaultTotalStats()
    stats[field] = delta
    await db.collection('user_stats').add({ data: { _openid: OPENID, stats } })
  } else {
    const stats = res.data[0].stats
    stats[field] = (stats[field] || 0) + delta
    await db.collection('user_stats').doc(res.data[0]._id).update({ data: { stats } })
  }
}

async function updateStreak(OPENID) {
  const { data: logs } = await db.collection('daily_logs')
    .where({ _openid: OPENID })
    .orderBy('date', 'desc')
    .get()

  const dates = logs.map(l => l.date)
  const dateSet = new Set(dates)
  const totalStudyDays = dateSet.size

  const today = getTodayDate()
  let currentDate = new Date(today)
  if (!dateSet.has(today)) {
    currentDate.setDate(currentDate.getDate() - 1)
  }

  let streak = 0
  while (dateSet.has(formatDate(currentDate))) {
    streak++
    currentDate.setDate(currentDate.getDate() - 1)
  }

  const res = await db.collection('user_stats').where({ _openid: OPENID }).get()
  if (res.data.length === 0) {
    const stats = getDefaultTotalStats()
    stats.streakDays = streak
    stats.totalStudyDays = totalStudyDays
    await db.collection('user_stats').add({ data: { _openid: OPENID, stats } })
  } else {
    const stats = res.data[0].stats
    stats.streakDays = streak
    stats.totalStudyDays = totalStudyDays
    await db.collection('user_stats').doc(res.data[0]._id).update({ data: { stats } })
  }
}

async function updateDailyStats(OPENID, type, delta) {
  const today = getTodayDate()
  const res = await db.collection('daily_logs').where({ _openid: OPENID, date: today }).get()

  const fieldMap = {
    speaking: 'speakingCount',
    writing: 'writingCount',
    vocab: 'vocabLearned',
    minutes: 'studyMinutes'
  }
  const field = fieldMap[type]
  if (!field) return

  if (res.data.length === 0) {
    const stats = getDefaultTodayStats()
    stats[field] = delta
    await db.collection('daily_logs').add({ data: { _openid: OPENID, date: today, stats } })
  } else {
    const stats = res.data[0].stats
    stats[field] = (stats[field] || 0) + delta
    await db.collection('daily_logs').doc(res.data[0]._id).update({ data: { stats } })
  }
}
