import { Omnibus } from 'omnibus-rxjs';
import {
  Subscription,
  Observable,
  ObservableInput,
  from,
  EMPTY,
  defer,
} from 'rxjs';
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

export type ListenerReturnValue<TNext> =
  | (() => ObservableInput<TNext>)
  | ObservableInput<TNext>
  | void;
export type ResultCreator<T, TConsequence> = (
  item: T
) => ListenerReturnValue<TConsequence>;

export function createService<TRequest, TNext, TError>(
  actionNamespace: string,
  bus: Omnibus<Action<any>>,
  handler: ResultCreator<Action<TRequest>, TNext>,
  listenMode:
    | 'listen'
    | 'listenQueueing'
    | 'listenSwitching'
    | 'listenBlocking' = 'listen'
): ((req: TRequest) => void) &
  ActionCreators<TRequest, TNext, TError> &
  Stoppable {
  const namespacedAction = actionCreatorFactory(actionNamespace);

  // Extends our return value, and used internally
  const ACs = {
    requested: namespacedAction<TRequest>('requested'),
    cancel: namespacedAction<void>('cancel'),
    started: namespacedAction<void>('started'),
    next: namespacedAction<TNext>('next'),
    error: namespacedAction<TError>('error'),
    complete: namespacedAction<void>('complete'),
    canceled: namespacedAction<void>('canceled'),
  };

  const wrappedHandler: ResultCreator<Action<TRequest>, TNext> = (e) => {
    const oneResult = handler(e);
    const obsResult: Observable<any> =
      typeof oneResult === 'function'
        ? oneResult.length === 0
          ? defer(oneResult)
          : EMPTY
        : from(oneResult ?? EMPTY);
    return obsResult;
  };
  // The listener. May get shut off with a bus.reset();
  const sub = bus[listenMode](
    ACs.requested.match,
    wrappedHandler,
    bus.observeWith({
      next: ACs.next,
      error: ACs.error,
      complete: ACs.complete,
      subscribe: ACs.started,
      unsubscribe: ACs.canceled,
    })
  );

  // The base return value
  const requestor = (req: TRequest) => {
    const action = ACs.requested(req);
    bus.trigger(action);
  };

  // Enhance and return
  const controls: Stoppable = {
    stop() {
      sub.unsubscribe();
      return sub;
    },
  };
  const returnValue = Object.assign(requestor, ACs, controls);

  return returnValue;
}

export function createQueueingService<TRequest, TNext, TError>(
  actionNamespace: string,
  bus: Omnibus<Action<any>>,
  handler: (req: Action<TRequest>) => Observable<TNext>
): ((req: TRequest) => void) &
  ActionCreators<TRequest, TNext, TError> &
  Stoppable {
  return createService(actionNamespace, bus, handler, 'listenQueueing');
}

export function createSwitchingService<TRequest, TNext, TError>(
  actionNamespace: string,
  bus: Omnibus<Action<any>>,
  handler: (req: Action<TRequest>) => Observable<TNext>
): ((req: TRequest) => void) &
  ActionCreators<TRequest, TNext, TError> &
  Stoppable {
  return createService(actionNamespace, bus, handler, 'listenSwitching');
}

export function createBlockingService<TRequest, TNext, TError>(
  actionNamespace: string,
  bus: Omnibus<Action<any>>,
  handler: (req: Action<TRequest>) => Observable<TNext>
): ((req: TRequest) => void) &
  ActionCreators<TRequest, TNext, TError> &
  Stoppable {
  return createService(actionNamespace, bus, handler, 'listenBlocking');
}
