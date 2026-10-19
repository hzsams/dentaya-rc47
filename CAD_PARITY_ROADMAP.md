# DentAYA Design — CAD Parity Roadmap

## Şu an

Step 9 sonrası DentAYA Design:

```text
STL/PLY source
Wizard / Expert
Manual margin points
Smooth margin spline
Insertion axis from camera
Undercut orientation map
Procedural tooth-family anatomy
Freeform add/remove/smooth
Real source-distance contact preview
Clearance/thickness proxy
Section clipping
Wireframe
Measurements
Undo / redo
STL export
Version + clinic review
```

noktasındadır.

## Bir sonraki geometri kernel fazı

### Kernel 1 — Trustworthy scan geometry

- Float64 geometry-of-record
- render için Float32 copy
- indexed/welded mesh
- half-edge adjacency
- AABB / BVH
- curvature
- geodesic path
- surface-constrained spline

### Kernel 2 — Margin

- seed point
- ridge/curvature assisted proposal
- supragingival / subgingival strategy
- magnetic draw
- drag point
- add / remove point
- mesh projection
- local scan repair journal

### Kernel 3 — Crown bottom

Input:

```text
prep mesh
margin curve
insertion axis
cement gap
material profile
```

Output:

```text
intaglio surface
blockout
margin transition
sealed bottom
```

### Kernel 4 — Anatomy

- licensed/open tooth libraries
- FDI mapping
- cusp/side semantic regions
- RBF / cage deformation
- adapt adjacent
- adapt antagonist
- preserve morphology

### Kernel 5 — Shell + QC

- manifold boolean
- watertight shell
- self-intersection
- wall thickness
- margin-fit deviation
- seating penetration
- connector area
- deterministic STL

## Kaynak politikası

DentAYA:

- proprietary Exocad source kullanmayacak
- crack / leak / reverse-engineered source kullanmayacak
- kamuya açık dokümantasyonu yalnız workflow araştırması için kullanacak
- açık kaynak kodu yalnız açık lisansı doğrulandıktan sonra dependency / attribution ile kullanacak

Bu yaklaşım yatırım, IP due diligence ve ileride tıbbi yazılım kalite süreçleri için önemlidir.
