import { useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { useWhileMounted } from './useWhileMounted';
import { Service } from 'omnibus-rxjs';

/** Maintains a React state field populated from service.state
 * Doesn't update state after unmount.
 * @param service The service to subscribe to
 */
export function useServiceState<TState>(
  service: Service<any, unknown, unknown, TState>
) {
  const [state, setter] = useState(service.state.value);

  useWhileMounted(() =>
    service.state.subscribe({
      next(newState) {
        setter(newState);
      },
    })
  );

  return state;
}

/** Maintains a React state field populated from service.isActive
 * Doesn't update state after unmount.
 * @param service The service to subscribe to
 */
export function useServiceActivity(service: Service<any, any, any, any>) {
  const [activity, setActivity] = useState(service.isActive.value);

  useWhileMounted(() =>
    service.isActive.subscribe({
      next(newActivity) {
        setActivity(newActivity);
      },
    })
  );

  return activity;
}
