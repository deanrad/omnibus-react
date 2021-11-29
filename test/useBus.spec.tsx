// @ts-nocheck
import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Omnibus } from 'omnibus-rxjs';
import { BusContext } from '../src/useBus';
import { CounterBus } from './subjects/BusCounter';

const bus = new Omnibus<any>();

describe('ChannelContext/useChannel', () => {
  it('shares events by default (usually good)', () => {
    const { queryByTestId: query } = render(
      <BusContext.Provider value={bus}>
        <CounterBus id="counter1" />
        <CounterBus id="counter2" />
      </BusContext.Provider>
    );
    fireEvent.click(query('counter1-button'));
    fireEvent.click(query('counter2-button'));
    expect(query('counter1')).toHaveTextContent('2');
    expect(query('counter2')).toHaveTextContent('2');
  });

  it('separates events with a distinct bus per context', () => {
    const [channel1, channel2] = [new Omnibus(), new Omnibus()];
    const { queryByTestId: query } = render(
      <div>
        <BusContext.Provider value={channel1}>
          <CounterBus id="counter1" />
        </BusContext.Provider>
        <BusContext.Provider value={channel2}>
          <CounterBus id="counter2" />
        </BusContext.Provider>
      </div>
    );
    fireEvent.click(query('counter1-button'));
    fireEvent.click(query('counter2-button'));
    expect(query('counter1')).toHaveTextContent('1');
    expect(query('counter2')).toHaveTextContent('1');
  });
});
