import {
  AppBskyActorDefs,
  AppBskyGraphDefs,
  AtpAgent,
  AtUri,
} from '@atproto/api'
import { resolveTxt } from 'dns/promises'
import * as process from 'process'
import redaxios from 'redaxios'

// Create a Bluesky Agent
const agent = new AtpAgent({
  service: 'https://bsky.social',
})
const listUri =
  'at://did:plc:ecwx33hml33k454othdgdg5i/app.bsky.graph.list/3l7kuilcstu2z'

async function getListMembers() {
  let cursor: string | undefined
  let members: AppBskyGraphDefs.ListItemView[] = []
  do {
    let res = await agent.app.bsky.graph.getList({
      list: listUri,
      limit: 100,
      cursor,
    })
    cursor = res.data.cursor
    members = members.concat(res.data.items)
  } while (cursor)
  return members
}

async function getFollowing() {
  let cursor: string | undefined
  let followings: AppBskyActorDefs.ProfileView[] = []
  do {
    let res = await agent.app.bsky.graph.getFollows({
      actor: 'webring.in.th',
      limit: 100,
      cursor,
    })
    cursor = res.data.cursor
    followings = followings.concat(res.data.follows)
  } while (cursor)
  return followings
}

async function main() {
  await agent.login({
    identifier: process.env.BLUESKY_USERNAME!,
    password: process.env.BLUESKY_PASSWORD!,
  })

  const members = await getListMembers()
  const memberMap = new Map(
    members.map((member) => [member.subject.did, member]),
  )

  const followedUsers = await getFollowing()
  const followedDids = new Set(followedUsers.map((user) => user.did))

  const siteDids = new Set<string>()
  const sites = await redaxios.get<
    Record<
      string,
      {
        url: string
        number: number
      }
    >
  >('https://wonderfulsoftware.github.io/webring-site-data/data.json')

  for (const site of Object.values(sites.data)) {
    if (!site.number) continue
    const hostname = new URL(site.url).hostname

    // Resolve the TXT record for `_atproto.${hostname}`.
    const candidates = Array.from(
      new Set([hostname, hostname.replace(/^www\./, '')]),
    )
    const foundHandle = (
      await Promise.all(
        candidates.map(async (candidate) => {
          try {
            const result = await resolveTxt(`_atproto.${candidate}`)
            return { handle: candidate, found: result.length > 0 }
          } catch (error) {
            console.log('No TXT record for', candidate)
            return { handle: candidate, found: false }
          }
        }),
      )
    ).find((x) => x.found)
    if (!foundHandle) {
      console.error('No handle found for', hostname)
      continue
    }
    const handle = foundHandle.handle
    try {
      const resolved = await agent.resolveHandle({ handle })
      console.log(`[${handle}]`, resolved.data.did)
      siteDids.add(resolved.data.did)
      if (!followedDids.has(resolved.data.did)) {
        await agent.follow(resolved.data.did)
        console.log('=> Followed', handle)
      }

      if (!memberMap.has(resolved.data.did)) {
        await agent.com.atproto.repo.createRecord({
          repo: agent.session!.did,
          collection: 'app.bsky.graph.listitem',
          record: {
            $type: 'app.bsky.graph.listitem',
            subject: resolved.data.did,
            list: listUri,
            createdAt: new Date().toISOString(),
          },
        })
        console.log(`=> Added ${resolved.data.did} (${handle}) to list`)
      }
    } catch (error) {
      console.error('Unable to resolve bsky', handle, `${error}`)
    }
  }

  for (const [did, member] of memberMap) {
    if (!siteDids.has(did)) {
      const { collection, rkey } = new AtUri(member.uri)
      await agent.com.atproto.repo.deleteRecord({
        repo: agent.session!.did,
        collection,
        rkey,
      })
      console.log(`=> Removed ${did} (${member.subject.handle}) from list`)
    }
  }
}

main()
