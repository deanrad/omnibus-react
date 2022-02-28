import {
  createQueueingService,
  createSwitchingService,
  createBlockingService,
  createService,
} from '../src/createService';
import { Action } from 'typescript-fsa';

import { Omnibus, after, concat } from 'omnibus-rxjs';
import { createReducer } from '@reduxjs/toolkit';

describe('createService', () => {
  const testNamespace = 'testService';
  const bus = new Omnibus<Action<any>>();
  const handler = jest.fn((s) => {
    console.log(s);
  });
  let testService = createService<string, string, Error>(
    testNamespace,
    bus,
    handler
  );
  beforeEach(() => {
    bus.reset(); // stops existing services, handlings
  });
  describe('arguments', () => {
    describe('bus', () => {
      it.todo('recieves requests');
      it.todo('recieves observed events');
    });
    describe('actionNamespace', () => {
      it.todo('prefixes action types');
    });
    describe('handler', () => {
      it.todo('is called when the bus has service/request events');
    });
    describe('reducer', () => {
      it.todo('is called on each event');
    });
  });
  describe('return value', () => {
    describe('#state', () => {
      const initial = {
        constants: [],
      };
      type InitialState = typeof initial;
      const handler = () => concat(after(0, 3.14), after(0, 2.718));

      it.only('reduces into .state', () => {
        const stateService = createService<
          string | void,
          number,
          Error,
          InitialState
        >(testNamespace, bus, handler, (ACs) =>
          createReducer(initial, {
            [ACs.next.type]: (all, e) => {
              all.constants.push(e.payload);
            },
          })
        );

        expect(stateService.state.value).toEqual({ constants: [] });

        stateService();
        expect(stateService.state.value).toEqual({ constants: [3.14, 2.718] });
      });
    });
    describe('#isActive', () => {
      let asyncHandler, asyncService;
      const ASYNC_DELAY = 10;

      beforeEach(() => {
        asyncHandler = jest.fn(() => {
          return after(ASYNC_DELAY, '3.14');
        });
        asyncService = createService<string, string, Error>(
          testNamespace,
          bus,
          asyncHandler
        );
      });

      it('initially is false', () => {
        expect(asyncService.isActive.value).toBeFalsy();
      });

      it('becomes true when a handler is in-flight', async () => {
        asyncService();

        expect(asyncHandler).toHaveBeenCalled();
        expect(asyncService.isActive.value).toBeTruthy();

        await after(ASYNC_DELAY);
        expect(asyncService.isActive.value).toBeFalsy();
      });

      it('emits changes only on requested, completed, error, unsubscribe, and when changed', () => {
        const statuses = [];
        asyncService.isActive.subscribe((s) => statuses.push(s));

        asyncService();
        // trigger again
        asyncService();

        // no double true
        expect(statuses).toEqual([false, true]);
      });

      it('terminates on a reset', () => {
        // our stream will close - we'll get no statuses after
        let didClose = false;
        asyncService.isActive.subscribe({
          complete() {
            didClose = true;
          },
        });

        bus.reset();
        expect(asyncService.isActive.isStopped).toBeTruthy();
        expect(didClose).toBeTruthy();
        expect(asyncService.isActive.observers).toHaveLength(0);
      });

      it('has a final value of false on bus.reset()', async () => {
        const statuses = [];
        asyncService.isActive.subscribe((s) => statuses.push(s));

        asyncService(); // true
        bus.reset(); // to false
        expect(asyncService.isActive.isStopped).toBeTruthy();
        expect(statuses).toEqual([false, true, false]);

        await after(ASYNC_DELAY);
        expect(statuses).toEqual([false, true, false]);
      });

      it('has a final value of false on stop()', async () => {
        const statuses = [];
        asyncService.isActive.subscribe((s) => statuses.push(s));

        asyncService(); // to true
        asyncService.stop(); // to false
        expect(asyncService.isActive.isStopped).toBeTruthy();

        expect(statuses).toEqual([false, true, false]);

        await after(ASYNC_DELAY);
        expect(statuses).toEqual([false, true, false]);
      });
    });

    describe('has a property for each actioncreator', () => {
      [
        'requested',
        'cancel',
        'started',
        'next',
        'error',
        'complete',
        'canceled',
      ].forEach((subType) => {
        it(`has property ${subType}`, () => {
          expect(testService).toHaveProperty(subType);
          expect(testService[subType]()).toMatchObject({
            type: `${testNamespace}/${subType}`,
          });
        });
      });

      it('has property stop()', () => {
        expect(testService).toHaveProperty('stop');
        testService.stop();
      });
      it.todo('removes listeners and cancels handlings when stop()-ed.');
    });
    it('triggers a request to the bus when called', () => {
      const seen = eventsOf(bus);
      testService('3');

      expect(seen).toMatchObject([
        // { type: 'testService/requested', payload: '3' },
        testService.requested('3'),
      ]);
    });
  });
  it('triggers events from observable handlers when no error', () => {
    const seen = eventsOf(bus);
    testService = createService<string, string, Error>(testNamespace, bus, () =>
      after(0, 'bar')
    );
    testService('foo');
    expect(seen).toEqual([
      testService.requested('foo'),
      testService.started(),
      testService.next('bar'),
      testService.complete(),
    ]);
  });
  it('triggers events from Promise handlers when no error', async () => {
    const seen = eventsOf(bus);
    testService = createService<string, string, Error>(testNamespace, bus, () =>
      Promise.resolve('bar')
    );
    testService('foo');

    await Promise.resolve();

    expect(seen).toEqual([
      testService.requested('foo'),
      testService.started(),
      testService.next('bar'),
      testService.complete(),
    ]);
  });

  it('triggers events from Promise-factory handlers when no error', async () => {
    const seen = eventsOf(bus);
    testService = createService<string, string, Error>(
      testNamespace,
      bus,
      () => () => Promise.resolve('bar')
    );
    testService('foo');

    await Promise.resolve();

    expect(seen).toEqual([
      testService.requested('foo'),
      testService.started(),
      testService.next('bar'),
      testService.complete(),
    ]);
  });

  it('triggers events from observable handlers, even when they error', () => {
    const seen = eventsOf(bus);
    testService = createService<string, string, Error>(testNamespace, bus, () =>
      after(0, () => {
        throw new Error('dang!');
      })
    );
    testService('foo');
    expect(seen).toEqual([
      testService.requested('foo'),
      testService.started(),
      testService.error(new Error('dang!')),
    ]);
  });

  it('triggers events from generator handlers when no error', async () => {
    const seen = eventsOf(bus);
    testService = createService<string, string, Error>(
      testNamespace,
      bus,
      () =>
        function* () {
          yield 'bar';
        }
    );
    testService('foo');

    await Promise.resolve();

    expect(seen).toEqual([
      testService.requested('foo'),
      testService.started(),
      testService.next('bar'),
      testService.complete(),
    ]);
  });

  describe('createQueueingService', () => {
    it('calls createService with "listenQueueing"', () => {
      expect.assertions(0);
      testService = createQueueingService(testNamespace, bus, (s) =>
        after(0, s)
      );
    });
  });

  describe('createSwitchingService', () => {
    it('calls createService with "listenSwitching"', () => {
      expect.assertions(0);
      testService = createSwitchingService(testNamespace, bus, (s) =>
        after(0, s)
      );
    });
  });

  describe('createBlockingService', () => {
    it('calls createService with "listenBlocking"', () => {
      expect.assertions(0);
      testService = createBlockingService(testNamespace, bus, (s) =>
        after(0, s)
      );
    });
  });
});

function eventsOf<T>(bus: Omnibus<T>) {
  const seen: Array<T> = [];
  bus.spy((e) => {
    seen.push(e);
  });
  return seen;
}
