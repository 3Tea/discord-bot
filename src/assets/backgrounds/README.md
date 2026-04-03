# Rank Card Backgrounds

Drop `.jpg` or `.png` images here for random rank card backgrounds.

## Requirements

- **Minimum size**: 934x350 px (card will crop/scale to fit)
- **Dark tone recommended**: A dark overlay is applied, but darker images produce better results
- **Landscape orientation**: Wide images work best

## How it works

- The bot scans this folder on startup for `.jpg` and `.png` files
- Each `/rank` call picks a random background
- If no images are found, the default gradient background is used
- Adding/removing images requires a bot restart to take effect
