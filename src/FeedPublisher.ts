import redaxios from 'redaxios'
import { z } from 'zod'
import { createHash } from 'crypto'
import { Resource, createResourceType } from './Resource'
import { env } from './env'
import { reconciler } from './Reconciler'
import { createShortUrl } from './UrlShortener'
import { partition, sortBy } from 'lodash-es'

const feedItemSchema = z.object({
  site: z.string(),
  title: z.string(),
  url: z.string(),
  published: z.string(),
})
const feedSchema = z.array(feedItemSchema)

const ShortenedUrl = createResourceType<{ url: string }, { shortLink: string }>(
  async (state, spec) => {
    return { shortLink: await createShortUrl(spec.url) }
  },
)

const shortenUrl = async (url: string) => {
  const urlHash = hashUrl(url)
  const state = await reconciler.reconcile(
    ShortenedUrl.create({
      key: `${urlHash}:shorturl`,
      spec: { url },
      description: `Short URL for ${url}`,
    }),
  )
  return state.shortLink
}

export class FeedPublisher {
  async publish(dryRun: boolean, socials?: string[]) {
    const shouldPostTo = (social: string) =>
      !socials || socials.includes(social)
    const feed = await redaxios.get(
      'https://wonderfulsoftware.github.io/webring-site-data/feed.json',
    )

    let reconciled = false

    const MastodonPost = createResourceType<
      { url: string; title: string },
      { id: string; url: string }
    >(async (state, spec) => {
      if (state) return state
      const shortUrl = await shortenUrl(spec.url)
      const response = await redaxios.post(
        'https://mastodon.in.th/api/v1/statuses',
        { status: spec.title + '\n\n' + shortUrl },
        { headers: { Authorization: `Bearer ${env.MASTODON_ACCESS_TOKEN}` } },
      )
      const data = response.data
      reconciled = true
      return { id: data.id, url: data.url }
    })

    const FacebookPost = createResourceType<
      { url: string; title: string },
      { id: string; url: string }
    >(async (state, spec) => {
      if (state) return state
      const shortUrl = await shortenUrl(spec.url)
      const response = await redaxios.post(
        `https://graph.facebook.com/v15.0/me/feed?access_token=${env.FACEBOOK_PAGE_ACCESS_TOKEN}&fields=id,permalink_url`,
        { message: spec.title, link: shortUrl },
      )
      const data = response.data
      reconciled = true
      return { id: data.id, url: data.permalink_url }
    })

    const feedData = feedSchema.parse(feed.data)
    const resources = selectAndSortFeed(feedData)
      .flatMap((item): typeof item[] => {
        // Fix malformed URLs in some feeds
        item.url = item.url.replace(
          /^(https:\/\/microbenz\.in\.th)([^/])/,
          '$1/$2',
        )
        return [item]
      })
      .flatMap((item): Resource[] => {
        const urlHash = hashUrl(item.url)
        const out: Resource[] = []
        if (shouldPostTo('mastodon')) {
          out.push(
            MastodonPost.create({
              key: `${urlHash}:mastodon`,
              spec: {
                url: item.url,
                title: `${item.title} [${item.site}]`,
              },
              description: `Mastodon post for ${item.url}`,
            }),
          )
        }
        if (shouldPostTo('facebook')) {
          out.push(
            FacebookPost.create({
              key: `${urlHash}:facebook`,
              spec: {
                url: item.url,
                title: `${item.title} [${item.site}]`,
              },
              description: `Facebook post for ${item.url}`,
            }),
          )
        }
        return out
      })

    for (const resource of resources) {
      await reconciler.reconcile(resource, dryRun)
      if (reconciled) break
    }
  }
}
function hashUrl(url: string) {
  return createHash('md5').update(url).digest('hex')
}
function selectAndSortFeed<X extends { published: string }>(feed: X[]): X[] {
  const items = feed.filter((item) => item.published >= '2022-12')
  const [before2023, after2023] = partition<X>(
    items,
    (item) => item.published < '2023',
  ) as [X[], X[]]
  return [
    ...sortBy(after2023, (item) => item.published),
    ...sortBy(before2023, (item) => item.published).reverse(),
  ]
}
