import yargs from 'yargs'
import { FeedPublisher } from '../FeedPublisher'

const argv = await yargs(process.argv.slice(2))
  .options({
    confirm: {
      alias: 'f',
      type: 'boolean',
      default: false,
      description: 'Confirm the action',
    },
  })
  .strict()
  .help()
  .parse()

await new FeedPublisher().publish(!argv.confirm)
