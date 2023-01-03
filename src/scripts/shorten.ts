import yargs from 'yargs'
import { createShortUrl } from '../UrlShortener'

const argv = await yargs(process.argv.slice(2))
  .options({
    url: {
      type: 'string',
      description: 'URL to shorten',
      demand: true,
    },
  })
  .strict()
  .help()
  .parse()

console.log(await createShortUrl(argv.url))
