"""Solar tracker v5 (exact sizes): full build model for Autodesk Fusion (run through the Fusion MCP script tool).

Follows the team sketch of 10 Oct 2026: wooden base, pan servo hanging through a cut-out in
the middle of the base and turning the turntable directly, two uprights on the turntable,
panel tilting between them with the tilt servo on the side, LDR sensor on the panel.

Every size lives in DIM below. Values marked "MEASURE" are datasheet or typical values the
team should check with calipers; change them and re-run to rebuild.

v5 changes from v4:
  - back to a servo cut-out in the base instead of a printed holder (one print less).
    Easy way to cut it: drill two overlapping 13 mm holes, square the corners with a chisel.
  - two plain plywood strips under the base lift it so the hanging servo clears the table
  - pan servo cable runs under the base and out of the front edge; still no cable holes

v4 changes from v3 (easier to build by hand):
  - no cut-outs and no cable holes: the base is one flat plate, the pan servo stands on top
    of it in a printed holder, and everything sits higher instead
  - no rails under the base
  - wires run straight from each part to the breadboard, the way they will be plugged in
  - the only holes left are small drilled screw holes

v3 changes from v2:
  - panel balanced on the tilt axis (centre of mass measured in Fusion, panel shifted by
    bal_dy / bal_dz), so it holds its angle with the servos off
  - tilt axis raised 15 mm so the panel can tip to 90 deg (self-cleaning: dirt slides off)
  - 4 horn screws per coupler instead of 2 (cleaning shakes load the horn joints)
  - anti-wobble pads sit 0.5 mm under the turntable: they only touch if it rocks

Component names start with what the part is:
  WOOD   cut from plywood (table saw, drill, chisel)
  PRINT  3D printed in PETG on the Prusa MK4S
  BUY    a kit part, modelled only to check fit and clearance

Units: mm. World frame: Z up, origin = centre of the base footprint at floor level,
front = -Y, electronics on the +X side, turntable on the -X side.
"""
import math

import adsk.core
import adsk.fusion

app = adsk.core.Application.get()
design = adsk.fusion.Design.cast(app.activeProduct)
root = design.rootComponent

NEW = adsk.fusion.FeatureOperations.NewBodyFeatureOperation
CUT = adsk.fusion.FeatureOperations.CutFeatureOperation
JOIN = adsk.fusion.FeatureOperations.JoinFeatureOperation

DIM = {
    # plywood the workshop has: 3, 4 and 12 mm (MEASURE the real thickness)
    "ply_base": 12.0, "ply_thin": 4.0,
    "base_x": 270.0, "base_y": 170.0, "rail_w": 20.0,
    # SG-90 (generic SG90 spec-sheet drawing, see cad/parts_specs.md; MEASURE the kit servo)
    "sg_len": 22.5, "sg_wid": 12.2, "sg_hgt": 22.1, "sg_shaft_off": 6.0,
    "sg_tab_len": 32.2, "sg_tab_z": 15.6, "sg_tab_t": 2.4, "sg_tab_hole_pitch": 27.85,
    "sg_turret_r": 5.9, "sg_turret_h": 4.4, "sg_spline_r": 2.45, "sg_spline_h": 3.1,
    # double-arm horn from the servo bag (no published drawing; MEASURE)
    "horn_len": 32.0, "horn_w": 6.0, "horn_t": 1.6, "horn_hub_r": 3.5, "horn_hub_h": 4.0,
    # Arduino UNO R4 WiFi (official 68.58 x 53.34, Uno hole pattern)
    "uno_x": 68.58, "uno_y": 53.34, "uno_t": 1.6, "standoff_h": 4.0,
    # justPi 400-point breadboard JUS-19942: 83 x 55 (Botland); height typical, MEASURE
    "bb_x": 83.0, "bb_y": 55.0, "bb_z": 8.5,
    # DFRobot SEN0291 INA219: 30 x 22 x 1.0 board, 2 x M3 holes (DFRobot layout drawing)
    "ina_x": 30.0, "ina_y": 22.0, "ina_t": 1.0,
    # solar cell AKU-03695: 95 x 95 x 3 (Botland listing)
    "cell": 95.0, "cell_t": 3.0,
    # GL5528 LDR head
    "ldr_r": 2.55, "ldr_h": 2.4, "ldr_leg_pitch": 3.4,
    # layout
    "tt_x": 150.0, "tt_y": 100.0,      # turntable plate
    "tc_x": -50.0,                      # turntable centre (x); y = 0
    "upr_gap": 63.0, "upr_t": 6.0, "upr_w": 24.0, "upr_foot": 30.0,
    "pivot_above_tt": 85.0,             # tilt axis height: lets the panel tip to 90 deg for cleaning
    "bal_dy": -3.6, "bal_dz": -1.5,     # panel shift that puts its centre of mass on the tilt axis
    "panel": 100.0,                     # panel plate (square)
    "pad_r": 7.0, "pad_ring": 40.0,     # anti-tip slide pads
}
D = DIM

