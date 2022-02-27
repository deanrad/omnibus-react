// @ts-nocheck
import { Omnibus } from 'omnibus-rxjs';
import {
  Subscription,
  Observable,
  ObservableInput,
  from,
  EMPTY,
  defer,
  BehaviorSubject,
  
} from 'rxjs';

import { scan, map, distinctUntilChanged, endWith } from 'rxjs/operators';
import { Action, ActionCreator, actionCreatorFactory } from 'typescript-fsa';

interface ActionCreators<TRequest, TNext, TError> {
  requested: ActionCreator<TRequest>;
  cancel: ActionCreator<void>;
  started: ActionCreator<void>;
  next: ActionCreator<TNext>;
  error: ActionCreator<TError>;
  complete: ActionCreator<void>;
  canceled: ActionCreator<void>;
}

interface Stoppable {
  stop(): Subscription;
}

type ListenerReturnValue<TNext> =
  | (() => ObservableInput<TNext>)
  | ObservableInput<TNext>
  | void;

export function matchesAny(...acs: ActionCreator<any>[]) {
  return (e: any) => {
    return !!acs.find((ac) => ac.match(e));
  };
}

export function createService<TRequest, TNext, TError, TState=object>(
  actionNamespace: string,
  bus: Omnibus<Action<TRequest | TNext | TError>>,
  handler: (e: TRequest) => ListenerReturnValue<TNext>,
  reducer: (all: TState, one: Action<any>) => TState = (s, _) => s,
  listenMode:
    | 'listen'
    | 'listenQueueing'
    | 'listenSwitching'
    | 'listenBlocking' = 'listen'
) {
  const namespacedAction = actionCreatorFactory(actionNamespace);
  
  const ACs: ActionCreators<TRequest, TNext, TError> = {
    requested: namespacedAction<TRequest>('requested'),
    cancel: namespacedAction<void>('cancel'),
    started: namespacedAction<void>('started'),
    next: namespacedAction<TNext>('next'),
    error: namespacedAction<TError>('error'),
    complete: namespacedAction<void>('complete'),
    canceled: namespacedAction<void>('canceled'),
  };

  const isActive = new BehaviorSubject(false);
  const isActiveSub = bus
    .query(matchesAny(ACs.started, ACs.error, ACs.complete, ACs.canceled))
    .pipe(
      scan((all, e) => all + (ACs.started.match(e) ? 1 : -1), 0),
      map(Boolean),
      distinctUntilChanged(),
      endWith(false)
    )
    .subscribe(isActive);

  const state = new BehaviorSubject<TState>(reducer.getInitialState ? reducer.getInitialState() : reducer());
  const stateSub = bus
    .query(matchesAny(ACs.started, ACs.next, ACs.error, ACs.complete, ACs.canceled))
    .pipe(
      scan((all, e) => reducer(all, e), state.value)
    ).subscribe(state)


  // The base return value
  const requestor = (req: TRequest) => {
    const action = ACs.requested(req);
    bus.trigger(action);
  };

  const wrappedHandler = (e: Action<TRequest | TNext | TError>) => {
    const oneResult = handler(e.payload as TRequest);
    const obsResult: Observable<TNext> =
      typeof oneResult === 'function'
        ? oneResult.length === 0
          ? defer(oneResult)
          : EMPTY
        : from(oneResult ?? EMPTY);
    return obsResult;
  };
  const sub = bus[listenMode](
    ACs.requested.match,
    wrappedHandler,
    bus.observeWith({
      // @ts-ignore
      next: ACs.next,
      // @ts-ignore
      error: ACs.error,
      // @ts-ignore
      complete: ACs.complete,
      // @ts-ignore
      subscribe: ACs.started,
      // @ts-ignore
      unsubscribe: ACs.canceled,
    })
  );

  // Enhance and return
  const controls: Stoppable = {
    stop() {
      sub.unsubscribe();
      isActiveSub.unsubscribe(); // flow no more values to it
      isActive.complete(); // make isStopped = true
      stateSub.unsubscribe(); // flow no more values to it
      state.complete(); // make isStopped = true
      return sub;
    },
  };
  const returnValue = Object.assign(requestor, ACs, controls, { isActive, state });

  return returnValue;
}

export function createQueueingService<TRequest, TNext, TError,TState=object>(
  actionNamespace: string,
  bus: Omnibus<Action<TRequest | TNext | TError>>,
  handler: (e: TRequest) => ListenerReturnValue<TNext>,
  reducer: (all: TState, one: Action<any>) => TState = (s, _) => s,

) {
  return createService(actionNamespace, bus, handler, reducer, 'listenQueueing');
}

export function createSwitchingService<TRequest, TNext, TError, TState=object>(
  actionNamespace: string,
  bus: Omnibus<Action<TRequest | TNext | TError>>,
  handler: (e: TRequest) => ListenerReturnValue<TNext>,
  reducer: (all: TState, one: Action<any>) => TState = (s, _) => s,

) {
  return createService(actionNamespace, bus, handler, reducer, 'listenSwitching');
}

export function createBlockingService<TRequest, TNext, TError, TState=object>(
  actionNamespace: string,
  bus: Omnibus<Action<TRequest | TNext | TError>>,
  handler: (e: TRequest) => ListenerReturnValue<TNext>,
  reducer: (all: TState, one: Action<any>) => TState = (s, _) => s,
) {
  return createService(actionNamespace, bus, handler, reducer, 'listenBlocking');
}
