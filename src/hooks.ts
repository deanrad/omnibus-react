import * as React from 'react';
import { useEffect } from 'react';
import { Observable, Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

/**
 * Ties a subscription to the lifetime of the component that calls useWhileMounted.
 * Given a function which is either a useEffect-style callback, or returns an Observable of subscription,
 * runs/subscribes it at component mount time, and runs the cleanup callback/unsubscribes at unmount time.
 */
export function useWhileMounted(
  sourceFactory:
    | React.EffectCallback
    | (() => Subscription)
    | (() => Observable<any>)
) {
  useEffect(() => {
    const source = sourceFactory();
    const teardown = (source as Observable<any>)?.subscribe
      ? (source as Observable<any>).subscribe()
      : source || new Subscription();

    return (teardown as Subscription)?.unsubscribe
      ? () => (teardown as Subscription).unsubscribe()
      : () => {
          (teardown as () => void)?.();
        };
  }, []);
}

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

/**
 * Ties multiple subscriptions to the lifetime of the component that calls useAllWhileMounted.
 * Given spread args of subscription-returning functions, gets the subscriptions from each
 * subscription factory at component mount time, and unsubscribes them all at unmount time.
 */
export function useAllWhileMounted(...subFactories: Array<() => Subscription>) {
  useEffect(() => {
    const allSubs = new Subscription();
    for (let subFactory of subFactories) {
      allSubs.add(subFactory());
    }
    return () => allSubs.unsubscribe();
  }, []);
}