# Heights that follow from the sizes above
Z_BASE_TOP = D["ply_base"] * 2                       # base plate on two plywood strips
Z_SG_BOTTOM = Z_BASE_TOP - D["sg_tab_z"]             # pan servo hangs in the cut-out, tabs on top
Z_TURRET = Z_SG_BOTTOM + D["sg_hgt"] + D["sg_turret_h"]
Z_HORN_TOP = Z_TURRET + D["horn_hub_h"]
Z_COUPLER = Z_HORN_TOP - 2.0 + 0.2                   # 2 mm horn slot, 0.2 mm clearance
Z_TT = Z_COUPLER + 6.0                               # turntable underside
Z_TT_TOP = Z_TT + D["ply_thin"]
Z_PIVOT = Z_TT_TOP + D["pivot_above_tt"]
TC = D["tc_x"]


def cm(mm):
    return mm / 10.0


def P(x, y, z=0.0):
    return adsk.core.Point3D.create(cm(x), cm(y), cm(z))


def V(mm):
    return adsk.core.ValueInput.createByReal(cm(mm))


# ---------- assembly helpers ----------

def _matrix(origin, x, y, z):
    m = adsk.core.Matrix3D.create()
    m.setWithCoordinateSystem(P(*origin), adsk.core.Vector3D.create(*x),
                              adsk.core.Vector3D.create(*y), adsk.core.Vector3D.create(*z))
    return m


def add_comp(parent, name, origin=(0, 0, 0), x=(1, 0, 0), y=(0, 1, 0), z=(0, 0, 1)):
    occ = parent.occurrences.addNewComponent(_matrix(origin, x, y, z))
    occ.component.name = name
    return occ.component


def add_instance(parent, comp, origin, x, y, z):
    """Second instance of a component. Fusion 2705 applies a moved parent's offset twice
    here, so place it, measure the error, and re-add it with the error removed."""
    m = _matrix(origin, x, y, z)
    occ = parent.occurrences.addExistingComponent(comp, m)
    want, got = m.translation, occ.transform2.translation
    if not want.isEqualTo(got):
        occ.deleteMe()
        m.translation = adsk.core.Vector3D.create(2 * want.x - got.x, 2 * want.y - got.y,
                                                  2 * want.z - got.z)
        occ = parent.occurrences.addExistingComponent(comp, m)
    return occ


# ---------- feature helpers ----------

def _extrude(comp, prof, op, start, dist, target, name):
    ext = comp.features.extrudeFeatures
    inp = ext.createInput(prof, op)
    inp.startExtent = adsk.fusion.OffsetStartDefinition.create(V(start))
    inp.setOneSideExtent(adsk.fusion.DistanceExtentDefinition.create(V(dist)),
                         adsk.fusion.ExtentDirections.PositiveExtentDirection)
    if op != NEW:
        inp.participantBodies = [target]
    feat = ext.add(inp)
    if op == NEW:
        body = feat.bodies.item(0)
        body.name = name
        return body
    return target


def box(comp, x0, y0, z0, x1, y1, z1, name="", op=NEW, target=None):
    sk = comp.sketches.add(comp.xYConstructionPlane)
    sk.sketchCurves.sketchLines.addTwoPointRectangle(P(x0, y0), P(x1, y1))
    return _extrude(comp, sk.profiles.item(0), op, z0, z1 - z0, target, name)


