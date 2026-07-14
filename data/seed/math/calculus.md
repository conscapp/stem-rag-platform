---
title: "Calculus and Mathematical Analysis"
subject: math
concepts: [calculus, differential_equations, linear_algebra, series, probability]
---

# Calculus and Mathematical Methods

## Limits and Continuity

The limit $\lim_{x \to a} f(x) = L$ means: for every $\varepsilon > 0$ there exists $\delta > 0$ such that
$0 < |x - a| < \delta$ implies $|f(x) - L| < \varepsilon$.

A function is continuous at $a$ if $\lim_{x \to a} f(x) = f(a)$. Continuity on a closed interval $[a,b]$
guarantees the Extreme Value Theorem (attains max/min) and the Intermediate Value Theorem.

One-sided limits and infinite limits extend the definition; a limit exists iff both one-sided limits agree
and are finite. Standard algebraic limit laws (sum, product, quotient when denominator $\neq 0$) follow
from the $\varepsilon$–$\delta$ definition.

Indeterminate forms $0/0$, $\infty/\infty$ are resolved by algebraic simplification, conjugation, or
L'Hôpital's rule when hypotheses hold: if $f$ and $g$ are differentiable near $a$ (except possibly at $a$),
$\lim f/g$ is $0/0$ or $\infty/\infty$, and $\lim f'/g'$ exists, then $\lim f/g = \lim f'/g'$.

## Derivatives

Definition (difference quotient):
$$f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}$$

Geometrically $f'(x)$ is the slope of the tangent; physically it is instantaneous rate of change
(velocity from position, current from charge, heat flux from temperature gradients in continuum models).

Common rules:
- Power rule: $\frac{d}{dx} x^n = nx^{n-1}$
- Product rule: $(fg)' = f'g + fg'$
- Quotient rule: $(f/g)' = (f'g - fg')/g^2$
- Chain rule: $\frac{d}{dx} f(g(x)) = f'(g(x)) \cdot g'(x)$

