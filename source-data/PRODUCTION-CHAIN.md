# Production chain calculation

## Multiple targets

The main output and any additional output rows seed the same dependency graph. Every requested product's chosen recipe is registered before graph expansion, making the result independent of target order. A target that is also consumed internally receives the sum of its requested export and all internal demand. Shared item requirements are combined before rounding each stage's machine count.

Duplicate item targets using the same recipe are merged. Conflicting recipes for the same target item are rejected with an explicit message, since each item has one production recipe in a plan. By-products are still not reused automatically. The non-target-stage machine subtotal excludes stages producing requested target items, even when those stages also supply other production lines.

Continuous mode uses each output's own per-minute target. Batch mode uses the main completion time for every output quantity. Main-panel figures continue to describe the main output alone; the Full production chain section shows combined factory requirements. Additional targets support automated recipes; existing manual-only and custom single-output views remain available.

Reference check: 2 Modular Frames/min plus 2 Rotors/min, standard recipes and normal Mk.1 extraction at 100%, require 70.5 Iron Ore/min and 15 machines total: 2 miners, 3 smelters, 7 constructors and 3 assemblers. Two separate factories would round to 16 machines. A target of 2 Modular Frames/min plus 5 Reinforced Iron Plates/min requires production of 8 Reinforced Iron Plates/min, with 3 consumed internally and 5 available as final output.

The selected final recipe is expanded into a dependency graph, with one chosen recipe or extraction source per input item. Shared input demand is accumulated in topological order before machine counts are rounded. Every production stage uses the main clock setting as its maximum capacity; extraction uses its independent clock setting. Balanced clocks let each stage meet the exact target, rather than provisioning the surplus capacity of rounded-up downstream machines.

Default raw sources are miners for ores, coal, limestone, sulfur, quartz, bauxite, uranium and SAM; a Water Extractor for water; an Oil Extractor for crude oil; and Resource Well Extractors for nitrogen. Upstream selectors can override extraction with conversion recipes or external supply. Default manufacturing recipes prefer standard recipes and avoid unpackaging loops where possible.

Rates at 100% clock:

- Miner Mk.1 / Mk.2 / Mk.3: 60 / 120 / 240 per minute on a normal node.
- Water Extractor: 120 m³/min.
- Oil Extractor: 120 m³/min on a normal node.
- Resource Well Extractor: 60 m³/min on a normal satellite, controlled by its pressurizer.
- Impure / normal / pure multipliers: 0.5 / 1 / 2. Water bodies do not use purity.

Sources: https://satisfactory.wiki.gg/wiki/Miner, https://satisfactory.wiki.gg/wiki/Water_Extractor, https://satisfactory.wiki.gg/wiki/Oil_Extractor, https://satisfactory.wiki.gg/wiki/Resource_Well_Pressurizer.

Nitrogen pressurizers are counted from the user's used-satellites-per-well setting. The default is one used satellite per well, and the UI explains that this must match the user's actual wells. All satellites represented by a resource row have the same chosen purity.

By-products are listed but not automatically credited to other stages. This is a conservative separate-line planner, not a recycling optimizer. Cyclic dependencies are cut and marked as external supply; an incomplete chain is never labeled fully supplied. Logistics capacity, power generation, node availability, and Somersloops are outside the calculation.

Reference check: 2 standard Modular Frames/min at 100% production and extraction clocks, Mk.1 miners, normal nodes require 48 Iron Ore/min, 48 Iron Ingots/min, 21 Iron Rods/min, 36 Screws/min, 18 Iron Plates/min and 3 Reinforced Iron Plates/min. Rounded counts: 1 miner, 2 smelters, 4 constructors and 2 assemblers, totaling 9 machines (8 upstream). Using Cast Screws reduces this to 8 machines by combining demand before rounding.
