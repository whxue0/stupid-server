
const mongoose = require('mongoose')

mongoose.connect('mongodb://localhost:27017/stupid'
  ,{ useUnifiedTopology: true,
     useNewUrlParser: true, 
     useFindAndModify: false,
     useCreateIndex: true 
    }
)

const conn = mongoose.connection

conn.on('connected', function() {
    console.log('connect success')
})

const userSchema = mongoose.Schema({
    username: {type:String, required: true, unique: true},
    password: {type: String, required: true},
    nickname: {type: String, required: true},
    faith: {type:String, default: '无'},
    tag: {type:[String]},
    sex: {type:Number, default: 0},
    intro: {type:String, default: '我是个傻瓜！'},
    avatar: {type:String, default: '/images/avatar/default.jpg'}
})
const UserModel = mongoose.model('user', userSchema)
exports.UserModel = UserModel


const chatSchema = mongoose.Schema({
  from: {type: String, required: true},     // 发送用户的id
  to: {type: String, required: true},       // 接收用户的id
  chat_id: {type: String, required: true},  // from和to组成的字符串
  content: {type: String, required: true},  // 内容
  read: {type:Boolean, default: false},     // 标识是否已读
  create_time: {type: Number}               // 创建时间
})
const ChatModel = mongoose.model('chat', chatSchema) // 集合为: chats
exports.ChatModel = ChatModel

const postSchema = mongoose.Schema({
  owner: String,
  create_time: String,
  content: String,
  photo:[String],
  comment:[{
      cuser: String,
      time: Date,
      text: String
  }],
})
const PostModel = mongoose.model('post', postSchema)
exports.PostModel = PostModel

