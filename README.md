[![Travis CI](https://api.travis-ci.com/deanrad/omnibus-react.svg?token=jDxJBxYkkXVxwqfuGjmx&branch=master&status=passed)](https://travis-ci.com/deanrad/omnibus-react)
![Code Coverage](https://shields.io/badge/coverage-100%25-brightgreen)
[![Maintainability](https://api.codeclimate.com/v1/badges/f7c14c5a3bbbf0d803cc/maintainability)](https://codeclimate.com/github/deanrad/omnibus-react/maintainability)

# omnibus-react

## What Is It?

A way to use the [Omnibus](https://github.com/deanrad/omnibus-rxjs) library in a React context.
Allows you to:

- Avoid prop-drilling by using a bus for inter-component communication.
- Trigger to the bus, and listen from anywhere in the component tree. No more passing function references that can be the source of over-rendering issues or cluttered code.
- Lower resource usage by canceling effects automatically on component unmount (when the effects support cancelation by being Observable).
- Avoid race conditions caused by React not canceling effects as soon as possible.

## How to Get It?

`npm install omnibus-react omnibus-rxjs`

Omnibus-react has a peer dependency on `omnibus-rxjs`.

## How Big Is It?

Including both `omnibus-*` libs: 10Kb minified, gzipped

## What Front-End problems does it help with?

- Keep components and services testable—since they're specified only in terms of messages they send or respond to - no mocking required!
- Don't need to prop-drill, lift state, or introduce Contexts to do inter-component communication; sharing the bus is sufficient.
- Code UX to handle all edge-cases around API/service communication, by depending only on the messages. Even if those services aren't built yet!
- Keep memory footprint small, and prevent bundle bloat by allowing functionality to load/unload at runtime.

And many more - see How Can I Explain This To My Team.

## Usage with React

```ts
import { useWhileMounted } from "omnibus-react"
import { bus, CounterIncrement } from "./events/"
const CounterDisplay = () => {
  const [count, setCount] = useState(0);
  useWhileMounted(() => {
    return bus.listen(CounterIncrement.match, () => {
      setCount(c => c+1))
    })
  })
}
```

This example invokes a React state-setter each time an event matching `CounterIncrement` is trigger-ed onto the bus. `bus.listen` returns an RxJS `Subscription` object, and the wrapping of it in `useWhileMounted` allows the listener to be removed upon component unmounting.

In an entirely un-coupled component, anywhere in the app, a component (or test framework) will trigger those actions:

```ts
import { bus, CounterIncrement } from './events'
const CounterButton = () => {
  return <button onClick={() => trigger(CounterIncrement())}>
}
```

All that's needed to connect them, is mount each of them - in no particular relation to each other, and sharing no props or state:

```jsx
<App>
  <CounterDisplay />
  <CounterButton />
</App>
```

### Lifecycle

`useWhileMounted` can ensure your effects do not outlive the components that initiate them. This is a good default, and enabled by returning Observables from handlers always. However, if cancelability is not desired, (such as when a response is still desired) simply return a Promise instead, and Omnibus will be unable to cancel it.

```ts
function useWhileMounted(subsFactory: () => Subscription) {
  useEffect(() => {
    const sub = subsFactory();
    return () => sub?.unsubscribe();
  }, []);
}
```

The `useAllWhileMounted` version takes multiple subscription factories and combines them into one, which is canceled on unmount.

# How Can I Explain Why We Should Use This to My Team?

The main benefits of Omnibus are:

- Allows you to architect your application logic around events of interest to your application, not around volatile or error-prone framework-specific APIs.
- Provides an execution container for typesafe, leak-proof async processes with reliable concurrency options to squash race conditions and prevent resource leaks.

To the first point - framework-specific issues like "prop-drilling" and "referential instability" disappear when an event bus transparently connects components anywhere in the tree through a single, stable bus instance.

To the reliability point - just as XState is a predictable, safe, leak-proof state-container, Omnibus is that for async processes, because it uses the >10 year old, tested options of RxJS: Observables and concurrency operators.

With Omnibus inside React, you can:

- Keep components and services testable—simply specify them in terms of messages they send or respond to, and listen - no mocking required!
- Prevent the need to prop-drill, lift state, or introduce Contexts to do inter-component communication; sharing the bus is sufficient.
- Develop UX to handle all edge-cases around API/service communication, even if those services aren't built yet, by decoupling from them with the event bus!
- Keep memory footprint small, and prevent bundle bloat by allowing functionality to load/unload at runtime.

You can start with Omnibus with no RxJS logic at all - just handlers returning Promises. Then as you require capabilities that Observables offer—like cancelation— you can change what those handlers return. _Leaving the rest of your app unchanged!_ No `async/await` is required. And you need not mix several types of async code like: middlewares, async/await, Promise chaining and framework-specific APIs. Just use events and listeners.

In short - the kinds of upgrades one must do in web development, such as migrating code from uncancelable to cancelable, from REST endpoint to Web Socket, are made easy with Omnibus. And the UX can be made tight and responsive against any downstream behavior because of its modular, decoupled nature.

# Inspirations, References

- RxJS
- Redux-Observable
- XState
