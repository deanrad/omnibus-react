import * as React from 'react';
import { useServiceState, useServiceActivity } from '../../src/serviceHooks';
import { Service, createService, Omnibus, after } from 'omnibus-rxjs';
import { Action } from 'typescript-fsa';
import { useCallback, createElement, FunctionComponent } from 'react';
import { EMPTY } from 'rxjs';

const bus = new Omnibus<Action<any>>();
const serviceInitialState = { ringCount: 0 };

const bellService = createService<void, void, void, typeof serviceInitialState>(
  'bell',
  bus,
  () => after(1000, EMPTY),
  () =>
    (s = serviceInitialState, a) => {
      if (a.type === bellService.actions.request.type) {
        return { ...s, ringCount: s.ringCount + 1 };
      }
      return s;
    }
);

type BellServiceProps = typeof serviceInitialState & {
  isActive: boolean;
  trigger: (payload: Parameters<typeof bellService>[0]) => void;
};

const BellDisplay: FunctionComponent<BellServiceProps> = function (
  props: BellServiceProps
) {
  // const isActive = props.
  const trigger = props.trigger;
  return <button onClick={() => trigger()}>Ring Bell</button>;
};

function NotBell() {
  return null;
}

// Doesn't typecheck display compoenent but works at runtime (shrug)
const EffectedBell = connectToService(bellService, NotBell);

/** Connects a service to a display component, to which it passes service state, isActive, and trigger as props. */
function connectToService<TRequest, TState>(
  service: Service<TRequest, any, any, TState>,
  displayComponent: (
    props: TState & { isActive: boolean; trigger: (req: TRequest) => void }
  ) => ReturnType<FunctionComponent>
) {
  const enhanced = function Effected() {
    const state = useServiceState(service);
    const isActive = useServiceActivity(service);
    const trigger = useCallback((req: TRequest) => {
      service(req);
    }, []);

    const props = { ...state, isActive, trigger };
    return createElement(displayComponent, props);
  } as FunctionComponent;

  return enhanced;
}
