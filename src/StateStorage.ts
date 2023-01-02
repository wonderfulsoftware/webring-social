import { dump, load } from 'js-yaml'
import fs from 'fs'
import { cloneDeep, isEqual } from 'lodash-es'

/**
 * A simple state storage that uses a YAML file to store the state,
 * useful for scripts that need to store state between runs.
 *
 * @remarks It is assumed that only one process is accessing the state file at a time.
 * The data is loaded into memory on the first call to `getState` or `setState`,
 * and then kept in memory until the process exits.
 * There are no checks to ensure that the state file is not modified by another process,
 * nor is there any locking to prevent concurrent access.
 */
export class StateStorage {
  state: Record<string, any> | undefined

  async loadState() {
    this.state = load(fs.readFileSync('state.yaml', 'utf8')) as Record<
      string,
      any
    >
  }

  async getState(key: string) {
    if (!this.state) {
      await this.loadState()
    }
    return cloneDeep(this.state![key])
  }

  async setState(key: string, data: any) {
    if (!this.state) {
      await this.loadState()
    }
    const oldState = cloneDeep(this.state![key])
    const newState = cloneDeep(data)
    if (isEqual(oldState, newState)) {
      return
    }
    this.state![key] = newState
    fs.writeFileSync('state.yaml', dump(this.state, { sortKeys: true }))
  }
}
