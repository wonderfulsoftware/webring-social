import 'dotenv/config'
import { z } from 'zod'

export const env = z
  .object({
    MASTODON_ACCESS_TOKEN: z.string(),
    FIREBASE_API_KEY: z.string(),
    FACEBOOK_PAGE_ACCESS_TOKEN: z.string(),
  })
  .parse(process.env)