def zcyl(comp, cx, cy, r, z0, z1, name="", op=NEW, target=None):
    sk = comp.sketches.add(comp.xYConstructionPlane)
    sk.sketchCurves.sketchCircles.addByCenterRadius(P(cx, cy), cm(r))
    return _extrude(comp, sk.profiles.item(0), op, z0, z1 - z0, target, name)


def _side_cyl(comp, plane, centre, axis, r, a0, a1, name, op, target):
    sk = comp.sketches.add(plane)
    sk.sketchCurves.sketchCircles.addByCenterRadius(sk.modelToSketchSpace(P(*centre)), cm(r))
    normal = sk.xDirection.crossProduct(sk.yDirection)
    sign = getattr(normal, axis)
    if sign > 0:
        return _extrude(comp, sk.profiles.item(0), op, a0, a1 - a0, target, name)
    return _extrude(comp, sk.profiles.item(0), op, -a1, a1 - a0, target, name)


def xcyl(comp, cy, cz, r, x0, x1, name="", op=NEW, target=None):
    return _side_cyl(comp, comp.yZConstructionPlane, (0, cy, cz), "x", r, x0, x1, name, op, target)


def ycyl(comp, cx, cz, r, y0, y1, name="", op=NEW, target=None):
    return _side_cyl(comp, comp.xZConstructionPlane, (cx, 0, cz), "y", r, y0, y1, name, op, target)


def wire(comp, pts, dia, name):
    """A cable or jumper bundle along a smooth path through the given points."""
    sk = comp.sketches.add(comp.xYConstructionPlane)
    col = adsk.core.ObjectCollection.create()
    for p in pts:
        col.add(P(*p))
    spline = sk.sketchCurves.sketchFittedSplines.add(col)
    path = comp.features.createPath(spline)
    pipes = comp.features.pipeFeatures
    inp = pipes.createInput(path, NEW)
    inp.sectionSize = V(dia)
    body = pipes.add(inp).bodies.item(0)
    body.name = name
    return body


# ---------- appearances ----------

_lib = app.materialLibraries.itemByName("Fusion Appearance Library")
_by_name = {_lib.appearances.item(i).name: _lib.appearances.item(i)
            for i in range(_lib.appearances.count)} if _lib else {}


def _look(*names):
    for n in names:
        if n in _by_name:
            return _by_name[n]
    return None


LOOK = {
    "wood": _look("Plywood", "Birch", "Pine", "Oak"),
    "print": _look("Plastic - Matte (Yellow)", "Plastic - Glossy (Yellow)"),
    "servo": _look("Plastic - Glossy (Blue)", "Plastic - Matte (Blue)"),
    "pcb": _look("Plastic - Glossy (Green)", "Plastic - Matte (Green)"),
    "cell": _look("Plastic - Glossy (Black)"),
    "black": _look("Plastic - Matte (Black)"),
    "white": _look("Plastic - Matte (White)", "ABS (White)"),
    "red": _look("Plastic - Glossy (Red)", "Plastic - Matte (Red)"),
    "metal": _look("Aluminum - Satin", "Steel - Satin", "Chrome - Polished"),
}


def paint(body, key):
    if LOOK.get(key):
        body.appearance = LOOK[key]
    return body


# ---------- bought parts ----------

