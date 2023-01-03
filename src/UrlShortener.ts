import redaxios from 'redaxios'
import { env } from './env'

export async function createShortUrl(url: string) {
  const response = await redaxios.post(
    `https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=${env.FIREBASE_API_KEY}`,
    {
      dynamicLinkInfo: {
        domainUriPrefix: 'https://webring.page.link',
        link: url,
        // analyticsInfo: {
        //   googlePlayAnalytics: {
        //     utmSource: 'webring',
        //     utmMedium: 'social',
        //     utmCampaign: 'webring-social',
        //   },
        // },
      },
      suffix: {
        option: 'SHORT',
      },
    },
  )
  const data = response.data
  return data.shortLink
}
