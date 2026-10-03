"""Generate the fourth Seasonal articulated-grid proof for FreeCAD and Orca.

This keeps the modest lattice scale while thinning the hub rings, closing the
link gaps, and separating the peg into a broad octagonal seat plus a clearly
visible triangular pumpkin shaft repeated as a mark on the push top.
"""

from math import cos, pi, sin
from pathlib import Path
from tempfile import TemporaryDirectory

import FreeCAD as App
import Mesh
import Part


ROOT = Path(__file__).resolve().parent
EXPORTS = ROOT / "exports"
EXPORTS.mkdir(exist_ok=True)

PEG_AF = 5.4
HUB_AF = 9.0
PITCH = 12.5
BODY_HEIGHT = 3.6
GRIP_HEIGHT = 5.0
PUSH_TOP_AF = 8.0
PUSH_TOP_HEIGHT = 2.0
PUNCTURE_DEPTH = 5.5
SOCKET_CLEARANCES = (0.25, 0.35, 0.45)

PIN_RADIUS = 0.80
BARREL_OUTER_RADIUS = 1.50
BARREL_INNER_RADIUS = 1.10
BARREL_LENGTH = 1.00
ARM_WIDTH = 1.00
ARM_HEIGHT = 1.70
HUB_ARM_INSET = 4.00

doc = App.newDocument("SeasonalGridV4Coupon")


def add(name, label, shape):
    obj = doc.addObject("PartDesign::Feature", name)
    obj.Label = label
    obj.Shape = shape
    return obj


def polygon_face(points, z=0.0):
    vertices = [App.Vector(x, y, z) for x, y in points]
    vertices.append(vertices[0])
    return Part.Face(Part.makePolygon(vertices))


def octagon_face(across_flats, x, y, z=0.0):
    radius = across_flats / (2.0 * cos(pi / 8.0))
    points = []
    for index in range(8):
        angle = pi / 8.0 + index * pi / 4.0
        points.append((x + radius * cos(angle), y + radius * sin(angle)))
    return polygon_face(points, z)


def octagon_prism(across_flats, height, x, y, z=0.0):
    return octagon_face(across_flats, x, y, z).extrude(App.Vector(0, 0, height))


def triangle_face(length, width, x, y, z=0.0):
    return polygon_face(
        [
            (x - length / 2.0, y - width / 2.0),
            (x - length / 2.0, y + width / 2.0),
            (x + length / 2.0, y),
        ],
        z,
    )


def arrow_peg(x, y):
    shank = octagon_prism(PEG_AF, BODY_HEIGHT, x, y)
    retention_rib = octagon_prism(PEG_AF + 0.10, 0.25, x, y, 1.0)

    grip_lower = octagon_face(5.8, x, y, BODY_HEIGHT)
    grip_upper = octagon_face(6.4, x, y, BODY_HEIGHT + GRIP_HEIGHT)
    grip = Part.makeLoft(
        [Part.Wire(grip_lower.Edges), Part.Wire(grip_upper.Edges)],
        True,
        False,
    )
    push_top = octagon_prism(
        PUSH_TOP_AF,
        PUSH_TOP_HEIGHT,
        x,
        y,
        BODY_HEIGHT + GRIP_HEIGHT,
    )
    triangle_mark = triangle_face(
        5.5,
        4.2,
        x,
        y,
        BODY_HEIGHT + GRIP_HEIGHT + PUSH_TOP_HEIGHT - 0.50,
    ).extrude(App.Vector(0, 0, 0.51))

    puncture_base = triangle_face(4.4, 3.5, x, y, 0.0)
    puncture_shaft = triangle_face(4.4, 3.5, x, y, -4.0)
    puncture_tip = triangle_face(1.20, 0.70, x, y, -PUNCTURE_DEPTH)
    puncture = Part.makeLoft(
        [
            Part.Wire(puncture_base.Edges),
            Part.Wire(puncture_shaft.Edges),
            Part.Wire(puncture_tip.Edges),
        ],
        True,
        False,
    )
    return (
        shank.fuse(retention_rib)
        .fuse(grip)
        .fuse(push_top)
        .fuse(puncture)
        .cut(triangle_mark)
    )


def hub(x, y, socket_clearance):
    outer = octagon_prism(HUB_AF, BODY_HEIGHT, x, y)
    socket = octagon_prism(PEG_AF + socket_clearance, BODY_HEIGHT + 0.2, x, y, -0.1)
    return outer.cut(socket)


def tube(radius_outer, radius_inner, length, base, direction):
    return Part.makeCylinder(radius_outer, length, base, direction).cut(
        Part.makeCylinder(radius_inner, length + 0.02, base - direction * 0.01, direction)
    )


