const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const { Schema } = mongoose;

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))

//db connection
mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('Connected to database');
  })
  .catch((err) => {
    console.error('Database connection error', err)
  })

//models
const userSchema = new Schema({
  username: {
    type: String,
    unique: true
  }
})

const User = mongoose.model('User', userSchema);

const exerciseSchema = new Schema({
  user_id: {
    required: true,
    type: String
  },
  description: String,
  duration: Number,
  date: {
    type: Date,
    default: new Date()
  }
})

const Exercise = mongoose.model("Exercise", exerciseSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const username = req.body.username;
  const userObj = new User({
    username: username
  })

  try {
    const user = await userObj.save();
    console.log(user);
    res.json({
      username: username,
      _id: user._id
    })
  } catch (err) {
    console.log(err)
  }
})

app.get('/api/users', (req, res) => {
  User.find({})
    .select('username _id')
    .then(users => {
      res.json(users);
    })
    .catch((err) => {
      console.log(err)
    })
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;
  try {
    const user = await User.findById(id);
    if (!user) {
      throw Error("User not found")
    } else {
      const exerciseObj = new Exercise({
        user_id: user._id,
        description,
        duration,
        date
      })
      const exercise = await exerciseObj.save();
      res.json({
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString(),
        _id: user._id
      })
    }
  } catch (error) {
    res.json({ error: error });
  }
})

//API endpoint for retrieving logs
app.get('/api/users/:_id/logs', async (req, res) => {

  const { _id } = req.params;
  const { from, to, limit } = req.query;

  const user = await User.findById(_id);
  try {
    if (!user) {
      throw new Error('User not found')
    }
    const query = { user_id: _id }
    let dateObj = {};

    if (from) {
      dateObj['$gte'] = new Date(from);
    }

    if (to) {
      dateObj['$lte'] = new Date(to)
    }

    if (from || to) {
      query.date = dateObj;
    }

    const exercises = await Exercise.find(query).limit(parseInt(limit))
    console.log(exercises);

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }))

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log
    })

  } catch (err) {
    console.log({ error: err.message })
    res.status(500).json({ error: 'Error getting logs' })
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