def build_sg90(origin, x, y, z):
    """SG-90 with a double-arm horn. Local origin: output shaft axis at the body bottom,
    shaft +Z, body along +X, horn arm along Y."""
    c = add_comp(root, "BUY - SG-90 servo", origin, x, y, z)
    o, L, Wd, H = D["sg_shaft_off"], D["sg_len"], D["sg_wid"] / 2, D["sg_hgt"]
    case = box(c, -o, -Wd, 0, L - o, Wd, H, "Case")
    centre = (L - 2 * o) / 2
    tab = box(c, centre - D["sg_tab_len"] / 2, -Wd, D["sg_tab_z"],
              centre + D["sg_tab_len"] / 2, Wd, D["sg_tab_z"] + D["sg_tab_t"], op=JOIN, target=case)
    for s in (-1, 1):
        zcyl(c, centre + s * D["sg_tab_hole_pitch"] / 2, 0, 1.0, D["sg_tab_z"] - 1,
             D["sg_tab_z"] + D["sg_tab_t"] + 1, op=CUT, target=tab)
    zcyl(c, 0, 0, D["sg_turret_r"], H, H + D["sg_turret_h"], op=JOIN, target=case)
    paint(case, "servo")
    zt = H + D["sg_turret_h"]
    spline = paint(zcyl(c, 0, 0, D["sg_spline_r"], zt, zt + D["sg_spline_h"], "Spline"), "white")
    horn = zcyl(c, 0, 0, D["horn_hub_r"], zt, zt + D["horn_hub_h"], "Horn")
    box(c, -D["horn_w"] / 2, -D["horn_len"] / 2, zt + D["horn_hub_h"] - D["horn_t"],
        D["horn_w"] / 2, D["horn_len"] / 2, zt + D["horn_hub_h"], op=JOIN, target=horn)
    zcyl(c, 0, 0, D["sg_spline_r"] + 0.05, zt - 1, zt + D["sg_spline_h"], op=CUT, target=horn)
    paint(horn, "white")
    # cable leaves the far end of the case, low down
    paint(box(c, L - o, -2.0, 2.0, L - o + 3, 2.0, 3.4, "Cable stub"), "black")
    return c, spline


def build_arduino():
    """UNO R4 WiFi, simplified, with exact sizes from Arduino's ABX00087 drawing, STEP and drill
    file (see cad/parts_specs.md). Local: x along the 68.58 edge (USB edge at x=0), y across,
    PCB on z=0. Turned so the USB-C faces the back edge of the base."""
    xa, yu = 72.0, 83.0
    c = add_comp(root, "BUY - Arduino UNO R4 WiFi",
                 origin=(xa, yu, Z_BASE_TOP + D["standoff_h"]), x=(0, -1, 0), y=(1, 0, 0))
    pcb = box(c, 0, 0, 0, D["uno_x"], D["uno_y"], D["uno_t"], "PCB")
    for hx, hy in ((13.97, 2.54), (15.24, 50.8), (66.04, 7.62), (66.04, 35.56)):
        zcyl(c, hx, hy, 1.6, -1, 3, op=CUT, target=pcb)
    paint(pcb, "pcb")
    t = D["uno_t"]
    paint(box(c, -0.86, 33.10, t, 5.94, 42.64, t + 3.18, "USB-C port"), "metal")
    paint(box(c, -1.96, 3.46, t, 12.44, 12.86, t + 9.89, "Barrel jack"), "black")
    headers = [(27.94, 45.72, 2.54), (50.8, 63.5, 2.54), (18.796, 41.656, 50.8), (45.72, 63.5, 50.8)]
    for x0, x1, y0 in headers:
        paint(box(c, x0 - 1.27, y0 - 1.27, t, x1 + 1.27, y0 + 1.27, t + 8.5, "Header"), "black")
    # 5V, GND, A0-A3 on the power/analog row; D9, D10, SDA, SCL on the digital row
    used = [(38.10, 2.54), (40.64, 2.54), (50.8, 2.54), (53.34, 2.54), (55.88, 2.54),
            (58.42, 2.54), (39.116, 50.8), (36.576, 50.8), (21.336, 50.8), (18.796, 50.8)]
    for px, py in used:
        paint(box(c, px - 1.27, py - 1.27, t + 8.5, px + 1.27, py + 1.27, t + 22.5, "Dupont plug"), "black")
    paint(box(c, 30.0, 18.0, t, 48.0, 36.0, t + 3.2, "ESP32-S3 module"), "metal")
    return c


def build_breadboard():
    x0, y0 = 45.0, -78.0
    c = add_comp(root, "BUY - Breadboard 400", origin=(x0, y0, Z_BASE_TOP))
    bb = box(c, 0, 0, 0, D["bb_x"], D["bb_y"], D["bb_z"], "Breadboard")
    box(c, 0, D["bb_y"] / 2 - 1.5, D["bb_z"] - 2, D["bb_x"], D["bb_y"] / 2 + 1.5, D["bb_z"] + 1,
        op=CUT, target=bb)
    paint(bb, "white")
    # the 4 LDR resistors, one per sensor row, lying across the board
    for i in range(4):
        rx = 8 + i * 17.8
        paint(ycyl(c, rx, D["bb_z"] + 1.2, 1.15, 6.0, 26.0, "10k resistor"), "red")
    return c


