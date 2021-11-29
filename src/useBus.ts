import { createContext, useContext } from 'react';
import { Omnibus } from 'omnibus-rxjs';
const defaultBus = new Omnibus<any>();

/** Sets up a channel - a domain for events. It's not always necessary or
 * advantageous to use multiple channels - a single channel may suffice, and
 * different slices of it managed via namespacing.
 */
export const BusContext = createContext(defaultBus);
export const useBus = () => {
  const bus = useContext(BusContext) || defaultBus;
  return bus;
};
