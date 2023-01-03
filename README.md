# webring-social

Publish posts from [webring](https://webring.wonderful.software/) [feed](https://webring.wonderful.software/#feed) to social network.

- [Facebook](https://www.facebook.com/webring.in.th)
- [Mastodon](https://mastodon.in.th/@webring)

## How it works

At the [scheduled time, a GitHub Actions workflow](https://github.com/wonderfulsoftware/webring-social/blob/main/.github/workflows/sync.yml) [triggers](https://github.com/wonderfulsoftware/webring-social/actions/workflows/sync.yml). The [FeedPublisher](https://github.com/wonderfulsoftware/webring-social/blob/main/src/FeedPublisher.ts) fetches the published [`feed.json`](https://wonderfulsoftware.github.io/webring-site-data/feed.json) file and generates a [Resource](https://github.com/wonderfulsoftware/webring-social/blob/main/src/Resource.ts) that represents a task to post the link to social media. The resources are then synchronized (which results in a post to social media). The synchronization state is tracked in [`state.yaml`](./state.yaml).
