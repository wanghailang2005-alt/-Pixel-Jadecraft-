"""Rebuild the workshop icon atlas from the user-supplied concept image."""
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'docs/concept-art/09-workshop-interface.png'
DESTINATION = ROOT / 'src/assets/workshop-reference/workshop-icons.png'
CROPS = [
    ('jade-white', (766, 167, 786, 187)),
    ('jade-green', (766, 195, 786, 215)),
    ('jade-black', (766, 223, 786, 243)),
    ('magnifier', (790, 257, 817, 284)),
    ('scales', (834, 257, 861, 284)),
    ('pickaxe', (877, 257, 904, 284)),
    ('chisel', (920, 257, 947, 284)),
    ('cloud', (782, 415, 816, 450)),
    ('dragon', (849, 415, 884, 450)),
    ('grain', (918, 415, 952, 450)),
    ('raw-green', (111, 382, 147, 418)),
    ('raw-white', (173, 382, 209, 418)),
    ('shelf-dragon', (520, 382, 556, 418)),
    ('shelf-fish', (578, 382, 613, 418)),
]


def main():
    source = Image.open(SOURCE).convert('RGBA')
    atlas = Image.new('RGBA', (224, 64), (0, 0, 0, 0))
    for index, (_, bounds) in enumerate(CROPS):
        tile = source.crop(bounds)
        tile.thumbnail((28, 28), Image.Resampling.NEAREST)
        x = index % 7 * 32 + (32 - tile.width) // 2
        y = index // 7 * 32 + (32 - tile.height) // 2
        atlas.alpha_composite(tile, (x, y))
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(DESTINATION)


if __name__ == '__main__':
    main()
