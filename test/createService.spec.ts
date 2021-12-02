import {
  createQueueingService,
  createSwitchingService,
  createBlockingService,
  createService,
  createServiceT,
} from '../src/createService';
import { Action } from 'typescript-fsa';
import { after, Omnibus } from 'omnibus-rxjs';
import { of } from 'rxjs';

describe('createService', () => {
  const testNamespace = 'testService';
  const bus = new Omnibus<Action<any>>();
  let testService = createService<string, string, Error>(testNamespace, bus, (s) => {
    console.log(s);
  });
  beforeEach(() => {
    bus.reset(); // stops existing services, handlings
  });
  describe('arguments', () => {
    describe('bus', () => {
      it.todo('recieves requests');
      it.todo('recieves consequences');
    });
    describe('actionNamespace', () => {
      it.todo('prefixes action types');
    });
    describe('handler', () => {
      it.todo('is called when the bus has service/request events');
    });
  });
  describe('return value', () => {
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
    testService = createService<string, string, Error>(
      testNamespace,
      bus,
      (e) => after(0, 'bar')
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

  it('triggers events from observable handlers, even when they error', () => {
    const seen = eventsOf(bus);
    testService = createService<string, string, string>(
      testNamespace,
      bus,
      (r) =>
        after(0, () => {
          throw 'dang!';
        })
    );
    testService('foo');
    expect(seen).toEqual([
      testService.requested('foo'),
      testService.started(),
      testService.error('dang!'),
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
