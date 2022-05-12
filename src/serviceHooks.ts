import * as React from 'react';
import { useEffect } from 'react';
import { Observable, Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { useWhileMounted } from './useWhileMounted';

/** Calls the function given on each new state of the service. Does not dedupe states!
 * Unsubscribes on unmount. Only pass a setter that is stable!
 * @param service The service to subscribe to
 * @param setter The function which sets the new state on chnges
 */
 export function useServiceState<T>(
  service: { state: Observable<T> },
  setter: (newState: T) => void
) {
  useWhileMounted(() =>
    service.state.subscribe({
      next(newState) {
        setter(newState);
      },
    })
  );
}

/** Calls the function given on each new state of the service, deduping with optional comparator.
 * Unsubscribes on unmount. Only pass a setter that is stable!
 * @param service The service to subscribe to
 * @param setter The function which sets the new state on chnges
 */
export function useDistinctServiceState<T>(
  service: { state: Observable<T> },
  setter: (newState: T) => void,
  comparator?: (previous: T, current: T) => boolean
) {
  useWhileMounted(() =>
    service.state.pipe(distinctUntilChanged(comparator)).subscribe({
      next(newState) {
        setter(newState);
      },
    })
  );
}