def build_ina219():
    c = add_comp(root, "BUY - INA219 wattmeter", origin=(38.0, 45.0, Z_BASE_TOP + 3))
    t = D["ina_t"]
    pcb = paint(box(c, 0, 0, 0, D["ina_y"], D["ina_x"], t, "PCB"), "servo")
    paint(box(c, 1, 22, t, D["ina_y"] - 1, 30, t + 9.4, "Screw terminals"), "black")
    paint(box(c, 5, 0, t, 17, 6, t + 4.9, "Gravity connector"), "white")
    for hx in (3.5, 18.5):
        zcyl(c, hx, 12.0, 1.6, -1, t + 1, op=CUT, target=pcb)
    return c


# ---------- wood ----------

def build_base():
    """Plywood plate with one rectangular cut-out for the pan servo (drill two overlapping
    13 mm holes, square the corners with a chisel), on two plain plywood strips."""
    c = add_comp(root, "WOOD - Base plate 12 mm")
    hx, hy, t = D["base_x"] / 2, D["base_y"] / 2, D["ply_base"]
    plate = box(c, -hx, -hy, t, hx, hy, 2 * t, "Base plate")
    o, L = D["sg_shaft_off"], D["sg_len"]
    box(c, TC - o - 0.5, -D["sg_wid"] / 2 - 0.4, t - 1, TC + L - o + 0.5, D["sg_wid"] / 2 + 0.4,
        2 * t + 1, op=CUT, target=plate)                                   # pan servo cut-out
    centre = TC + (L - 2 * o) / 2
    for s in (-1, 1):                                                       # M2 pilot holes
        zcyl(c, centre + s * D["sg_tab_hole_pitch"] / 2, 0, 0.8, t - 1, 2 * t + 1, op=CUT, target=plate)
    paint(plate, "wood")
    strips = add_comp(root, "WOOD - Base strips 12 mm x2")
    for s in (-1, 1):
        x0 = s * hx - (D["rail_w"] if s > 0 else 0)
        paint(box(strips, x0, -hy, 0, x0 + D["rail_w"], hy, t, "Strip"), "wood")


# ---------- prints and moving parts ----------

def build_pads():
    c = add_comp(root, "PRINT - Slide pads x4")
    r = D["pad_ring"] / math.sqrt(2)
    for sx, sy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        pad = zcyl(c, TC + sx * r, sy * r, D["pad_r"], Z_BASE_TOP, Z_TT - 0.5, "Slide pad")
        zcyl(c, TC + sx * r, sy * r, 1.0, Z_BASE_TOP - 1, Z_BASE_TOP + 8, op=CUT, target=pad)
        paint(pad, "print")


