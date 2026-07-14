---
title: "Ordinary Differential Equations and Analysis"
subject: math
concepts: [differential_equations, calculus, linear_algebra, series]
---

# Ordinary Differential Equations and Related Analysis

## First-Order Equations

A first-order ODE relates $y$ and $y'=dy/dx$. Standard forms:

**Separable:** $y' = g(x)h(y)$. Separate and integrate $\int dy/h(y)=\int g(x)\,dx$.

**Linear:** $y' + P(x)y = Q(x)$. Multiplying by $\mu=e^{\int P\,dx}$ produces $(\mu y)'=\mu Q$.

**Exact:** $M(x,y)\,dx + N(x,y)\,dy=0$ is exact if $M_y=N_x$; then there is $F$ with $dF=0$ so
$F(x,y)=C$. Integrating factors restore exactness when the equation is nearly exact.

Existence/uniqueness (Picard–Lindelöf): if $f(x,y)$ and $\partial f/\partial y$ are continuous near
$(x_0,y_0)$, the IVP $y'=f(x,y)$, $y(x_0)=y_0$ has a unique local solution.

## Second-Order Linear Equations

$$y'' + p(x)y' + q(x)y = g(x)$$

Homogeneous solutions form a 2D vector space. Wronskian $W(y_1,y_2)=y_1 y_2'-y_2 y_1'$ tests
independence. Reduction of order: given one solution $y_1$, seek $y_2=v(x)y_1$.

Constant coefficients: characteristic polynomial $r^2+pr+q=0$. Complex roots $\alpha\pm i\beta$ give
$e^{\alpha x}(\cos\beta x,\sin\beta x)$ — the mathematical origin of underdamped oscillators.

**Resonance:** for undamped forced oscillator $y''+\omega_0^2 y = \cos\omega_0 t$, particular solutions
grow like $t\sin\omega_0 t$. Engineering implication: driving at natural frequency without damping
produces unbounded amplitude in the linear model.

## Systems and Linear Algebra

Write $\mathbf{x}'=A\mathbf{x}+\mathbf{f}(t)$. If $A$ is diagonalizable, $A=PDP^{-1}$ transforms to
decoupled scalar ODEs. Defective matrices require generalized eigenvectors and $t e^{\lambda t}$ terms.
Phase portraits classify 2D equilibria (nodes, saddles, spirals, centers) from eigenvalues of the
Jacobian at equilibria for nonlinear systems $\mathbf{x}'=\mathbf{F}(\mathbf{x})$.

## Sturm–Liouville and Eigenfunction Expansions

Regular Sturm–Liouville problems $(p y')'+q y+\lambda w y=0$ with separated BCs yield orthogonal
eigenfunctions in $L^2_w$. Heat and wave equations on finite intervals expand initial data in these
bases (Fourier sine/cosine series as special cases).

## Elementary PDE Bridge

Separation of variables for $u_t=k u_{xx}$ with $u(0,t)=u(L,t)=0$ yields modes
$\sin(n\pi x/L)\,e^{-k(n\pi/L)^2 t}$. The wave equation similarly yields standing waves. Laplace's
equation $\nabla^2 u=0$ appears in electrostatics and steady heat conduction; uniqueness follows from
maximum principles.

## Variational and Energy Methods

Many boundary-value problems are Euler–Lagrange equations of an energy functional. Weak formulations
$\int \nabla u\cdot\nabla v = \int f v$ underpin finite-element discretizations used throughout
engineering analysis.
