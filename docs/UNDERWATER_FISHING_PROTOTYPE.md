# Underwater Fishing Prototype

## Core loop

Cast -> directly steer the underwater hook -> stay on fish to catch -> optionally seek a second fish or secret -> reel in -> haul result.

## Current prototype values

- 3 dives per trip
- 18 m line represented by a 490 px maximum radius
- no gravity and no automatic sinking
- direct WASD/arrow or held-pointer steering
- E, Space or the Reel In control returns the hook
- 2 basket slots
- common and uncommon fish use 1 slot
- rare fish uses both slots
- small fish require 0.78 seconds of contact
- rare fish requires 1.25 seconds
- caught fish reduce hook speed by only 2.5% each, capped at 5%
- caught fish appear as small wobbling followers behind the hook
- one optional secret worth 25 coins

## Validation questions

1. Is held-pointer steering comfortable on phone screens?
2. Is 18 m enough to create a meaningful route choice without feeling restrictive?
3. Does two-fish capacity create a satisfying safe-versus-risk decision?
4. Are contact times readable and fair while fish are moving?
5. Is three dives the right length for a 60-110 second trip?
