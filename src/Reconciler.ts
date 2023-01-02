import { isEqual } from 'lodash-es'
import { Resource } from './Resource'
import { StateStorage } from './StateStorage'

export class Reconciler {
  constructor(private storage: StateStorage) {}
  async reconcile<T extends {}, S extends {}>(
    resource: Resource<T, S>,
    dryRun = false,
  ): Promise<S> {
    if (dryRun) {
      console.log(`[Dry-run] ${resource.description}`)
      return {} as S
    }
    const data = (await this.storage.getState(resource.key)) || {}
    if (isEqual(data.spec, resource.spec)) {
      console.log(`[Up-to-date] ${resource.description}`)
      return data.state
    }
    try {
      const newState = await resource.reconcile(data.state)
      await this.storage.setState(resource.key, {
        spec: resource.spec,
        state: newState,
      })
      console.log(`[Updated] ${resource.description}`)
      return newState
    } catch (error) {
      console.error(`[Error] ${resource.description}: ${error}`)
      throw error
    }
  }
}

export const reconciler = new Reconciler(new StateStorage())
