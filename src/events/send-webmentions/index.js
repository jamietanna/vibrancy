const arc = require('@architect/functions')
const cheerio = require('cheerio')
const fetch = require('node-fetch')
const logger = require('@architect/shared/logger')
const { isValidURL } = require('@architect/shared/utils')

const SYNDICATION_LOOKUP_RETRIES = 5

const denyListHosts = [
  'twitter.com',
  'mobile.twitter.com',
  'maps.google.com',
  'pca.st',
  'github.com',
  'res.cloudinary.com',
  'www.swarmapp.com'
]

const syndicatedUrlsReturnedHosts = [
  'brid.gy',
  'news.indieweb.org',
]

async function findLinks (url) {
  const response = await fetch(url)
  const content = await response.text()
  const $ = cheerio.load(content)
  // find all <a> tags inside h-entry
  const allLinks = []
  $('.h-entry a').each((_, tag) => {
    allLinks.push($(tag).attr('href'))
  })
  // filter out invalid links
  const links = allLinks.filter(link =>
    link.startsWith('http') &&
    !link.startsWith('http://localhost') &&
    isValidURL(link)
  )
  logger.info(`Found ${links.length} link(s) at ${url}`, links.join('\n'))
  return links
}

async function sendWebmention (postUrl, source, target) {
  if (!process.env.TELEGRAPH_TOKEN) return

  // don't try to send webmentions to hosts we know can't receive them
  const host = new URL(target).host
  if (denyListHosts.includes(host)) return

  const response = await fetch('https://telegraph.p3k.io/webmention', {
    method: 'post',
    body: new URLSearchParams({
      token: process.env.TELEGRAPH_TOKEN,
      source,
      target
    })
  })
  const json = await response.json()
  const message = JSON.stringify(json, null, 2)
  if (response.ok) {
    logger.info(`Queued webmention with Telegraph from ${source} to ${target}`, message)
    updatePostWithSyndication(postUrl, target, json.location)
  } else {
    logger.error(`Error received from Telegraph for ${source} to ${target}`, message)
  }
}

async function updatePostWithSyndication(postUrl, target, statusUrl) {
  const data = await arc.tables()
  const post = await data.posts.get(postUrl)

  // don't try to update syndication links for hosts that don't support them
  const host = new URL(target).host
  if(!syndicatedUrlsReturnedHosts.includes(host)) return

  logger.info(`Attempting to retrieve information for ${postUrl}'s syndication to ${target} via ${statusUrl}`)

  const url = retrieveStatusUrl(statusUrl)

  if (url) {
    // once it's syndicated, replace the syndication link with the syndicated link
    const index = post.properties.syndication.indexOf(target)
    if (index !== -1) {
      post.properties.syndication[index] = url
    }
  } else {
    logger.info('No syndicated URL could be retrieved from the Webmention result')
  }
}

async function retrieveStatusUrl(statusUrl) {
  for (var i = 0, len = SYNDICATION_LOOKUP_RETRIES; i < len; i++) {
    var response = await fetch(statusUrl)
    var json = await response.json()

    // some hosts are returning the URL in the response body's `url` property
    if (json.url && isValidURL(json.url)) {
      return json.url
    }

    // if Telegraph doesn't provide a status URL after a poll, we shouldn't try it again
    if (!json.location) {
      break
    }

    await sleep(5)
  }

  return null
}

async function sleep(seconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

exports.handler = async function subscribe (event) {
  const body = JSON.parse(event.Records[0].Sns.Message)
  const url = // new URL(body.url, process.env.ROOT_URL).href
    'https://www.jvt.me/mf2/2021/07/zhh06/'
  const links = await findLinks(url)
  for (const link of links) {
    await sendWebmention(body.url, url, link)
  }
}
