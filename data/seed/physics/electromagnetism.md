---
title: "Electromagnetism and Circuits"
subject: physics
concepts: [electromagnetism, circuits, optics, calculus, conservation_energy]
---

# Electromagnetism and Circuits

## Coulomb's Law and Electrostatics

Force between point charges:
$$F = k\frac{q_1 q_2}{r^2},\qquad k=\frac{1}{4\pi\epsilon_0}=8.99\times 10^9\,\mathrm{N\cdot m^2/C^2}.$$

Electric field: $\vec{E}=\vec{F}/q$. Superposition holds: $\vec{E}=\sum\vec{E}_i$.
Gauss's law (integral): $\oint\vec{E}\cdot d\vec{A}=Q_{\mathrm{enc}}/\epsilon_0$; differential form
$\nabla\cdot\vec{E}=\rho/\epsilon_0$.

Potential: $V=U/q$, $\vec{E}=-\nabla V$. For a point charge $V=kq/r$ (taking $V(\infty)=0$).
Capacitance $C=Q/V$; energy stored $\frac{1}{2}CV^2=\frac{1}{2}\epsilon_0\int E^2\,dV$ in vacuum.

## Magnetostatics

Biot–Savart and Ampère's law: $\oint\vec{B}\cdot d\vec{l}=\mu_0 I_{\mathrm{enc}}$ (steady currents;
displacement current completes the story). Force on a charge: Lorentz force
$\vec{F}=q(\vec{E}+\vec{v}\times\vec{B})$. Force on a wire: $\vec{F}=I\vec{L}\times\vec{B}$.

## Induction and Maxwell's Equations

Faraday's law: $\oint\vec{E}\cdot d\vec{l}=-\frac{d\Phi_B}{dt}$. Lenz's law fixes the sign
(opposes change in flux). Self-inductance: $\mathcal{E}=-L\,dI/dt$; energy $\frac{1}{2}LI^2$.

**Maxwell's equations (SI, differential form):**
$$\nabla\cdot\vec{E}=\frac{\rho}{\epsilon_0},\quad
\nabla\cdot\vec{B}=0,\quad
\nabla\times\vec{E}=-\frac{\partial\vec{B}}{\partial t},\quad
\nabla\times\vec{B}=\mu_0\vec{J}+\mu_0\epsilon_0\frac{\partial\vec{E}}{\partial t}.$$

Integral companions: Gauss (E), Gauss (B: no magnetic monopoles), Faraday, Ampère–Maxwell.
The displacement current $\epsilon_0\partial\vec{E}/\partial t$ makes the system consistent with
charge conservation $\nabla\cdot\vec{J}+\partial\rho/\partial t=0$.

## Electromagnetic Waves

In free space, Maxwell's equations imply wave equations for $\vec{E}$ and $\vec{B}$ with speed
$c=1/\sqrt{\mu_0\epsilon_0}\approx 3\times 10^8\,\mathrm{m/s}$. Plane waves are transverse;
$E/B=c$, Poynting vector $\vec{S}=\frac{1}{\mu_0}\vec{E}\times\vec{B}$ carries energy flux.
Relation $c=f\lambda$ connects frequency and wavelength across the spectrum.

## Circuits

Ohm's law: $V=IR$. Power: $P=IV=I^2R=V^2/R$.

Series: $R_{\mathrm{eq}}=\sum R_i$. Parallel: $1/R_{\mathrm{eq}}=\sum 1/R_i$.

Kirchhoff: $\sum V=0$ around loops; $\sum I=0$ at nodes (charge conservation).

RC charging: $V_C(t)=V(1-e^{-t/RC})$; RL: $I(t)=I_\infty(1-e^{-t/\tau})$, $\tau=L/R$.
AC phasors: impedance $Z=R+j(\omega L-1/(\omega C))$; resonance when $\omega L=1/(\omega C)$.

## Continuum and Plasma Link

In conducting fluids and plasmas, Maxwell's equations couple to fluid momentum via $\vec{J}\times\vec{B}$
(MHD). Magnetic Reynolds number and frozen-in flux approximate ideal MHD — the theoretical backbone
of magnetic confinement fusion and space plasma physics.