def build_pan_head(sg90_comp):
    head = add_comp(root, "Pan head (turns)", origin=(TC, 0, 0))

    cp = add_comp(head, "PRINT - Pan coupler")
    body = zcyl(cp, 0, 0, 20, Z_COUPLER, Z_TT, "Pan coupler")
    box(cp, -D["horn_w"] / 2 - 0.3, -D["horn_len"] / 2 - 0.5, Z_COUPLER - 1,
        D["horn_w"] / 2 + 0.3, D["horn_len"] / 2 + 0.5, Z_COUPLER + 2.0, op=CUT, target=body)
    zcyl(cp, 0, 0, D["horn_hub_r"] + 0.5, Z_COUPLER - 1, Z_COUPLER + 2.0, op=CUT, target=body)
    zcyl(cp, 0, 0, 3.0, Z_COUPLER - 1, Z_TT + 1, op=CUT, target=body)      # screwdriver access
    for y in (-12, -8, 8, 12):                                             # 4 horn screws, not 2
        zcyl(cp, 0, y, 0.8, Z_COUPLER - 1, Z_TT + 1, op=CUT, target=body)
    paint(body, "print")

    tt = add_comp(head, "WOOD - Turntable 4 mm")
    plate = box(tt, -D["tt_x"] / 2, -D["tt_y"] / 2, Z_TT, D["tt_x"] / 2, D["tt_y"] / 2, Z_TT_TOP, "Turntable")
    zcyl(tt, 0, 0, 3.0, Z_TT - 1, Z_TT_TOP + 1, op=CUT, target=plate)
    for a in range(3):
        ang = math.radians(90 + a * 120)
        zcyl(tt, 15 * math.cos(ang), 15 * math.sin(ang), 1.1, Z_TT - 1, Z_TT_TOP + 1, op=CUT, target=plate)
    for s in (-1, 1):
        for fy in (-7, 7):
            zcyl(tt, s * (D["upr_gap"] + D["upr_t"] - 20), fy, 1.6, Z_TT - 1, Z_TT_TOP + 1, op=CUT, target=plate)
    paint(plate, "wood")

    g, t, w, f = D["upr_gap"], D["upr_t"], D["upr_w"] / 2, D["upr_foot"]
    top = Z_PIVOT + 14
    left = add_comp(head, "PRINT - Upright L (pivot)")
    ul = box(left, -g - t, -w, Z_TT_TOP, -g, w, top, "Upright L")
    box(left, -g - t, -w, Z_TT_TOP, -g - t + f, w, Z_TT_TOP + 4, op=JOIN, target=ul)
    xcyl(left, 0, Z_PIVOT, 1.7, -g - t - 1, -g + 1, op=CUT, target=ul)
    for fy in (-7, 7):
        zcyl(left, -g - t + 20, fy, 1.6, Z_TT_TOP - 1, Z_TT_TOP + 5, op=CUT, target=ul)
    paint(ul, "print")

    right = add_comp(head, "PRINT - Upright R (tilt servo)")
    ur = box(right, g, -w, Z_TT_TOP, g + t, w, top, "Upright R")
    box(right, g + t - f, -w, Z_TT_TOP, g + t, w, Z_TT_TOP + 4, op=JOIN, target=ur)
    o, L = D["sg_shaft_off"], D["sg_len"]
    box(right, g - 1, -D["sg_wid"] / 2 - 0.4, Z_PIVOT - (L - o) - 0.5, g + t + 1,
        D["sg_wid"] / 2 + 0.4, Z_PIVOT + o + 0.5, op=CUT, target=ur)        # servo pocket
    centre = (L - 2 * o) / 2
    for s in (-1, 1):
        xcyl(right, 0, Z_PIVOT - centre - s * D["sg_tab_hole_pitch"] / 2, 0.8, g - 1, g + t + 1,
             op=CUT, target=ur)
    for fy in (-7, 7):
        zcyl(right, g + t - 20, fy, 1.6, Z_TT_TOP - 1, Z_TT_TOP + 5, op=CUT, target=ur)
    paint(ur, "print")

    # tilt servo outside the right upright: tabs on the outer face, shaft pointing -X
    sx = g + t + D["sg_tab_z"] + D["sg_tab_t"]
    add_instance(head, sg90_comp, origin=(sx, 0, Z_PIVOT), x=(0, 0, -1), y=(0, -1, 0), z=(-1, 0, 0))
    build_tilt_head(head, sx)
    return head


