var express = require('express');
var router = express.Router();

const md5 = require('blueimp-md5')

const UserModel = require('../db/models').UserModel
const ChatModel = require('../db/models').ChatModel
const PostModel = require('../db/models').PostModel

const filter = {password: 0, __v: 0}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


//注册
//请求：username，password，nickname
//响应：
//    用户存在：{code: 1, msg: '此用户已存在'}
//    用户为存在：{code: 0, data: {_id: user._id}}
router.post('/register', function(req, res, next) {
  const {username, password, nickname} = req.body
  UserModel.findOne({username}, function(err, user) {
    if(user) {
      res.send({code: 1, msg: '此用户已存在'})
    } else {
      new UserModel({username, password: md5(password), nickname}).save(function (err, user) {
        res.cookie('userid', user._id, {maxAge: 1000*60*24*7})
        //const data = {nickname, _id: user._id} 
        user.password = null;
        res.send({code: 0, data: user})
      })
    }
  })
})

//登录
//请求：username，password
//响应：
router.post('/login', function(req, res) {
  const {username, password} = req.body
  UserModel.findOne({username, password: md5(password)}, {password:0, __v: 0}, function(err, user) {
    if(!user) {
      res.send({code: 1, msg: '用户名或密码错误'})
    } else {
      res.cookie('userid', user._id, {maxAge: 1000*60*60*24*7})
      res.send({code: 0, data: user})
    }
  })
})

//获取个人信息
router.get('/getUser', function(req, res) {
  //登录判断
  const userid = req.cookies.userid
  if(!userid) {
    return res.send({code: 1, msg: '请先登录'})
  }
  //查询数据库中的用户数据,过滤password
  UserModel.findById({_id: userid}, filter)
  .then(
    user => {
      //返回用户数据
      res.send({
        data: user,
        code: 0
      })
    },
    err => console.log(err)
  )
})

// 获取用户列表
router.get('/userList', function (req, res) {
  //登录判断
  const userid = req.cookies.userid
  if(!userid) {
    return res.send({code: 1, msg: '请先登录'})
  }
  UserModel.find({_id: {$ne: userid}}, filter, function (error, users) {
    res.send({code: 0, data: users})
  })
})

//更新个人信息
router.post('/updateUser', function(req, res) {
  //登录判断
  const userid = req.cookies.userid
  if(!userid) {
    return res.send({code: 1, msg: '请先登录'})
  }
  //新头像判断，将前端传来的base64图片编码转换成文件并存储到指定位置
  const base64 = req.body.fileURL
  let newPath = "";
  if(base64) {
    const fileName = Date.parse(new Date()) + req.body.fileName
    const path = './public/uploads/avatar/'+ fileName
    newPath = `/api/uploads/avatar/` + fileName
    base64Data = base64.replace(/^data:image\/jpeg;base64,/,"")
    binaryData =  Buffer.from(base64Data, 'base64').toString('binary');
    require("fs").writeFile( path, binaryData, "binary", function(err) {
        console.log(err); // writes out file without error, but it's not a valid image
    });
  }else{
    newPath = req.body.avatar
  }
  //更新数据库中的用户数据
  UserModel.findByIdAndUpdate({_id: userid}, {
    $set:{
      nickname: req.body.newNickname,
      faith: req.body.newFaith,
      intro: req.body.newIntro,
      tag: req.body.newTag,
      sex: req.body.newSex,
      avatar: newPath
    }
  },
  {new: true}
  )
  .then(
    //返回新数据对象
    data => {
      data.password = null
      res.send({code:0, data});
    },
    err => console.log(err)
  )
})


//发帖
router.post('/createPost', (req, res) => {
  //登录判断
  const userid = req.cookies.userid
  if(!userid) {
    return res.send({code: 1, msg: '请先登录'})
  }
  //图片列表判断，将前端传来的base64图片编码转换成文件并存储到指定位置
  const base64List = req.body.urlList
  const fileList = req.body.nameList
  const photoPathList = [];
  if(base64List.length > 0) {
    for(let i = 0 ; i<base64List.length; i++) {
      const fileName = Date.parse(new Date()) + fileList[i]
      const path = './public/uploads/photo/'+ fileName
      photoPathList.push('/api/uploads/photo/' + fileName)
      base64Data = base64List[i].replace(/^data:image\/jpeg;base64,/,"")
      binaryData =  Buffer.from(base64Data, 'base64').toString('binary');
      require("fs").writeFile( path, binaryData, "binary", function(err) {
          console.log(err); // writes out file without error, but it's not a valid image
      });
    }
  }
  PostModel.create({
      owner: userid,
      create_time: new Date(),
      content: req.body.content,
      comment: [],
      photo: photoPathList
  })
  .then(post => {
      console.log(post);
      res.send({code: 0, data: post})
  })
  .catch(err => {
      res.send(err)
  })
})

//上拉刷新 或 首次加载 获取最新帖子
router.get('/getPost', (req, res) => {
  //登录判断
  const userid = req.cookies.userid
  if(!userid) {
    return res.send({code: 1, msg: '请先登录'})
  }
  //PostModel.find().sort({_id: -1}).limit(10)
  PostModel.find().sort({_id: -1})
  .then(postList => {
      //获取当前帖子总数
      //const count = await PostModel.countDocuments()
      res.send({code: 0, data : postList});
  })
  .catch(err => {
      res.send(err);
  })
})

