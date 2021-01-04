const fetch = require('node-fetch')

const express = require('../../src/node_modules/express')
const eejs = require('ep_etherpad-lite/node/eejs')
const authorManager = require('ep_etherpad-lite/node/db/AuthorManager')

const API_URL = process.env.TERMIN_APP_API_URL

exports.expressConfigure = function (hook_name, args, cb) {
  args.app.use(express.json())
  args.app.use(express.urlencoded({ extended: true }))

  args.app.post('/login', function (req, res) {
    console.warn('POST REQUEST', req.body)
    res.redirect(req.query.redirect || '/')
  })

  cb()
}

exports.preAuthorize = (hook_name, ctx, cb) => {
  if (ctx.req.method === 'POST') {
    console.warn('preAuth for ', ctx.req)
    if (ctx.req.path.startsWith('/login')) return cb([true])
  }
  if (ctx.req.path.startsWith('/static')) return cb([true])
  console.warn('FAILED PREAUTH', ctx.req.is('application/x-www-form-urlencoded'))
  return cb([])
}

exports.authenticate = async (hook_name, ctx, cb) => {
  console.warn('ep_termin_integration.authenticate', ctx.req.path)

  if (!ctx.req.is('application/x-www-form-urlencoded')) {
    console.warn('ep_termin_integration.authenticate: Failed authentication no auth form data')
    return cb([false])
  }

  const { email, password } = ctx.req.body

  console.warn('HEADERS: ', email, password)

  const response = await fetch(API_URL, {
    method: 'post',
    body: JSON.stringify({
      email,
      password
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
}

exports.authnFailure = function (hook_name, context, cb) {
  console.warn('ep_termin_integration.authFailure')

  const renderArgs = {
    style: eejs.require('ep_termin_integration/templates/style.ejs', {}),
    invalidCredentials: !!context.req.session.invalidCredentials,
    redirect: context.req.query.redirect || context.req.path || '',
    user: context.req.session ? (context.req.session.user || null) : null
  }

  context.res.send(eejs.require('ep_termin_integration/templates/login.ejs', renderArgs))

  cb([true])
}

exports.handleMessage = async (hook_name, ctx, cb) => {
  if (ctx.message.type === 'CLIENT_READY') {
    const token = ctx.message.token
    if (!token) {
      console.warn('ep_termin_integration.handleMessage: Token missing from CLIENT_READY message')
      return
    }
    const session = ctx.client.client.request.session
    const authorId = await authorManager.getAuthor4Token(token)
    authorManager.setAuthorName(authorId, session.user.username)
  }
  return cb([ctx.message])
}
