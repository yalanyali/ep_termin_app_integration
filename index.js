const fetch = require('node-fetch')
const authorManager = require('ep_etherpad-lite/node/db/AuthorManager')

const API_URL = process.env.TERMIN_APP_API_URL

exports.authenticate = async (hookName, ctx, cb) => {

  const { username, password } = ctx

  if (!username || !password) {
    console.warn('ep_termin_app_integration.authenticate: Failed authentication, no auth data')
    return cb([false])
  }

  const response = await fetch(API_URL, {
    method: 'post',
    body: JSON.stringify({
      username,
      password
    }),
    headers: { 'Content-Type': 'application/json' }
  })

  if (response.ok) {
    const userData = await response.json()
    ctx.req.session.user = {
      username: userData.displayName,
      is_admin: false
    }
    return cb([true])
  } else {
    return cb([false])
  }
}

exports.handleMessage = async (hookName, ctx) => {
  if (ctx.message.type === 'CLIENT_READY') {
    const token = ctx.message.token
    if (!token) {
      console.debug('ep_termin_app_integration.handleMessage: Token missing from CLIENT_READY message')
      return
    }
    const session = ctx.client.client.request.session
    try {
      const authorId = await authorManager.getAuthor4Token(token)
      authorManager.setAuthorName(authorId, session.user.username)
    } catch (err) {
      console.debug('ep_termin_app_integration.handleMessage: No authorId found.')
    }
  }
}
