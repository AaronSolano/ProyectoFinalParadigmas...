"""Original demo diagrams. Regenerate with Python + Pillow (development only)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / 'assets' / 'demo'
OUT.mkdir(parents=True, exist_ok=True)

def font(size):
    for name in ('C:/Windows/Fonts/arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        if Path(name).exists():
            return ImageFont.truetype(name, size)
    return ImageFont.load_default(size=size)

def base(title):
    image = Image.new('RGB', (640, 360), '#eef4fc')
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 640, 72), fill='#162b4d')
    draw.text((32, 21), title, font=font(28), fill='white')
    return image, draw

def arrow(draw, start, end, color='#162b4d'):
    draw.line((start, end), fill=color, width=5)
    x,y=end
    if end[1] > start[1]: points=[(x,y),(x-8,y-12),(x+8,y-12)]
    else: points=[(x,y),(x-8,y+12),(x+8,y+12)]
    draw.polygon(points, fill=color)

image, draw = base('Una decisión, dos caminos')
draw.polygon([(320,94),(430,163),(320,232),(210,163)], fill='#f7c858', outline='#162b4d', width=3)
draw.text((269,149), '¿llueve?', font=font(24), fill='#162b4d')
draw.line([(210,163),(130,163),(130,267)], fill='#162b4d', width=4)
draw.line([(430,163),(510,163),(510,267)], fill='#162b4d', width=4)
draw.text((145,132), 'Sí', font=font(22), fill='#162b4d')
draw.text((455,132), 'No', font=font(22), fill='#162b4d')
for x,label in [(45,'Llevar paraguas'),(425,'Salir sin él')]:
    draw.rounded_rectangle((x,263,x+175,325), radius=12, fill='#168176')
    draw.text((x+12,283), label, font=font(19), fill='white')
image.save(OUT/'decision.png', optimize=True)

image, draw = base('Pila: último en entrar, primero en salir')
for y,label,color in [(252,'A · primero','#3e6fa8'),(186,'B · segundo','#238d99'),(120,'C · último','#f7c858')]:
    draw.rounded_rectangle((190,y,450,y+57), radius=8, fill=color)
    draw.text((241,y+15), label, font=font(23), fill='#162b4d' if label.startswith('C') else 'white')
arrow(draw,(130,110),(130,177)); draw.text((48,193),'ENTRA',font=font(21),fill='#162b4d')
arrow(draw,(510,177),(510,110)); draw.text((484,193),'SALE',font=font(21),fill='#162b4d')
draw.text((205,324),'Orden de salida: C, B, A',font=font(19),fill='#162b4d')
image.save(OUT/'pila.png', optimize=True)
for asset in OUT.glob('*.png'):
    assert asset.stat().st_size < 100_000
    print(asset.name, asset.stat().st_size)
