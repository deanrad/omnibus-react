import React, { useState } from 'react';
import { useBus } from '../../src/useBus';
import { useWhileMounted } from '../../src/useWhileMounted';

export const CounterBus = ({ id = 'counter' }) => {
  const [count, setCount] = useState(0);

  const bus = useBus();
  useWhileMounted(() =>
    bus.filter(
      (e) => e === 'count/increment',
      () => {
        setCount((c) => c + 1);
      }
    )
  );

  return (
    <section>
      <output data-testid={id}>{count}</output>
      <button
        data-testid={`${id}-button`}
        onClick={() => bus.trigger('count/increment')}
      >
        Count
      </button>
    </section>
  );
};
