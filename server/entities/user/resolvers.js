import User from './model'
import userApi from './api'
import mail from '../../mail'
import bcrypt from 'bcrypt'
import config from '../../../config'
import { GraphQLError } from 'graphql/error'
import activemail from '../../maillayout/activemail'

const DOMAIN = config.isLocal ? 'http://localhost:3000' : config.domain
const SALT_WORK_FACTOR = 1
class newError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}
const Query = {
  currentUser(obj, args, context, info) {
    const { ctx } = context
    return ctx.state.user
  },

  async user(obj, args) {
    const { username } = args
    const user = await User.findOne({ username }).exec()
    return user
  }
}

const Mutation = {
  async login(obj, args, context, info) {
    const { ctx } = context
    ctx.request.body = args

    //validate is_active
    const { username } = args
    const email = username
    let user = await User.findOne({
      $or: [{ username }, { email }]
    })
    if (!user) {
      throw '未找到此用户'
    }
    if (user.is_active == 0 && Date.now() > user.active_deadline) {
      const error = new GraphQLError(
        '该用户未激活,激活邮件已失效,请重新发送',
        null,
        null,
        null,
        null,
        null,
        {
          code: '223'
        }
      )
      throw error
    } else if (user.is_active == 0 && Date.now() < user.active_deadline) {
      throw '该用户未激活,请在注册邮箱中查看激活邮件'
    } else if (user.is_active == 1) {
      console.log(args)
      user = await userApi.authenticate('local')(ctx)
    }
    return user
  },

  async signup(obj, args, context, info) {
    const { username, email, password } = args

    let user = await User.findOne({
      $or: [{ username }, { email }]
    }).exec()

    if (user) {
      throw '该用户名或邮箱已存在。'
    } else {
      user = new User({ username, email, password })
      const { ctx } = context

      // Add username and password to request body because
      // passport needs them for authentication
      ctx.request.body = args

      user = await user.save()

      //save activeInfo
      const salt = await bcrypt.genSalt(SALT_WORK_FACTOR)
      const active_hash_code = await bcrypt.hash(
        user.username + Date.now().toString(),
        salt
      )
      const active_deadline = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await User.findOneAndUpdate(
        { username: user.username },
        { active_code: active_hash_code, active_deadline: active_deadline },
        { new: true },
        function(err, doc) {
          if (err) {
            console.log('Error:' + err)
          } else {
            user = doc
          }
        }
      ).exec()
      const activeurl = DOMAIN + '/active?username='
      user.username + '&active=' + user.active_code + ''
      await mail.send({
        to: user.email,
        subject: '帐号激活',
        html: activemail(activeurl)
      })
      return user
    }
  },

  logout(obj, args, context, info) {
    const { ctx } = context
    const user = ctx.state.user
    ctx.logout()
    console.log(user)
    return user
  },

  async sendmail(obj, args, context, info) {
    const { email } = args
    let user = await User.findOne({ email }).exec()
    if (user.is_active !== 0) {
      throw '此邮箱已经激活'
    } else {
      const salt = await bcrypt.genSalt(SALT_WORK_FACTOR)
      const active_hash_code = await bcrypt.hash(
        user.username + Date.now().toString(),
        salt
      )
      const active_deadline = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await User.findOneAndUpdate(
        { username: user.username },
        { active_code: active_hash_code, active_deadline: active_deadline },
        { new: true },
        function(err, doc) {
          if (err) {
            console.log('Error:' + err)
          } else {
            user = doc
          }
        }
      ).exec()
      const activeurl = DOMAIN + '/active?username='
      user.username + '&active=' + user.active_code + ''
      await mail.send({
        to: user.email,
        subject: '帐号激活',
        html: activemail(activeurl)
      })
    }
    return user
  },

  async active(obj, args, context, info) {
    //active mail
    const { username, active_code } = args
    let user = await User.findOne({ username }).exec()
    if (
      user.active_code == active_code &&
      Date.now() < user.active_deadline &&
      user.is_active == 0
    ) {
      //active success
      await User.findOneAndUpdate(
        { username: user.username },
        { is_active: 1 },
        { new: true },
        function(err, doc) {
          if (err) {
            console.log('Error:' + err)
          } else {
            user = doc
          }
        }
      ).exec()
      return user
    } else if (user.is_active == 1) {
      throw '此账户为已激活账户,请登陆'
    } else if (
      user.active_code == active_code ||
      Date.now() > user.active_deadline
    ) {
      const error = new GraphQLError(
        '该用户未激活,激活邮件已失效,请重新发送',
        null,
        null,
        null,
        null,
        null,
        {
          code: '223'
        }
      )
      throw error
    } else if (user.active_code !== active_code) {
      throw '此链接未通过验证,请检查链接地址是否正确'
    }
  }
}

export default {
  Query,
  Mutation
}
