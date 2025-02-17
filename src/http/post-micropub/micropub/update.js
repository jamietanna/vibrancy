const arc = require('@architect/functions')

function verifyObjectNotArray (properties, key) {
  if (!(typeof properties[key] === 'object' &&
    !Array.isArray(properties[key]))) {
    throw new Error(
      `Invalid request: the '${key}' property should be an object`
    )
  }
}

function verifyArrayOrObject (properties, key) {
  if (!(typeof properties[key] === 'object')) {
    throw new Error(
      `Invalid request: the '${key}' property should be an array of object`
    )
  }
}

async function update (properties) {
  const data = await arc.tables()
  const url = properties.url.replace(process.env.ROOT_URL, '')
  const post = await data.posts.get({ url })

  try {
    if ('replace' in properties) {
      verifyObjectNotArray(properties, 'replace')
      for (const prop in properties.replace) {
        post.properties[prop] = properties.replace[prop]
      }
    }
    if ('add' in properties) {
      verifyObjectNotArray(properties, 'add')
      for (const prop in properties.add) {
        if (!(prop in post.properties)) {
          post.properties[prop] = properties.add[prop]
        } else {
          post.properties[prop] = post.properties[prop].concat(
            properties.add[prop])
        }
      }
    }
    if ('delete' in properties) {
      verifyArrayOrObject(properties, 'delete')
      if (!Array.isArray(properties.delete)) {
        for (const prop in properties.delete) {
          post.properties[prop] = post.properties[prop].filter(
            (p) => p != properties.delete[prop]) // eslint-disable-line
          if (post.properties[prop].length === 0) {
            delete post.properties[prop]
            delete post[prop]
          }
        }
      } else {
        properties.delete.forEach(prop => {
          delete post.properties[prop]
          delete post[prop]
        })
      }
    }
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'invalid_request',
        error_description: e.message
      })
    }
  }

  post.properties.updated = [new Date().toISOString()]

  return {
    post,
    statusCode: 204
  }
}

module.exports = update
