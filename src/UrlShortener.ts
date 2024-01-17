import redaxios from 'redaxios'
import { env } from './env'

export async function createShortUrl(url: string) {
  const response = await redaxios.post(
    `https://link.webring.in.th/links`,
    { link: url },
    {
      headers: {
        'x-api-key': env.LINK_API_KEY,
      },
    },
  )
  const data = response.data
  return data.shortLink
}
