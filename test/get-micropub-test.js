const test = require('tape')
const sandbox = require('@architect/sandbox')
const arc = require('@architect/functions')
const fetch = require('node-fetch')
const { isValidURL } = require('../src/shared/utils')
const micropubUrl = 'http://localhost:3334/micropub'

test('start', async t => {
  t.plan(1)
  const result = await sandbox.start()
  t.equal(result, 'Sandbox successfully started')
})

test('set up post', async t => {
  t.plan(1)
  const data = await arc.tables()
  const post = {
    type: 'h-entry',
    channel: 'posts',
    url: '2020/10/example',
    published: '2020-10-03T17:11:06Z',
    'post-type': 'note',
    properties: {
      content: ['example'],
      category: [
        'one',
        'two'
      ],
      published: ['2020-10-03T17:11:06Z']
    }
  }
  await data.posts.put(post)
  t.ok(true, 'post created')
})

test('querying for post returns correct data', async t => {
  t.plan(1)
  const url = `${micropubUrl}?q=source&url=http://localhost:4444/2020/10/example`
  const response = await fetch(url)
  const post = await response.json()
  const found = post.properties.content[0] === 'example'
  t.ok(found, "Returns content property with value 'example'")
})

test("index returns 'Micropub endpoint'", async t => {
  t.plan(1)
  const response = await fetch(micropubUrl)
  const body = await response.text()
  t.equal(body, 'Micropub endpoint')
})

test('q=config returns config object with q key', async t => {
  t.plan(1)
  const response = await fetch(`${micropubUrl}?q=config`)
  const body = await response.json()
  t.ok(('q' in body))
})

test('q=config returns a media endpoint', async t => {
  t.plan(2)
  const response = await fetch(`${micropubUrl}?q=config`)
  const body = await response.json()
  t.ok(body['media-endpoint'], 'found media-endpoint object')
  t.ok(isValidURL(body['media-endpoint']), 'media-endpoint is a valid URL')
})

test('q=syndicate-to returns syndications', async t => {
  t.plan(3)
  const response = await fetch(`${micropubUrl}?q=syndicate-to`)
  const body = await response.json()
  t.ok(body['syndicate-to'], 'found syndicate-to object')
  t.ok(Array.isArray(body['syndicate-to']), 'syndicate-to is an array')
  t.ok(body['syndicate-to'].length > 0, 'syndicate-to is not empty')
})

test('end', async t => {
  t.plan(1)
  const result = await sandbox.end()
  t.equal(result, 'Sandbox successfully shut down')
})
