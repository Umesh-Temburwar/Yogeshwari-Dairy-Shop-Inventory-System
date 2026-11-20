import os
from PIL import Image, ImageDraw

def create_circular_mask(size):
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0) + size, fill=255)
    return mask

def generate_assets():
    src_logo_path = 'public/YDO_logo.png'
    res_dir = 'android/app/src/main/res'
    
    if not os.path.exists(src_logo_path):
        print(f"Error: {src_logo_path} not found")
        return
        
    logo = Image.open(src_logo_path).convert('RGBA')
    
    # 1. Launcher icons
    mipmaps = {
        'mipmap-mdpi': (48, 108),
        'mipmap-hdpi': (72, 162),
        'mipmap-xhdpi': (96, 216),
        'mipmap-xxhdpi': (144, 324),
        'mipmap-xxxhdpi': (192, 432),
    }
    
    for folder, (icon_size, fg_size) in mipmaps.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # Standard icon (with subtle rounding or full image)
        icon = logo.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        icon.save(os.path.join(folder_path, 'ic_launcher.png'), 'PNG')
        
        # Round icon (pure circle mask)
        round_icon = Image.new('RGBA', (icon_size, icon_size), (0, 0, 0, 0))
        round_icon.paste(icon, (0, 0))
        mask = create_circular_mask((icon_size, icon_size))
        round_icon.putalpha(mask)
        round_icon.save(os.path.join(folder_path, 'ic_launcher_round.png'), 'PNG')
        
        # Adaptive foreground (icon centered in safe zone ~66% of fg_size)
        fg_canvas = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
        inner_size = int(fg_size * 0.68)
        inner_logo = logo.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
        offset = (fg_size - inner_size) // 2
        fg_canvas.paste(inner_logo, (offset, offset), inner_logo)
        fg_canvas.save(os.path.join(folder_path, 'ic_launcher_foreground.png'), 'PNG')
        print(f"Generated icons for {folder}: {icon_size}x{icon_size}, fg={fg_size}x{fg_size}")

    # 2. Splash screens
    splash_dirs = {
        'drawable': (480, 800),
        'drawable-port-mdpi': (320, 480),
        'drawable-port-hdpi': (480, 800),
        'drawable-port-xhdpi': (720, 1280),
        'drawable-port-xxhdpi': (960, 1600),
        'drawable-port-xxxhdpi': (1280, 1920),
        'drawable-land-mdpi': (480, 320),
        'drawable-land-hdpi': (800, 480),
        'drawable-land-xhdpi': (1280, 720),
        'drawable-land-xxhdpi': (1600, 960),
        'drawable-land-xxxhdpi': (1920, 1280),
    }

    bg_color = (11, 18, 16, 255) # #0B1210 dark green theme
    
    for folder, (width, height) in splash_dirs.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        splash = Image.new('RGBA', (width, height), bg_color)
        
        # Center logo - scale to ~35% of min dimension
        min_dim = min(width, height)
        logo_size = int(min_dim * 0.42)
        splash_logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
        
        pos_x = (width - logo_size) // 2
        pos_y = (height - logo_size) // 2
        splash.paste(splash_logo, (pos_x, pos_y), splash_logo)
        
        splash.save(os.path.join(folder_path, 'splash.png'), 'PNG')
        print(f"Generated splash for {folder}: {width}x{height}")

    print("All Android launcher icons and splash screens generated successfully!")

if __name__ == '__main__':
    generate_assets()
