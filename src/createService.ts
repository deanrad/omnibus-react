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

import { scan, map, distinctUntilChanged, endWith, takeUntil } from 'rxjs/operators';
import { Action, ActionCreator, actionCreatorFactory } from 'typescript-fsa';

interface ActionCreators<TRequest, TNext, TError> {
  request: ActionCreator<TRequest>;
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

/**
 * Like Redux Toolkit's createAsyncThunk, but using an event bus, not Redux for communication,
 * and both cancelable, and concurrency-controllable. By default
 * runs handlers simultaneously
 * 
 * @param actionNamespace - Prefix of all actions eg dog/request
 * @param bus - The Omnibus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ActionCreators as its argument.
 * @param listenMode - Concurrency strategy for when an existing handler is in progress.
 * @returns 
 */
export function createService<TRequest, TNext, TError, TState = object>(
  actionNamespace: string,
  bus: Omnibus<Action<TRequest | TNext | TError>>,
  handler: (e: TRequest) => ListenerReturnValue<TNext>,
  reducerProducer: (
    acs?: ActionCreators<TRequest, TNext, TError>
  ) => (state: TState, action: Action<any>) => TState = () =>
    (state: TState, _:any) => {
      return state;
    },
  listenMode:
    | 'listen'
    | 'listenQueueing'
    | 'listenSwitching'
    | 'listenBlocking' = 'listen'
) {
  const namespacedAction = actionCreatorFactory(actionNamespace);

  const ACs: ActionCreators<TRequest, TNext, TError> = {
    request: namespacedAction<TRequest>('request'),
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

  const reducer = reducerProducer(ACs);
  const state = new BehaviorSubject<TState>(
    reducer.getInitialState ? reducer.getInitialState() : reducer()
  );
  const stateSub = bus
    .query(
      matchesAny(ACs.started, ACs.next, ACs.error, ACs.complete, ACs.canceled)
    )
    .pipe(scan((all, e) => reducer(all, e), state.value))
    .subscribe(state);

  // The base return value
  const requestor = (req: TRequest) => {
    const action = ACs.request(req);
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
    return obsResult.pipe(
      takeUntil(bus.query(ACs.cancel.match))
    )
  };
  const sub = bus[listenMode](
    ACs.request.match,
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
  const returnValue = Object.assign(requestor, {actions: ACs}, controls, {
    isActive,
    state,
  });

  return returnValue;
}

/**
 * Like Redux Toolkit's createAsyncThunk, but using an event bus, not Redux for communication,
 * and both cancelable, and concurrency-controllable. Queues up handlers if
 * they return deferred objects: () => Promise or Observable.
 * 
 * @param actionNamespace - Prefix of all actions eg dog/request
 * @param bus - The Omnibus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ActionCreators as its argument.
 * @param listenMode - Concurrency strategy for when an existing handler is in progress.
 * @returns 
 */
export function createQueueingService<TRequest, TNext, TError, TState = object>(
  actionNamespace: string,
  bus: Omnibus<Action<TRequest | TNext | TError>>,
  handler: (e: TRequest) => ListenerReturnValue<TNext>,
  reducerProducer: (
    acs?: ActionCreators<TRequest, TNext, TError>
  ) => (state: TState, action: Action<any>) => TState = () =>
    (state: TState, _:any) => {
      return state;
    }
) {
  return createService(
    actionNamespace,
    bus,
    handler,
    reducerProducer,
    'listenQueueing'
  );
}

/**
 * Like Redux Toolkit's createAsyncThunk, but using an event bus, not Redux for communication,
 * and both cancelable, and concurrency-controllable. Prevents events from a previous handling 
 * from being emitted, and cancels the handler if it returned an Observable.
 * @param actionNamespace - Prefix of all actions eg dog/request
 * @param bus - The Omnibus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ActionCreators as its argument.
 * @param listenMode - Concurrency strategy for when an existing handler is in progress.
 * @returns 
 */
export function createSwitchingService<
  TRequest,
  TNext,
  TError,
  TState = object
>(
  actionNamespace: string,
  bus: Omnibus<Action<TRequest | TNext | TError>>,
  handler: (e: TRequest) => ListenerReturnValue<TNext>,
  reducerProducer: (
    acs?: ActionCreators<TRequest, TNext, TError>
  ) => (state: TState, action: Action<any>) => TState = () =>
    (state: TState, _:any) => {
      return state;
    }
) {
  return createService(
    actionNamespace,
    bus,
    handler,
    reducerProducer,
    'listenSwitching'
  );
}

/**
 * Like Redux Toolkit's createAsyncThunk, but using an event bus, not Redux for communication,
 * and both cancelable, and concurrency-controllable. Prevents a new handler from starting
 * if one is in progress - handy for having a singleton handler
 * @param actionNamespace - Prefix of all actions eg dog/request
 * @param bus - The Omnibus event bus read and written to
 * @param handler - Function returning Promise, Observable or generator from which events are generated
 * @param reducerProducer - Function returning a reducer for #state - recieves ActionCreators as its argument.
 * @param listenMode - Concurrency strategy for when an existing handler is in progress.
 * @returns 
 */
export function createBlockingService<TRequest, TNext, TError, TState = object>(
  actionNamespace: string,
  bus: Omnibus<Action<TRequest | TNext | TError>>,
  handler: (e: TRequest) => ListenerReturnValue<TNext>,
  reducerProducer: (
    acs?: ActionCreators<TRequest, TNext, TError>
  ) => (state: TState, action: Action<any>) => TState = () =>
    (state: TState, _:any) => {
      return state;
    }) {
  return createService(
    actionNamespace,
    bus,
    handler,
    reducerProducer,
    'listenBlocking'
  );
}
