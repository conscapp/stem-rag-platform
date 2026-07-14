---
domains: [clean_energy]
concepts: [nuclear_fusion, plasma_physics, thermodynamics, conservation_energy, heat_transfer, electromagnetism]
---

# Nuclear Fusion Energy (First Principles)

## Fusion Reaction Energy

Deuterium–tritium (D–T) fusion releases energy from mass defect:
$$E = \Delta m c^2$$

Typical D–T reaction: $^2H + ^3H \rightarrow ^4He + n + 17.6\ \text{MeV}$ [nuclear_fusion].

**Conservation:** Total mass-energy before and after the reaction is conserved; the kinetic energy of products carries the released binding energy [conservation_energy].

## Lawson Criterion (Ignition)

For sustained fusion, plasma must satisfy the Lawson criterion — sufficient density $n$, confinement time $\tau_E$, and temperature $T$:
$$n \tau_E T > \text{threshold}$$

Triple product $n \tau_E T$ determines whether the plasma is hot and dense enough for self-heating [plasma_physics].

## Energy Gain Factor Q

Plant-level gain:
$$Q = \frac{P_{\text{fusion}}}{P_{\text{input}}}$$

- $Q < 1$: net energy loss (current experimental reactors)
- $Q = 1$: breakeven
- $Q > 1$: net energy production

**Thermodynamic limit:** Even at high $Q$, net electricity requires converting fusion heat to work; Carnot efficiency $\eta = 1 - T_C/T_H$ caps thermal-to-electric conversion [thermodynamics].

## Magnetic Confinement (Tokamak)

Tokamaks confine plasma with toroidal magnetic fields. Key parameters:
- Plasma beta: $\beta = \frac{p}{B^2/(2\mu_0)}$ — ratio of plasma pressure to magnetic pressure
- Confinement time $\tau_E$ from empirical scaling laws (e.g. ITER scaling)

Magnetic field strength and geometry set the maximum achievable $\beta$ and confinement [plasma_physics + electromagnetism].

## Inertial Confinement

Laser or ion-beam drivers compress fusion fuel capsules. Ignition requires:
- Sufficient areal density $\rho R$
- Hot spot temperature $T > 10^7\ \text{K}$

Energy balance: driver energy must exceed losses from radiation, conduction, and hydrodynamic disassembly before fusion burn propagates [nuclear_fusion].

## Tritium Breeding

D–T reactors must breed tritium in a lithium blanket:
$$n + ^6Li \rightarrow ^4He + ^3H$$

Tritium inventory balance: consumption in fusion must equal breeding rate minus losses. A self-sufficient plant requires breeding ratio $TBR > 1$ [nuclear_fusion + engineering].

## Heat Extraction & Power Cycle

Fusion neutrons deposit energy in a blanket; coolant carries heat to a steam or Brayton cycle.

Second law: No heat engine exceeds Carnot efficiency. Real plant efficiency $\eta_{plant} \ll 1$ must be applied to fusion thermal power to estimate net electric output [thermodynamics + heat_transfer].

## Scale & Domain Constraints

Fusion operates at $10^7$–$10^8\ \text{K}$ plasma temperatures, meter-scale reactors, and tesla-class magnetic fields. Nano-scale equations do not apply; orbital mechanics do not apply. Use plasma physics and fusion-specific constraints only [plasma_physics].
