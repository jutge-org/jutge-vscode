# Taken from: https://github.com/jutge-org/pil-turtle
# This file should be refreshed whenever the turtle_pil library is updated.
# It is used locally to produce an `output.png` image instead of opening a TK window.

# pil-turtle 💊🐢

from PIL import Image, ImageDraw, ImageFont
import math
from typing import Optional, Any, Union, Tuple


# default width and height of the image
_SIZE = 501

# default filename for output
_FILENAME = 'output.png'


class Vec2D(tuple):

    # Class copied from original turtle.py at
    # https://github.com/python/cpython/blob/3.10/Lib/turtle.py

    def __new__(cls, x, y):
        return tuple.__new__(cls, (x, y))

    def __add__(self, other):
        return Vec2D(self[0]+other[0], self[1]+other[1])

    def __mul__(self, other):
        if isinstance(other, Vec2D):
            return self[0]*other[0]+self[1]*other[1]
        return Vec2D(self[0]*other, self[1]*other)

    def __rmul__(self, other):
        if isinstance(other, int) or isinstance(other, float):
            return Vec2D(self[0]*other, self[1]*other)
        return NotImplemented

    def __sub__(self, other):
        return Vec2D(self[0]-other[0], self[1]-other[1])

    def __neg__(self):
        return Vec2D(-self[0], -self[1])

    def __abs__(self):
        return math.hypot(*self)

    def rotate(self, angle):
        """rotate self counterclockwise by angle"""
        perp = Vec2D(-self[1], self[0])
        angle = math.radians(angle)
        c, s = math.cos(angle), math.sin(angle)
        return Vec2D(self[0]*c+perp[0]*s, self[1]*c+perp[1]*s)

    def angle(self):
        return math.degrees(math.atan2(self[1], self[0])) % 360.0

    def __getnewargs__(self):
        return (self[0], self[1])

    def __repr__(self):
        return "(%.2f,%.2f)" % self

    @staticmethod
    def direction(angle):
        angle = math.radians(angle)
        return Vec2D(math.cos(angle), math.sin(angle))


"""
Colors can be given by a string as described in https://pillow.readthedocs.io/en/stable/reference/ImageColor.html
or as an RBG tuple of integers in the 0-255 range. Here are some examples for the orange color:

'Orange'
'#FFA500'
'rgb(255,165,0)'
'hsl(39,100%,150%)'
'hsv(39,100%,100%)'
(255,165,0)
"""

Color = Union[str, Tuple[int, int, int]]