//评论贴
router.post('/commentPost', (req, res) => {
  //登录判断
  const userid = req.cookies.userid
  if(!userid) {
    return res.send({code: 1, msg: '请先登录'})
  }
  //找到要评论的帖子
  PostModel.findOne({_id: req.body.postid}, {comment: 1})
  .then(obj => {
      //生成评论对象
      const commentObj = {
          cuser: userid,
          text: req.body.text,
          time: new Date()
      }
      obj.comment.push(commentObj)
      //更新帖子评论
      Post.updateOne({_id: req.body.postid}
          , {$set: {
              comment: obj.comment
          }
      })
      .then(post => {
          console.log('评论成功');
          res.send(post);
      })
      .catch(err => {
          console.log(err);
          res.send(err);
      })
  })
})

//删帖
router.post('/deletePost', (req, res) => {
  //登录判断
  const userid = req.cookies.userid
  if(!userid) {
    return res.send({code: 1, msg: '请先登录'})
  }
  PostModel.deleteOne({
    _id: req.body.postid,
    owner: userid
  })
  .then(post => {
      console.log(post);
      res.send('ok')
  })
  .catch(err => {
      res.send(err)
  })
})

//下拉获取更多帖子
router.post('/getMore', (req, res) => {
  //登录判断
  const userid = req.cookies.userid
  if(!userid) {
    return res.send({code: 1, msg: '请先登录'})
  }
  //原来的帖子数
  const oldCount = parseInt(req.body.count);
  //此时下拉的次数
  const downFlesh = parseInt(req.body.downFlesh);
  //计算出需要跳过的帖子数
  const skipCount = oldCount - 10 - 5 * (downFlesh + 1); 
  if (skipCount >= 0){
    //管道过滤前面的帖子
    PostModel.aggregate([
          {$skip: skipCount},
          {$limit: 5},
          {$sort: {_id: -1}}
      ])
      .then(async postList => {
          for(let i = 0 ; i<postList.length; i++) {
            const owner = postList[i].owner;
            //删除对象的owner属性
            delete postList[i].owner;
            //为每个帖子添加owner的头像和昵称
            const user = await UserModel.findOne({_id:owner})
            if(user) {
              postList[i].avatar = avatar;
              postList[i].nickname = nickname;
            }
          }
          res.send({postList});
      }) 
      .catch(err => {
          res.send(err)
      })
  } else {
      res.send({
          postList: []
      })
  }

})

//获取我的贴
router.get('/getMinePost', (req, res) => {
  //登录判断
  const userid = req.cookies.userid
  if(!userid) {
    return res.send({code: 1, msg: '请先登录'})
  }
  PostModel.find({owner: userid}).then(
    postList => {
      res.send({postList})
    },
    err => {
      res.send(err)
    }
  )
})

//获取其他人的贴
router.get('/getOtherPost',(req, res) => {
    //登录判断
    const userid = req.cookies.userid
    if(!userid) {
      return res.send({code: 1, msg: '请先登录'})
    }
    UserModel.findOne({username: req.query.username},{_id: 1})
    .then(
      user => {
        const ownerid = user._id;
        PostModel.find({owner: ownerid},{owner: 0}).then(
          postList => {
            res.send({postList})
          },
          err => {
            res.send(err)
          }
        )
      },
      err => console.log(err)
    )
})


//上传一张图片
// router.post('/upload', (req, res) => {
//   const base64 = req.body.url
//   const fileName = Date.parse(new Date()) + req.body.fileName
//   const path = './public/uploads/avatar/'+ fileName
//   const newPath = 'http://localhost:4000/uploads/avatar/' + fileName
//   base64Data = base64.replace(/^data:image\/png;base64,/,"")
//   binaryData =  Buffer.from(base64Data, 'base64').toString('binary');
//   require("fs").writeFile( path, binaryData, "binary", function(err) {
//       console.log(err); // writes out file without error, but it's not a valid image
//   });
//   res.send(newPath)
// })



/*
获取当前用户所有相关聊天信息列表
 */
router.get('/msglist', function (req, res) {
  // 获取cookie中的userid
  const userid = req.cookies.userid
  // 查询得到所有user文档数组
  UserModel.find(function (err, userDocs) {
    const users = userDocs.reduce((users, user) => {
      users[user._id] = {nickname: user.nickname, avatar: user.avatar}
      return users
    } , {})
    ChatModel.find({'$or': [{from: userid}, {to: userid}]}, filter, function (err, chatMsgs) {
      // 返回包含所有用户和当前用户相关的所有聊天消息的数据
      res.send({code: 0, data: {users, chatMsgs}})
    })
  })
})

/*
修改指定消息为已读
 */
router.post('/readmsg', function (req, res) {
  // 得到请求中的from和to
  const from = req.body.from
  const to = req.cookies.userid
  ChatModel.update({from, to, read: false}, {read: true}, {multi: true}, function (err, doc) {
    console.log('/readmsg', doc)
    res.send({code: 0, data: doc.nModified}) // 更新的数量
  })
})



module.exports = router;