Higher derivatives: $f'' = (f')'$, etc. Taylor's theorem with remainder connects derivatives to local
polynomial approximation. Implicit differentiation and logarithmic differentiation handle equations
$F(x,y)=0$ and products of many factors.

Critical points satisfy $f'(x)=0$ or $f'$ undefined. The first-derivative test and second-derivative
test classify local extrema. Concavity is governed by $f''$: $f''>0$ convex (concave up).

## Integration

An antiderivative $F$ of $f$ satisfies $F'=f$. The definite integral $\int_a^b f(x)\,dx$ is the signed
area (Riemann sum limit) under $y=f(x)$ from $a$ to $b$.

**Fundamental theorem of calculus (FTC):**
1. If $f$ is continuous on $[a,b]$ and $F(x)=\int_a^x f(t)\,dt$, then $F'(x)=f(x)$.
2. If $F'=f$ on $[a,b]$, then $\int_a^b f(x)\,dx = F(b)-F(a)$.

Common integrals:
- $\int x^n\,dx = \frac{x^{n+1}}{n+1} + C$ ($n \neq -1$)
- $\int e^x\,dx = e^x + C$
- $\int \frac{1}{x}\,dx = \ln|x| + C$
- $\int \sin x\,dx = -\cos x + C$, $\int \cos x\,dx = \sin x + C$

Techniques: substitution ($u$-sub mirrors chain rule), integration by parts
$\int u\,dv = uv - \int v\,du$, partial fractions for rational functions, trigonometric substitution
for $\sqrt{a^2\pm x^2}$ forms. Improper integrals extend limits to $\pm\infty$ or singularities;
convergence must be checked separately.

Applications: area between curves, volumes (disk/washer/shell), arc length
$L=\int_a^b\sqrt{1+(y')^2}\,dx$, work $W=\int F\,dx$, center of mass, average value
$\frac{1}{b-a}\int_a^b f$.

## Multivariable Calculus

For $f:\mathbb{R}^n\to\mathbb{R}$, partial derivatives $\partial f/\partial x_i$ hold other variables fixed.
The gradient $\nabla f = (\partial f/\partial x_1,\ldots,\partial f/\partial x_n)$ points in the direction
of steepest ascent; directional derivative is $\nabla f\cdot\mathbf{u}$.

Differentiability implies the linear approximation
$f(\mathbf{x}+\mathbf{h})\approx f(\mathbf{x})+\nabla f\cdot\mathbf{h}$. The Hessian matrix of second
partials classifies critical points (positive definite $\Rightarrow$ local min).

Multiple integrals: $\iint_D f\,dA$, $\iiint_E f\,dV$; Fubini's theorem justifies iterated integrals
when $f$ is continuous on a rectangle. Change of variables uses the Jacobian determinant:
$\iint_D f(x,y)\,dx\,dy = \iint_{D'} f(\mathbf{g}(u,v))\,|\det D\mathbf{g}|\,du\,dv$.

Vector calculus (physics/engineering bridge):
- Divergence theorem: $\iiint_E (\nabla\cdot\mathbf{F})\,dV = \iint_{\partial E} \mathbf{F}\cdot d\mathbf{S}$
- Stokes' theorem: $\iint_S (\nabla\times\mathbf{F})\cdot d\mathbf{S} = \oint_{\partial S} \mathbf{F}\cdot d\mathbf{r}$
- Gradient theorem: $\int_C \nabla f\cdot d\mathbf{r} = f(B)-f(A)$

These unify line, surface, and volume integrals and underlie Maxwell's equations and continuum mechanics.

## Differential Equations

First-order linear: $\frac{dy}{dx} + P(x)y = Q(x)$

Integrating factor $\mu(x) = e^{\int P(x)\,dx}$ yields
$\frac{d}{dx}(\mu y) = \mu Q$, then integrate.

Separable: $dy/dx = g(x)h(y)$ $\Rightarrow$ $\int dy/h(y) = \int g(x)\,dx$.

Second-order homogeneous constant-coefficient: $ay'' + by' + cy = 0$

Characteristic equation: $ar^2 + br + c = 0$. Roots determine exponential, repeated-root, or
oscillatory ($e^{\alpha x}\cos/\sin$) solutions. Nonhomogeneous equations use undetermined coefficients
or variation of parameters.

Systems $\mathbf{x}'=A\mathbf{x}$ are solved via eigenvalues/eigenvectors of $A$. PDEs of physics
(heat, wave, Laplace) reduce via separation of variables to ODEs plus Fourier series.

## Calculus of Variations

Extremize functionals $J[y]=\int_a^b L(x,y,y')\,dx$. Stationary paths satisfy the Euler–Lagrange equation
$$\frac{\partial L}{\partial y} - \frac{d}{dx}\left(\frac{\partial L}{\partial y'}\right)=0.$$
Lagrangian mechanics is the physical instance: $L=T-V$ yields Newton's laws for conservative systems.

## Linear Algebra (supporting calculus)

Matrix multiplication: $(AB)_{ij} = \sum_k A_{ik} B_{kj}$

Determinant 2×2: $\det\begin{pmatrix} a & b \\ c & d \end{pmatrix} = ad - bc$

Eigenvalues: $\det(A - \lambda I) = 0$. Diagonalization $A=PDP^{-1}$ decouples linear ODE systems
and quadratic forms. Orthogonal projections and least squares minimize $\|A\mathbf{x}-\mathbf{b}\|_2$.

## Series

Geometric series: $\sum_{n=0}^{\infty} r^n = 1/(1-r)$ for $|r|<1$.

Taylor series: $f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!}(x-a)^n$

Common expansions: $e^x = \sum_{n=0}^{\infty} \frac{x^n}{n!}$,
$\sin x = \sum_{n=0}^{\infty} \frac{(-1)^n x^{2n+1}}{(2n+1)!}$,
$\cos x = \sum_{n=0}^{\infty} \frac{(-1)^n x^{2n}}{(2n)!}$.

Power series may be differentiated/integrated termwise inside the radius of convergence. Fourier series
represent periodic functions as $\sum (a_n\cos nx + b_n\sin nx)$, central to PDE solution methods
and signal analysis.

## Applications to Physics and Engineering

- Kinematics: $v=dx/dt$, $a=dv/dt$; position from integrating acceleration.
- Work–energy: $W=\int \mathbf{F}\cdot d\mathbf{r}$; conservative forces are gradients.
- Continuity / conservation laws: flux integrals and divergence theorem.
- Heat equation $u_t = k u_{xx}$ and wave equation $u_{tt}=c^2 u_{xx}$ from continuum balances.
- Optimization: Lagrange multipliers $\nabla f=\lambda\nabla g$ for constrained design.
- Control / circuits: linear ODEs for RLC circuits and first-order plant models.