class Turtle:

    # horizontal and vertical size of the canvas
    _size: int

    # x and y position
    _xcor: float
    _ycor: float

    # heading
    _heading: float

    # pen size
    _pensize: float

    # pen color
    _pencolor: Color

    # pen down
    _pendown: bool

    # hide/show turtle (we do not show it but maintain its state)
    _isvisible: bool

    # PIL
    _img: Any
    _drw: Any

    def __init__(self, size: int = _SIZE):
        self.reset()

    def _draw_line(self, x1: float, y1: float, x2: float, y2: float) -> None:
        if self._pendown:
            x1 = x1 + self._size/2
            x2 = x2 + self._size/2
            y1 = self._size/2 - y1
            y2 = self._size/2 - y2
            self._drw.line([(x1, y1), (x2, y2)], fill=self._pencolor, width=self._pensize)

    def reset(self, size: int = _SIZE) -> None:
        assert size > 0
        self._size = size
        self._xcor = 0
        self._ycor = 0
        self._heading = 0
        self._pensize = 1
        self._pencolor = 'Black'
        self._pendown = True
        self._isvisible = False
        self.clear()

    def done(self, filename: str = _FILENAME) -> None:
        return self.save(filename)

    def clear(self) -> None:
        # this could better be done by painting a rectangle on the current drawing
        self._img = Image.new('RGB', (self._size, self._size), color='White')
        self._drw = ImageDraw.Draw(self._img)

    def save(self, filename: str = _FILENAME) -> None:
        self._img.save(filename)

    def forward(self, distance: float) -> None:
        x = self._xcor + distance * math.cos(math.radians(self._heading))
        y = self._ycor + distance * math.sin(math.radians(self._heading))
        self._draw_line(self._xcor, self._ycor, x, y)
        self._xcor, self._ycor = x, y

    def backward(self, distance: float) -> None:
        self.forward(-distance)

    def right(self, angle: float) -> None:
        self._heading -= angle

    def left(self, angle: float) -> None:
        self._heading += angle

    def goto(self, x: Union[float, Tuple[float, float]], y: Optional[float] = None) -> None:
        if y is None:
            x, y = x
        self._draw_line(self._xcor, self._ycor, x, y)
        self._xcor, self._ycor = x, y

    def setx(self, x: float) -> None:
        self._draw_line(self._xcor, self._ycor, x, self._ycor)
        self._xcor = x

    def sety(self, y: float) -> None:
        self._draw_line(self._xcor, self._ycor, self._xcor, y)
        self._ycor = y

    def setheading(self, to_angle: float) -> None:
        self._heading = to_angle

    def home(self) -> None:
        self.goto(0, 0)
        self.setheading(0)

    def circle(self, radius: float, extent: Optional[float] = None, steps: Optional[int] = None) -> None:
        if extent is None:
            extent = 360.0

        start = (self._heading - 90) % 360.0
        end = (start + extent) % 360.0

        if extent >= 360 - 1e-3 and abs(start - end) < 1e-3:
            end -= 1e-3  # make pillow draw full circle instead of nothing

        center = self.position() + Vec2D.direction(self._heading + 90) * radius

        x0 = self._size/2 + (center[0] - radius)
        x1 = self._size/2 + (center[0] + radius)
        y0 = self._size/2 - (center[1] - radius)
        y1 = self._size/2 - (center[1] + radius)

        x0, x1 = min(x0, x1), max(x0, x1)
        y0, y1 = min(y0, y1), max(y0, y1)

        xy = [(x0, y0), (x1, y1)]

        self._drw.arc(xy, -end, -start, fill=self._pencolor, width=self._pensize)

        self._heading = (self._heading + extent) % 360.0
        self._xcor, self._ycor = center + Vec2D.direction(end) * radius

    def dot(self, size: Optional[float] = None, color: Optional[Color] = None) -> None:
        if size is None:
            size = 3
        if color is None:
            color = self._pencolor
        assert size >= 1

        x0 = self._size/2 + self._xcor - size/2
        x1 = self._size/2 + self._xcor + size/2
        y0 = self._size/2 - self._ycor + size/2
        y1 = self._size/2 - self._ycor - size/2

        x0, x1 = min(x0, x1), max(x0, x1)
        y0, y1 = min(y0, y1), max(y0, y1)

        xy = [(x0, y0), (x1, y1)]

        self._drw.ellipse(xy, fill=color)

    def pendown(self) -> None:
        self._pendown = True

    def penup(self) -> None:
        self._pendown = False

    def isdown(self) -> bool:
        return self._pendown

    def pensize(self, width: Optional[float] = None) -> float:
        if width is not None:
            assert width >= 0
            self._pensize = max(1, round(width))
        return self._pensize

    def pencolor(self, color: Optional[Color] = None) -> Color:
        if color is not None:
            self._pencolor = color
        return self._pencolor

    def hideturtle(self) -> None:
        self._isvisible = False

    def showturtle(self) -> None:
        self._isvisible = True

    def isvisible(self) -> bool:
        return self._isvisible

    def position(self) -> Vec2D:
        return Vec2D(self._xcor, self._ycor)

    def xcor(self) -> float:
        return self._xcor

    def ycor(self) -> float:
        return self._ycor

    def heading(self) -> float:
        return self._heading

    def speed(self, _speed: Optional[int] = None) -> None:
        # nothing to do
        pass

    def color(self, color: Optional[Color] = None) -> None:
        # nothing to do
        pass

    def towards(self, x: Union[float, Tuple[float, float]], y: Optional[float] = None) -> float:
        if y is not None:
            pos = Vec2D(x, y)
        if isinstance(x, Vec2D):
            pos = x
        elif isinstance(x, tuple):
            pos = Vec2D(*x)
        direction = pos - self.position()
        return (direction.angle() - self._heading) % 360.0

    def distance(self, x: Union[float, Tuple[float, float]], y: Optional[float] = None) -> float:
        if y is not None:
            pos = Vec2D(x, y)
        if isinstance(x, Vec2D):
            pos = x
        elif isinstance(x, tuple):
            pos = Vec2D(*x)
        return abs(pos - self.position())

    def write(self, arg, move: bool = False, align: str = "left", font: Tuple[str, int, str] = ("Arial", 8, "normal")) -> None:
        text = str(arg)
        fontsize = font[1]
        fontname = font[0].lower()
        try:
            if fontname[-4:] != ".ttf":
                fontname = fontname + ".ttf"
            pilfont = ImageFont.truetype(fontname, fontsize)
        except:
            pilfont = ImageFont.truetype("Arial.ttf", fontsize)
        textwidth, textheight = self._drw.textsize(text, font=pilfont)
        x0 = self._size/2 + self._xcor
        y0 = self._size/2 - self._ycor - textheight/2
        if move:
            self._xcor += textwidth
        self._drw.text((x0, y0), text, fill=self._pencolor, align=align, font=pilfont)

    fd = forward
    back = backward
    bk = backward
    rt = right
    lt = left
    setpos = goto
    setposition = goto
    seth = setheading
    pd = pendown
    down = pendown
    pu = penup
    up = penup
    ht = hideturtle
    st = showturtle
    pos = position


