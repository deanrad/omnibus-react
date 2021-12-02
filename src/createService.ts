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

// export type ResultCreator<T, TConsequence> = (
//   item: T
// ) => ListenerReturnValue<TConsequence>;

// export function createServiceT<TBusItem>(
//   bus: Omnibus<TBusItem>,
//   handler: (e: TBusItem) => ListenerReturnValue<TBusItem>
// ): (req: any) => void {
//   // The base return value
//   const requestor = (req: any): Action<TBusItem> => {
//     const action = { type: 'foo', payload: req } as Action<TBusItem>;
//     return action;
//     // bus.trigger(action);
//   };
//   return requestor;
// }

export type ExtractPayload<A> = A extends Action<infer T> ? T : never;

export function createService<TRequest, TNext, TError>(
  actionNamespace: string,
  bus: Omnibus<Action<TRequest | TNext | TError>>,
  handler: (e: TRequest) => ListenerReturnValue<TNext>,
  listenMode:
    | 'listen'
    | 'listenQueueing'
    | 'listenSwitching'
    | 'listenBlocking' = 'listen'
) {
  const namespacedAction = actionCreatorFactory(actionNamespace);
  const ACs = {
    requested: namespacedAction<TRequest>('requested'),
    cancel: namespacedAction<void>('cancel'),
    started: namespacedAction<void>('started'),
    next: namespacedAction<TNext>('next'),
    error: namespacedAction<TError>('error'),
    complete: namespacedAction<void>('complete'),
    canceled: namespacedAction<void>('canceled'),
  };

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
      next: ACs.next,
      error: ACs.error,
      complete: ACs.complete,
      subscribe: ACs.started,
      unsubscribe: ACs.canceled,
    })
  );

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
  bus: Omnibus<Action<TRequest | TNext | TError>>,
  handler: (e: TRequest) => ListenerReturnValue<TNext>
) {
  return createService(actionNamespace, bus, handler, 'listenQueueing');
}

export function createSwitchingService<TRequest, TNext, TError>(
  actionNamespace: string,
  bus: Omnibus<Action<TRequest | TNext | TError>>,
  handler: (e: TRequest) => ListenerReturnValue<TNext>
) {
  return createService(actionNamespace, bus, handler, 'listenSwitching');
}

export function createBlockingService<TRequest, TNext, TError>(
  actionNamespace: string,
  bus: Omnibus<Action<TRequest | TNext | TError>>,
  handler: (e: TRequest) => ListenerReturnValue<TNext>
) {
  return createService(actionNamespace, bus, handler, 'listenBlocking');
}