def build_tilt_head(parent, servo_x):
    """Everything that tips. The panel, cell and sensor block are shifted by (bal_dy, bal_dz)
    so their combined centre of mass sits on the tilt axis: the panel then stays at any
    angle with the servo unpowered, and the servo only overcomes friction."""
    head = add_comp(parent, "Tilt head (tips)", origin=(0, 0, Z_PIVOT))
    half, hp = D["panel"] / 2, D["ply_thin"] / 2
    oy, oz = D["bal_dy"], D["bal_dz"]

    pp = add_comp(head, "WOOD - Panel plate 4 mm")
    plate = paint(box(pp, -half, -half + oy, -hp + oz, half, half + oy, hp + oz, "Panel plate"), "wood")
    holes = [(x, y) for x in (-45, 45) for y in (-8, 8)] + [(-6, half - 8), (6, half - 8)]
    for x, y in holes:
        zcyl(pp, x, y + oy, 1.1, -hp - 1 + oz, hp + 1 + oz, op=CUT, target=plate)

    cell = add_comp(head, "BUY - Solar cell 0.7 W")
    paint(box(cell, -D["cell"] / 2, -D["cell"] / 2 + oy, hp + oz, D["cell"] / 2, D["cell"] / 2 + oy,
              hp + D["cell_t"] + oz, "Solar cell"), "cell")

    # horn coupler: flange under the plate, tab on the tilt axis that the servo horn screws onto
    horn_face = servo_x - (D["sg_hgt"] + D["sg_turret_h"] + D["horn_hub_h"])
    hc = add_comp(head, "PRINT - Tilt horn coupler")
    tab_x1 = horn_face - 0.5
    cpl = box(hc, 35, -12 + oy, -hp - 4 + oz, tab_x1, 12 + oy, -hp + oz, "Tilt horn coupler")
    box(hc, tab_x1 - 5.5, -18, -16, tab_x1, 18, 10, op=JOIN, target=cpl)
    for y in (-12, -8, 8, 12):                                             # 4 horn screws, not 2
        xcyl(hc, y, 0, 0.8, tab_x1 - 6, tab_x1 + 1, op=CUT, target=cpl)
    for y in (-8, 8):
        zcyl(hc, 45, y + oy, 1.1, -hp - 5 + oz, -hp + 1 + oz, op=CUT, target=cpl)
    paint(cpl, "print")

    lug = add_comp(head, "PRINT - Pivot lug")
    g = D["upr_gap"]
    lb = box(lug, -tab_x1, -12 + oy, -hp - 4 + oz, -35, 12 + oy, -hp + oz, "Pivot lug")
    box(lug, -(g - 0.5), -10, -12, -(tab_x1 - 5.5), 10, 10, op=JOIN, target=lb)
    xcyl(lug, 0, 0, 1.25, -g - 1, -half - 1, op=CUT, target=lb)        # 2.5 mm: M3 self-taps into PETG
    for y in (-8, 8):
        zcyl(lug, -45, y + oy, 1.1, -hp - 5 + oz, -hp + 1 + oz, op=CUT, target=lb)
    paint(lb, "print")

    # M3 x 18 on the axis: turns freely in the upright (3.4 mm hole), threads into the lug
    bolt = add_comp(head, "BUY - M3 x 18 pivot bolt")
    sh = paint(xcyl(bolt, 0, 0, 1.5, -g - D["upr_t"] - 0.2, -g - D["upr_t"] + 17.8, "Shank"), "metal")
    xcyl(bolt, 0, 0, 2.75, -g - D["upr_t"] - 3.2, -g - D["upr_t"] - 0.2, op=JOIN, target=sh)

    # LDR sensor: block past the plate edge, four LDR pockets, shadow cross
    sb = add_comp(head, "PRINT - LDR sensor block")
    y0 = half + oy
    blk = box(sb, -11, y0, -hp + oz, 11, y0 + 22, hp + oz, "LDR sensor block")
    box(sb, -11, y0 - 15, -hp - 4 + oz, 11, y0 + 22, -hp + oz, op=JOIN, target=blk)
    cy = y0 + 11
    box(sb, -11, cy - 0.8, hp + oz, 11, cy + 0.8, hp + 20 + oz, op=JOIN, target=blk)
    box(sb, -0.8, y0, hp + oz, 0.8, y0 + 22, hp + 20 + oz, op=JOIN, target=blk)
    spots = ((-5.5, cy + 5.5), (5.5, cy + 5.5), (-5.5, cy - 5.5), (5.5, cy - 5.5))
    for (x, y) in spots:
        zcyl(sb, x, y, D["ldr_r"] + 0.1, hp - 1.0 + oz, hp + 0.1 + oz, op=CUT, target=blk)
        for s in (-1, 1):
            zcyl(sb, x + s * D["ldr_leg_pitch"] / 2, y, 0.45, -hp - 5 + oz, hp + oz, op=CUT, target=blk)
    for x in (-6, 6):
        zcyl(sb, x, y0 - 8, 1.1, -hp - 5 + oz, -hp + 1 + oz, op=CUT, target=blk)
    paint(blk, "print")
    ldr = add_comp(head, "BUY - GL5528 LDR x4")
    for i, (x, y) in enumerate(spots):
        paint(zcyl(ldr, x, y, D["ldr_r"], hp - 1.0 + oz, hp - 1.0 + D["ldr_h"] + oz, "LDR %d" % (i + 1)), "red")
    return head


