const dotenv = require('dotenv')
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const app = express();
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');
dotenv.config()

const PORT = process.env.PORT
const secret = process.env.SECRET_KEY;
const salt = bcrypt.genSaltSync(10);

const User = require('./models/User');
const Post = require('./models/Post');


app.use(cors({ credentials: true, origin: 'https://myblogger-app.netlify.app/' }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

// mongoose connection..........................................................

mongoose.connect(process.env.DB_URL)
try {
  console.log("MongoDB Connected")

} catch (error) {
  console.log("Connection Error")

};

//sample 
app.get('/', (req, res) => {
  res.send('Welcome Back to MyBlog..🌹🌹🌹🌹🌹')

});

//User SignUp .....................................................

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    console.log(userDoc)
    res.status(200).json({ message: 'Register successfully!!', userDoc });
  } catch (e) {
    console.log(e);
    res.status(400).json({ message: 'Register failed' });
  }
});

//User Login..........................................................

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    // logged in
    jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie('token', token).json({ message: "Login Successfully!!!", id: userDoc._id, username,token });
    });
  } else {
    res.status(400).json('wrong credentials');
  }
});

//get Profile..................................................................
app.get('/profile', (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) throw err;
    res.status(200).json({message:"get profile sucessfully",info});
  });
});
//Logout.....................................................................

app.post('/logout', (req, res) => {
  res.cookie('token', '').json({ message: 'Logout Successfully!!!!' });
});
//Post.....................................................................

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split('.');
  console.log(parts)
  const ext = parts[parts.length - 1];
  const newPath = path + '.' + ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id,
    });
    res.status(200).json({message:"Posted successfully",postDoc});

  });

});

//Update Post................................................................

app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    newPath = path + '.' + ext;
    fs.renameSync(path, newPath);
  }

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { id, title, summary, content } = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json('you are not the author');
    }
    await postDoc.update({
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
    });

    res.json(postDoc);
  });

});
//Get all post.................................................................

app.get('/post', async (req, res) => {
  res.json(
    await Post.find()
      .populate('author', ['username'])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});
//Get post by id..............................................................................
app.get('/post/:id', async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate('author', ['username']);
  res.json(postDoc);
});

app.listen(PORT, () => console.log(`server started in localhost ${PORT}`))