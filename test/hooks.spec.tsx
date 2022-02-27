import * as React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useWhileMounted } from '../src/hooks';
import { Observable, Subscription } from 'rxjs';


describe('useWhileMounted', () => {
  describe('called with a Subscription factory', () => {
    let count = 0
    const Example = () => {
      useWhileMounted(() => {
        count++
        return new Subscription(() => { count-- })
      })
      return null
    }

    describe('at mount time', () => {
      it('calls the factory', () => {
        const result = render(<Example />)
        expect(count).toEqual(1)
      })
    })
    describe('at unmount time', () => {
      it('unsubscribes the subscription', () => {
        const { unmount } = render(<Example />)
        expect(count).toEqual(1)
        unmount()
        expect(count).toEqual(0)
      })
    })
  })
  describe('called with an EffectCallback', () => {
    let count = 0
    const Example = () => {
      useWhileMounted(() => {
        count++
        return () => { count-- }
      })
      return null
    }

    describe('at mount time', () => {
      it('calls the factory', () => {
        const result = render(<Example />)
        expect(count).toEqual(1)
      })
    })
    describe('at unmount time', () => {
      it('unsubscribes the subscription', () => {
        const { unmount } = render(<Example />)
        expect(count).toEqual(1)
        unmount()
        expect(count).toEqual(0)
      })
    })
  })
  describe('called with an Observable', () => {
    let count = 0
    const Example = () => {
      useWhileMounted(() => {
        return new Observable(() => {
          count++;
          return () => { count-- }
        })
      })
      return null
    }

    describe('at mount time', () => {
      it('calls the factory', () => {
        const result = render(<Example />)
        expect(count).toEqual(1)
      })
    })
    describe('at unmount time', () => {
      it('unsubscribes the subscription', () => {
        const { unmount } = render(<Example />)
        expect(count).toEqual(1)
        unmount()
        expect(count).toEqual(0)
      })
    })
  })

  describe('With Mocks', () => {
    describe('called with a Subscription factory', () => {
      const mockSub = new Subscription()
      const mockUnsub = jest.spyOn(mockSub, 'unsubscribe')
      const mockSubFactory = jest.fn(() => mockSub) as unknown as () => Subscription
      const Example = () => {
        useWhileMounted(mockSubFactory)
        return null
      }

      describe('at mount time', () => {
        it('calls the factory', () => {
          const result = render(<Example />)
          expect(mockSubFactory).toHaveBeenCalled()
        })
      })
      describe('at unmount time', () => {
        it('calls unsubscribe', () => {
          const { unmount } = render(<Example />)
          unmount()
          expect(mockUnsub).toHaveBeenCalled()
        })
      })
    })

  })

  it('exists', () => {
    expect(useWhileMounted).toBeTruthy();
  });
});
