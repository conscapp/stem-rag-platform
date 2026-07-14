---
title: "Classical Mechanics Fundamentals"
subject: physics
concepts: [newton_laws, conservation_energy, conservation_momentum, mechanics, thermodynamics, calculus]
---

# Classical Mechanics Fundamentals

## Newton's Laws of Motion

**First Law (Inertia):** An object at rest stays at rest, and an object in motion stays in motion at constant velocity, unless acted upon by a net external force.

**Second Law:** The acceleration of an object is directly proportional to the net force and inversely proportional to mass:

$$F = ma \quad\text{or more generally}\quad \mathbf{F}=\frac{d\mathbf{p}}{dt}$$

where $\mathbf{p}=m\mathbf{v}$ is momentum. For variable mass systems (rockets), the thrust term
$v_{\mathrm{ex}}\,dm/dt$ appears explicitly.

**Third Law:** For every action, there is an equal and opposite reaction — equivalently, mutual forces
are equal and opposite, underpinning momentum conservation for isolated pairs.

## Work and Energy

Work by a force along a path: $W = \int_C \mathbf{F}\cdot d\mathbf{r}$. For constant force:
$W = F \cdot d \cos\theta$.

Kinetic energy: $KE = \frac{1}{2}mv^2$

Potential energy (gravitational near Earth): $PE = mgh$; for springs: $U=\frac{1}{2}kx^2$.

Work–energy theorem: $W_{\mathrm{net}}=\Delta KE$. Conservative forces satisfy
$\mathbf{F}=-\nabla U$ and path-independent work; then mechanical energy $E=KE+U$ is conserved
when non-conservative work vanishes.

Power: $P=\mathbf{F}\cdot\mathbf{v}=dW/dt$.

## Momentum and Collisions

Impulse $\mathbf{J}=\int\mathbf{F}\,dt=\Delta\mathbf{p}$. For an isolated system,
$\sum\mathbf{p}$ is constant. Elastic collisions conserve both momentum and kinetic energy;
inelastic collisions conserve momentum but dissipate KE (often to heat/deformation).

Center of mass: $\mathbf{R}=\sum m_i\mathbf{r}_i / M$ moves as a point particle under net external force.

## Rotational Motion

Torque: $\boldsymbol{\tau} = \mathbf{r}\times\mathbf{F}$, magnitude $\tau = rF\sin\theta$

Angular momentum: $\mathbf{L}=\mathbf{r}\times\mathbf{p}$; $\boldsymbol{\tau}_{\mathrm{net}}=d\mathbf{L}/dt$.
For rigid bodies about a principal axis: $\tau = I\alpha$, $L=I\omega$,
$KE_{\mathrm{rot}}=\frac{1}{2}I\omega^2$.

Moment of inertia examples: thin hoop $MR^2$, solid sphere $\frac{2}{5}MR^2$, rod about center
$\frac{1}{12}ML^2$. Parallel-axis theorem: $I=I_{\mathrm{cm}}+Md^2$.

Centripetal acceleration: $a_c = \frac{v^2}{r}=\omega^2 r$ toward the center; required by
$\mathbf{a}=\boldsymbol{\alpha}\times\mathbf{r}+\boldsymbol{\omega}\times(\boldsymbol{\omega}\times\mathbf{r})$.

## Lagrangian and Hamiltonian Formulations

With generalized coordinates $q_i$, Lagrangian $L=T-V$ yields Euler–Lagrange equations
$$\frac{d}{dt}\frac{\partial L}{\partial\dot q_i}-\frac{\partial L}{\partial q_i}=0.$$
Hamiltonian $H=\sum p_i\dot q_i - L$ with $p_i=\partial L/\partial\dot q_i$ gives
$\dot q_i=\partial H/\partial p_i$, $\dot p_i=-\partial H/\partial q_i$. These are the bridge from
Newtonian mechanics to continuum field theory and quantum mechanics.

## Oscillations

Simple harmonic motion: $\ddot x + \omega_0^2 x=0$, $\omega_0=\sqrt{k/m}$, period $T=2\pi/\omega_0$.
Damped: $\ddot x+2\beta\dot x+\omega_0^2 x=0$ (under/critical/over-damped). Driven damped oscillator
exhibits resonance near $\omega_0$ when damping is light — critical in structures and circuits.

## Thermodynamics (mechanical viewpoint)

First law: $\Delta U = Q - W$ (sign convention: $W$ work by system). For ideal gas $U=U(T)$ only
in the simplest models; $PV=nRT$.

Second law: entropy of an isolated system does not decrease; Carnot efficiency
$\eta = 1 - T_C/T_H$ is an upper bound for heat engines between two reservoirs.

## Continuum Bridge

Stress $\sigma$ and strain $\varepsilon$ relate via constitutive laws (Hooke: $\sigma=E\varepsilon$
in 1D). Combined with Newton's laws on continuum elements, one obtains wave equations in solids and
the Navier–Stokes equations in fluids — the research interface between classical mechanics and
engineering continuum physics.
