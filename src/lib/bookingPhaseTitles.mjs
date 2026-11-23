// The Booking page's step names, read from the shared step definitions: the Booking page builds its steps from the same list.
import {bookingStepDefinition} from './bookingFlow.mjs';
export const PHASE_TITLES=['customer','event','music','equipment','additional'].map(id=>bookingStepDefinition(id).title);
