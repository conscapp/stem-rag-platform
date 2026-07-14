---
domains: [aerospace]
concepts: [orbital_mechanics, rocketry, conservation_energy, conservation_momentum, thermodynamics]
---

# Aerospace: Orbital Mechanics & Propulsion (First Principles)

## Tsiolkovsky Rocket Equation

$$\Delta v = v_e \ln\frac{m_0}{m_f}$$

where $\Delta v$ is velocity change (m/s), $v_e$ is effective exhaust velocity (m/s), $m_0$ is initial mass, $m_f$ is final mass after burn.

**Implication:** Reaching orbit requires large $\Delta v$ (~9.4 km/s total budget including gravity/drag losses). Mass ratio $m_0/m_f = e^{\Delta v / v_e}$ grows exponentially with required $\Delta v$.

## Low Earth Orbit Speed

Circular orbit centripetal acceleration equals gravitational acceleration:

$$a_c = \frac{v^2}{r} \approx g \quad \Rightarrow \quad v_{LEO} \approx 7.8 \text{ km/s}$$

Combined with $F = ma$ [physics] and conservation of mechanical energy: reaching orbit requires delivering $\Delta KE \approx \frac{1}{2}mv^2$ per unit mass.

## Propulsion Energy

Chemical propellant specific impulse $I_{sp}$ relates exhaust velocity: $v_e = I_{sp} \cdot g_0$.

Typical liquid oxygen/kerosene: $I_{sp} \approx 350$ s $\Rightarrow v_e \approx 3.4$ km/s.

For $\Delta v = 9.4$ km/s: mass ratio $\approx e^{9.4/3.4} \approx 15$. A human-sized vehicle cannot carry enough propellant without staging.

## Structural Loads

Launch loads: $\sigma = F/A$ must stay below allowable with factor of safety $FS = \sigma_{allowable}/\sigma_{actual}$ [engineering].

Aerodynamic heating at re-entry involves convection $q = hA(T_s - T_\infty)$ and radiation $q = \epsilon\sigma A T^4$ [heat transfer].

## Thermodynamic Limit on Propellant

Chemical reaction enthalpy $\Delta H$ [chemistry] sets upper bound on energy per kg propellant. Carnot efficiency $\eta = 1 - T_C/T_H$ [thermodynamics] limits conversion to kinetic energy of exhaust.

**Low-energy fuel cannot reach orbit** unless context provides propellant with sufficient $\Delta H$ and $I_{sp}$ — verify from sources before proposing design.
