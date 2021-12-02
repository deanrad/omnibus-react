import { useBus } from "./useBus";
import { useWhileMounted } from "./hooks";
import { createService, ResultCreator } from './createService'
import { Subscription } from "rxjs";

/* Instantiates a service on the contextual bus */
export const useService(  actionNamespace: string,
    handler: ResultCreator<Action<TRequest>, TNext>,
  ) {
    const bus = useBus()
    // start 
    const service = createService(...serviceArgs)
    useWhileMounted(() => new Subscription(() => service.stop()))
}