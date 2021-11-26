import { useEffect } from 'react';
import { Subscription } from 'rxjs';

/**
 * Ties a subscription to the lifetime of the component that calls useWhileMounted.
 * Given a subscription-returning function, gets the subscription (thereby starting it)
 * at component mount time, and unsubscribes it at unmount time.
 */
export function useWhileMounted(subsFactory: () => Subscription) {
  useEffect(() => {
    const sub = subsFactory();
    return () => sub?.unsubscribe();
  }, []);
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