def connect_horizontal(left_shape, right_shape, left_x, right_x, y):
    middle = (left_x + right_x) / 2.0
    z_center = BODY_HEIGHT / 2.0
    axis = App.Vector(0, 1, 0)

    pin = Part.makeCylinder(PIN_RADIUS, 3.20, App.Vector(middle, y - 1.60, z_center), axis)
    pin_neck = Part.makeBox(
        middle - (left_x + HUB_ARM_INSET),
        ARM_WIDTH,
        ARM_HEIGHT,
        App.Vector(left_x + HUB_ARM_INSET, y - ARM_WIDTH / 2.0, z_center - ARM_HEIGHT / 2.0),
    )
    left_shape = left_shape.fuse(pin).fuse(pin_neck)

    cheek_a = tube(
        BARREL_OUTER_RADIUS,
        BARREL_INNER_RADIUS,
        BARREL_LENGTH,
        App.Vector(middle, y - 1.90, z_center),
        axis,
    )
    cheek_b = tube(
        BARREL_OUTER_RADIUS,
        BARREL_INNER_RADIUS,
        BARREL_LENGTH,
        App.Vector(middle, y + 0.90, z_center),
        axis,
    )
    arm_length = right_x - HUB_ARM_INSET - (middle + 1.10)
    support_a = Part.makeBox(
        arm_length,
        ARM_WIDTH,
        ARM_HEIGHT,
        App.Vector(middle + 1.10, y - 1.90, z_center - ARM_HEIGHT / 2.0),
    )
    support_b = Part.makeBox(
        arm_length,
        ARM_WIDTH,
        ARM_HEIGHT,
        App.Vector(middle + 1.10, y + 0.80, z_center - ARM_HEIGHT / 2.0),
    )
    right_shape = right_shape.fuse(cheek_a).fuse(cheek_b).fuse(support_a).fuse(support_b)
    return left_shape, right_shape


def connect_vertical(lower_shape, upper_shape, x, lower_y, upper_y):
    middle = (lower_y + upper_y) / 2.0
    z_center = BODY_HEIGHT / 2.0
    axis = App.Vector(1, 0, 0)

    pin = Part.makeCylinder(PIN_RADIUS, 3.20, App.Vector(x - 1.60, middle, z_center), axis)
    pin_neck = Part.makeBox(
        ARM_WIDTH,
        middle - (lower_y + HUB_ARM_INSET),
        ARM_HEIGHT,
        App.Vector(x - ARM_WIDTH / 2.0, lower_y + HUB_ARM_INSET, z_center - ARM_HEIGHT / 2.0),
    )
    lower_shape = lower_shape.fuse(pin).fuse(pin_neck)

    cheek_a = tube(
        BARREL_OUTER_RADIUS,
        BARREL_INNER_RADIUS,
        BARREL_LENGTH,
        App.Vector(x - 1.90, middle, z_center),
        axis,
    )
    cheek_b = tube(
        BARREL_OUTER_RADIUS,
        BARREL_INNER_RADIUS,
        BARREL_LENGTH,
        App.Vector(x + 0.90, middle, z_center),
        axis,
    )
    arm_length = upper_y - HUB_ARM_INSET - (middle + 1.10)
    support_a = Part.makeBox(
        ARM_WIDTH,
        arm_length,
        ARM_HEIGHT,
        App.Vector(x - 1.90, middle + 1.10, z_center - ARM_HEIGHT / 2.0),
    )
    support_b = Part.makeBox(
        ARM_WIDTH,
        arm_length,
        ARM_HEIGHT,
        App.Vector(x + 0.80, middle + 1.10, z_center - ARM_HEIGHT / 2.0),
    )
    upper_shape = upper_shape.fuse(cheek_a).fuse(cheek_b).fuse(support_a).fuse(support_b)
    return lower_shape, upper_shape


hub_shapes = {}
for row in range(2):
    for column, clearance in enumerate(SOCKET_CLEARANCES):
        x = 10.0 + column * PITCH
        y = 10.0 + row * PITCH
        hub_shapes[(row, column)] = hub(x, y, clearance)

for row in range(2):
    for column in range(2):
        left = (row, column)
        right = (row, column + 1)
        hub_shapes[left], hub_shapes[right] = connect_horizontal(
            hub_shapes[left],
            hub_shapes[right],
            10.0 + column * PITCH,
            10.0 + (column + 1) * PITCH,
            10.0 + row * PITCH,
        )

for column in range(3):
    lower = (0, column)
    upper = (1, column)
    hub_shapes[lower], hub_shapes[upper] = connect_vertical(
        hub_shapes[lower],
        hub_shapes[upper],
        10.0 + column * PITCH,
        10.0,
        22.5,
    )

lattice_objects = []
for row in range(2):
    for column, clearance in enumerate(SOCKET_CLEARANCES):
        lattice_objects.append(
            add(
                f"HubR{row + 1}C{column + 1}",
                f"Articulated hub {row + 1},{column + 1} clearance {clearance:.2f} mm",
                hub_shapes[(row, column)],
            )
        )


# No straight fit gauge: the three seating clearances remain in the lattice
# columns, while the rest of the plate is limited to identical pegs.
peg_objects = []
for index in range(3):
    peg = arrow_peg(0.0, 0.0)
    peg.rotate(App.Vector(0, 0, 0), App.Vector(1, 0, 0), 180)
    peg.translate(
        App.Vector(
            50.0 + index * 14.0,
            15.5,
            BODY_HEIGHT + GRIP_HEIGHT + PUSH_TOP_HEIGHT,
        )
    )
    peg_objects.append(add(f"ArrowPeg{index + 1}", "V4 wide triangle puncture peg", peg))


doc.recompute()
with TemporaryDirectory(prefix="seasonal-grid-") as temporary_directory:
    temporary_document = Path(temporary_directory) / "seasonal-grid-v4-coupon.FCStd"
    doc.saveAs(str(temporary_document))
    temporary_document.replace(ROOT / "seasonal-grid-v4-coupon.FCStd")

Mesh.export(lattice_objects, str(EXPORTS / "GridJointCoupon.stl"))
Mesh.export([peg_objects[0]], str(EXPORTS / "ArrowPeg.stl"))

plate_objects = [*lattice_objects, *peg_objects]
Mesh.export(plate_objects, str(EXPORTS / "seasonal-grid-v4-coupon.3mf"))

print(
    f"Generated {len(lattice_objects)} articulated hubs and "
    f"{len(peg_objects)} pegs in {EXPORTS}"
)
