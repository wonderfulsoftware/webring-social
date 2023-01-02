/**
 * A resource is something that can be managed.
 *
 * @template T Type of the spec.
 *  This is the data that is need to generate or update the resource.
 *  If the spec hasn't changed, we assume that the resource doesn't need to be updated.
 *  For example, a video may contains a title, description, and privacy status in its spec.
 * @template S Type of the state.
 *  This is an extra data that is not present in the resource spec
 *  but is required to manage the resource, especially when updating it.
 *  For example, when creating a caption track, we need to store its ID in the state so that we can update it later.
 */
export interface Resource<T extends {} = any, S extends {} = any> {
  /**
   * Unique identifier of the resource.
   */
  key: string

  /**
   * The spec of the resource.
   */
  spec: T

  /**
   * A human-readable description of the resource.
   * This is used to log the status of the resource.
   */
  description: string

  /**
   * Reconcile the resource by creating or updating it.
   *
   * This method should be idempotent.
   *
   * @param oldState The old state of the resource.
   *  When first creating the resource, this will be `undefined`.
   */
  reconcile(oldState?: S): Promise<S>
}

export function createResourceType<T extends {}, S extends {}>(
  reconciler: (oldState: S | undefined, spec: T) => Promise<S>,
) {
  return {
    create(options: {
      key: string
      spec: T
      description: string
    }): Resource<T, S> {
      return {
        key: options.key,
        spec: options.spec,
        description: options.description,
        reconcile: async (oldState) => {
          return reconciler(oldState, options.spec)
        },
      }
    },
  }
}
