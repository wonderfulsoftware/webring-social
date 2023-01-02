import redaxios from 'redaxios'
import { z } from 'zod'
import { createHash } from 'crypto'
import { Resource, createResourceType } from './Resource'
import { env } from './env'
import { reconciler } from './Reconciler'

const feedItemSchema = z.object({
  site: z.string(),
  title: z.string(),
  url: z.string(),
  published: z.string(),
})
const feedSchema = z.array(feedItemSchema)

const ShortenedUrl = createResourceType<{ url: string }, { shortLink: string }>(
  async (state, spec) => {
    const response = await redaxios.post(
      `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${env.FIREBASE_API_KEY}`,
      {
        dynamicLinkInfo: {
          domainUriPrefix: 'https://webring.page.link',
          link: spec.url,
        },
        suffix: {
          option: 'SHORT',
        },
      },
    )
    const data = response.data
    return { shortLink: data.shortLink }
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
  async publish(dryRun: boolean) {
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

    const feedData = feedSchema.parse(feed.data)
    const resources = feedData.flatMap((item): Resource[] => {
      if (item.published < '2023') return []
      const urlHash = hashUrl(item.url)
      return [
        MastodonPost.create({
          key: `${urlHash}:mastodon`,
          spec: {
            url: item.url,
            title: `${item.title} [${item.site}]`,
          },
          description: `Mastodon post for ${item.url}`,
        }),
      ]
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
