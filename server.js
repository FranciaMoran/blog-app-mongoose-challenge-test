'use strict';

const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const { DATABASE_URL, PORT } = require('./config');
const { Author, BlogPost } = require('./models');

const app = express();

app.use(morgan('common'));
app.use(express.json());

app.get('/authors', (req, res) => {
  Author
    .find()
    .then(authors => {
      res.json(authors.map(author => {
        return {
          id: author._id,
          name: `${author.firstName} ${author.lastName}`,
          userName: author.userName
        };
      }));
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'something went terribly wrong' });
    });
});

app.get('/posts', (req, res) => {
  BlogPost
    .find()
    .then(posts => {
      res.json(posts.map(post => post.serialize()));
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'something went terribly wrong' });
    });
});

app.get('/posts/:id', (req, res) => {
  BlogPost
    .findById(req.params.id)
    .then(post => res.json(post.serialize()))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'something went horribly awry' });
    });
});

app.post('/posts', (req, res) => {
  const requiredFields = ['title', 'content', 'author_id'];
  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  }

  BlogPost
    .create({
      title: req.body.title,
      content: req.body.content,
      author: req.body.author
    })
    .then(blogPost => res.status(201).json(blogPost.serialize()))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong' });
    });

});

app.post('/authors', (req, res) => {
  const requiredFields = ['firstName', 'lastName', 'userName'];
  requiredFields.forEach(field => {
    if (!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  });


app.delete('/posts/:id', (req, res) => {
  BlogPost
    .findByIdAndRemove(req.params.id)
    .then(() => {
      res.status(204).json({ message: 'success' });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'something went terribly wrong' });
    });
});


app.put('/posts/:id', (req, res) => {
  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    res.status(400).json({
      error: 'Request path id and request body id values must match'
    });
  }

  const updated = {};
  const updateableFields = ['title', 'content', 'author'];
  updateableFields.forEach(field => {
    if (field in req.body) {
      updated[field] = req.body[field];
    }
  });

  BlogPost
    .findByIdAndUpdate(req.params.id, { $set: updated }, { new: true })
    .then(updatedPost => res.status(204).end())
    .catch(err => res.status(500).json({ message: 'Something went wrong' }));
});

app.put('/authors/:id', (req, res) => {
  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    res.status(400).json({
      error: 'Request path id and request body id values must match'
    });
  }

  const updated = {};
  const updateableFields = ['firstName', 'lastName', 'userName'];
  updateableFields.forEach(field => {
    if (field in req.body) {
      updated[field] = req.body[field];
    }
  });

  Author
    .findOne({ userName: updated.userName || '', _id: !{req.params.id}  })
    .then(author => {
      if(author) {
        const message = `Username taken`;
        console.error(message);
        return res.status(400).send(message);
      }
      else {
        Author
          .findByIdAndUpdate(req.params.id, { $set: updated }, { new: true })
          .then(updatedAuthor => {
            res.status(200).json({
              id: updatedAuthor.id,
              name: `${updatedAuthor.firstName} ${updatedAuthor.lastName}`,
              userName: updatedAuthor.userName
            });
          })
          .catch(err => res.status(500).json({ message: err }));
      }
    });
});

app.delete('/authors/:id', (req, res) => {
  BlogPost
  .remove({author: req.params.id})





})

app.delete('/:id', (req, res) => {
  BlogPost
    .findByIdAndRemove(req.params.id)
    .then(() => {
      console.log(`Deleted blog post with id \`${req.params.id}\``);
      res.status(204).end();
    });
});


app.use('*', function (req, res) {
  res.status(404).json({ message: 'Not Found' });
});


let server;


function runServer(databaseUrl, port = PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(databaseUrl, err => {
      if (err) {
        return reject(err);
      }
      server = app.listen(port, () => {
        console.log(`Your app is listening on port ${port}`);
        resolve();
      })
        .on('error', err => {
          mongoose.disconnect();
          reject(err);
        });
    });
  });
}

// this function closes the server, and returns a promise. we'll
// use it in our integration tests later.
function closeServer() {
  return mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.log('Closing server');
      server.close(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

// if server.js is called directly (aka, with `node server.js`), this block
// runs. but we also export the runServer command so other code (for instance, test code) can start the server as needed.
if (require.main === module) {
  runServer(DATABASE_URL).catch(err => console.error(err));
}

module.exports = { runServer, app, closeServer };
