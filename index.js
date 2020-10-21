const fetch = require('node-fetch')

const settings = require('ep_etherpad-lite/node/utils/Settings')
const authorManager = require('ep_etherpad-lite/node/db/AuthorManager')

exports.handleMessage = async (hook_name, ctx, cb) => {
  if (ctx.message.type === 'CLIENT_READY') {
    const token = ctx.message.token
    if (!token) {
      console.debug('ep_termin_app_integration.handleMessage: Token missing from CLIENT_READY message')
      return
    }
    const session = ctx.client.client.request.session
    const authorId = await authorManager.getAuthor4Token(token)
    authorManager.setAuthorName(authorId, session.user.username)
  }
  return cb([ctx.message])
}

exports.authenticate = async (hook_name, ctx, cb) => {
  console.debug('ep_termin_app_integration.authenticate', ctx.req.path)

  if (ctx.username && ctx.password) {
    const response = await fetch(settings.ep_termin_app_integration.api, {
      method: 'post',
      body: JSON.stringify({
        email: ctx.username,
        password: ctx.password
      }),
      headers: { 'Content-Type': 'application/json' }
    })
    const userData = await response.json()

    if (response.ok) {
      ctx.req.session.user = {
        username: userData.displayName,
        is_admin: false
      }
      return cb([true])
    } else {
      return cb([false])
    }
  } else {
    return cb([false])
  }
}
