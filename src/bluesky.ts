import { AtpAgent } from '@atproto/api'

let _agent: AtpAgent | undefined

export async function getBlueskyClient() {
  if (_agent) return _agent
  const agent = new AtpAgent({
    service: 'https://bsky.social',
  })
  await agent.login({
    identifier: process.env.BLUESKY_USERNAME!,
    password: process.env.BLUESKY_PASSWORD!,
  })
  _agent = agent
  return agent
}