#########################################################################
# operations without turtle object
#########################################################################

_default_turtle: Optional[Turtle] = None


def _turtle() -> Turtle:
    global _default_turtle
    if _default_turtle is None:
        _default_turtle = Turtle()
    return _default_turtle


def reset(size: int = 500) -> None:
    return _turtle().reset(size)


def done(filename: str = _FILENAME) -> None:
    return _turtle().done(filename)


def forward(distance: float) -> None:
    return _turtle().forward(distance)


def backward(distance: float) -> None:
    return _turtle().backward(distance)


def right(angle: float) -> None:
    return _turtle().right(angle)


def left(angle: float) -> None:
    return _turtle().left(angle)


def goto(x: Union[float, Tuple[float, float]], y: Optional[float] = None) -> None:
    return _turtle().goto(x, y)


def setx(x: float) -> None:
    return _turtle().setx(x)


def sety(y: float) -> None:
    return _turtle().sety(y)


def setheading(to_angle: float) -> None:
    return _turtle().setheading(to_angle)


def home() -> None:
    return _turtle().home()


def circle(radius: float, extent: Optional[float] = None, steps: Optional[int] = None) -> None:
    return _turtle().circle(radius, extent, steps)


def dot(size: Optional[float] = None, color: Optional[Color] = None) -> None:
    return _turtle().dot(size, color)


def pendown() -> None:
    return _turtle().pendown()


def penup() -> None:
    return _turtle().penup()


def isdown() -> bool:
    return _turtle().isdown()


def pensize(width: Optional[float] = None) -> float:
    return _turtle().pensize(width)


def pencolor(color: Optional[Color] = None) -> Color:
    return _turtle().pencolor(color)


def hideturtle() -> None:
    return _turtle().hideturtle()


def showturtle() -> None:
    return _turtle().showturtle()


def isvisible() -> bool:
    return _turtle().isvisible()


def position() -> Vec2D:
    return _turtle().position()


def xcor() -> float:
    return _turtle().xcor()


def ycor() -> float:
    return _turtle().ycor()


def heading() -> float:
    return _turtle().heading()


def speed(speed: Optional[int] = None) -> None:
    return _turtle().speed(speed)


def color(color: Optional[Color] = None) -> None:
    return _turtle().color(color)


def towards(x: Union[float, Tuple[float, float]], y: Optional[float] = None) -> float:
    return _turtle().towards(x, y)


def distance(x: Union[float, Tuple[float, float]], y: Optional[float] = None) -> float:
    return _turtle().distance(x, y)


def write(arg, move: bool = False, align: str = "left", font: Tuple[str, int, str] = ("Arial", 8, "normal")) -> None:
    return _turtle().write(arg, move=move, align=align, font=font)


def window_width() -> int:
    return _SIZE


def window_height() -> int:
    return _SIZE


fd = forward
back = backward
bk = backward
rt = right
lt = left
setpos = goto
setposition = goto
seth = setheading
pd = pendown
down = pendown
pu = penup
up = penup
ht = hideturtle
st = showturtle
pos = position
