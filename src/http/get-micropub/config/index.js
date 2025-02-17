const syndicateTo = require('./syndicate-to')
const category = require('./category')
const postTypes = require('./post-types')

const channels = [
  {
    uid: 'posts',
    name: 'Posts'
  },
  {
    uid: 'pages',
    name: 'Pages'
  }
]

const q = [
  'syndicate-to',
  'config',
  'source',
  'post-types',
  'category',
  'channels'
]

const config = {
  'media-endpoint': process.env.MEDIA_ENDPOINT_URL,
  'post-types': postTypes,
  'syndicate-to': syndicateTo(),
  channels,
  q
}

module.exports = {
  q,
  config,
  syndicateTo,
  category,
  channels
}
