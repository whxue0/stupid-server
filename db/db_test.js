const md5 = require('blueimp-md5')

const mongoose = require('mongoose')

mongoose.connect('mongodb://localhost:27017/stupid'
  ,{ useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false,useCreateIndex:true })

const conn = mongoose.connection
conn.on('connected', function(){
    console.log('connect success')
})

const userSchema = mongoose.Schema({
    username: {type:String, required: true, unique: true},
    password: {type: String, required: true},
    nickname: {type: String, required: true},
    faith: {type:String},
    tag: {type:[String]},
    intro: {type:String},
    avatar: {type:String, default: '/images/avatar/default.jpg'}
})

const UserModel = mongoose.model('user', userSchema)

function testSave() {
    const user = {
        username: 'xiaoming',
        password: md5('1234'),
        nickname: '小明'
    }

    const userModel = new UserModel(user)

    userModel.save(function(err, user) {
        console.log('save', err, user);
    })
}

//testSave()

function testFind() {
    UserModel.find(function(err, users) {
        console.log('find()', err, users)
    })

    UserModel.findOne({_id: "604370f1c95c0b2158b485e4"}, function (err, user) {
        console.log('findOne()', err ,user)
    })
}

//testFind()

function testUpdate() {
    UserModel.findByIdAndUpdate({_id: "604370f1c95c0b2158b485e4"}, {nickname: '小红'}, function(err, user) {
        console.log('findByIdAndUpdate()', err, user)
    })
}

//testUpdate()

function testDelete() {
    UserModel.remove({_id: "604370f1c95c0b2158b485e4"}, function(err, result) {
        console.log('remove()', err , result);
    })
}

testDelete()