def build_wiring():
    """Cables as they will really be plugged in: straight from each part to the breadboard,
    with a loose loop off the turntable edge so the head can turn. No holes needed."""
    c = add_comp(root, "BUY - Wiring")
    zp, ztt, zb = Z_PIVOT, Z_TT_TOP, Z_BASE_TOP
    g = D["upr_gap"]
    stub_x = D["sg_len"] - D["sg_shaft_off"] + 3
    # 4 LDR wires + common 5 V + 2 solar cell wires (Dupont jumpers): off the sensor block,
    # down past the turntable edge, across the base to the breadboard
    paint(wire(c, [(TC, 70, zp - 8), (TC - 10, 78, zp - 40), (TC, 72, ztt + 6),
                   (TC + 25, 62, zb + 8), (20, 15, zb + 8), (50, -28, zb + 11)],
               4.5, "Panel wires (7 jumpers)"), "black")
    # tilt servo cable: down the outside of the right upright, loop off the turntable, to the breadboard
    sx = TC + g + D["upr_t"] + D["sg_tab_z"] + D["sg_tab_t"]
    paint(wire(c, [(sx - 2.7, 0, zp - stub_x), (sx - 6, 16, zp - 35), (TC + g + 12, 30, ztt + 8),
                   (TC + 82, 52, zb + 10), (20, 35, zb + 6), (58, -28, zb + 11)],
               3.0, "Tilt servo cable"), "red")
    # pan servo cable: under the base, out of the front edge, up to the breadboard
    paint(wire(c, [(TC + stub_x, 0, Z_SG_BOTTOM + 2.7), (TC + 30, -40, 6), (25, -88, 7),
                   (40, -92, zb + 4), (66, -70, zb + 11)], 3.0, "Pan servo cable"), "red")
    # Arduino header plugs to the breadboard, and I2C to the INA219
    paint(wire(c, [(98, 30, zb + 32), (92, 5, zb + 24), (85, -30, zb + 14)], 5.0,
               "Jumper bundle Arduino-breadboard"), "black")
    paint(wire(c, [(72 + 50.8, 83 - 18.5, zb + 30), (100, 70, zb + 30), (60, 70, zb + 22),
                   (49, 72, zb + 12)], 3.0, "I2C to INA219"), "black")
    # USB-C cable to the laptop, out of the back edge
    paint(wire(c, [(72 + 34.5, 89, zb + D["standoff_h"] + 3), (72 + 34.5, 110, zb + 4),
                   (72 + 34.5, 140, 3)], 4.0, "USB-C cable to laptop"), "black")


def build_standoffs():
    c = add_comp(root, "PRINT - Arduino standoffs x4")
    xa, yu = 72.0, 83.0
    for hx, hy in ((13.97, 2.54), (15.24, 50.8), (66.04, 7.62), (66.04, 35.56)):
        wx, wy = xa + hy, yu - hx
        s = zcyl(c, wx, wy, 3.0, Z_BASE_TOP, Z_BASE_TOP + D["standoff_h"], "Standoff")
        zcyl(c, wx, wy, 1.1, Z_BASE_TOP - 1, Z_BASE_TOP + D["standoff_h"] + 1, op=CUT, target=s)
        paint(s, "print")


def run(_context: str):
    pan_servo, _ = build_sg90((TC, 0, Z_SG_BOTTOM), (1, 0, 0), (0, 1, 0), (0, 0, 1))
    build_base()
    build_pads()
    build_arduino()
    build_standoffs()
    build_breadboard()
    build_ina219()
    build_pan_head(pan_servo)
    build_wiring()
    if design.snapshots.hasPendingSnapshot:
        design.snapshots.add()
    app.activeViewport.fit()
    print("Z: base top %.1f, servo bottom %.1f, coupler %.1f, turntable %.1f-%.1f, pivot %.1f"
          % (Z_BASE_TOP, Z_SG_BOTTOM, Z_COUPLER, Z_TT, Z_TT_TOP, Z_PIVOT))
    print("components:", [x.name for x in root.allOccurrences])
