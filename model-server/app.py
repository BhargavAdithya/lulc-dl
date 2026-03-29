import os
import io
import base64
import numpy as np
import rasterio
import scipy.ndimage
import matplotlib
matplotlib.use('Agg')
import tempfile
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import matplotlib.patches as mpatches
from huggingface_hub import hf_hub_download
from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model

app = Flask(__name__)
CORS(app)

# ── Load Model from HuggingFace ───────────────────────────────
HF_REPO = "bhargav37/lulc-dl-model"   # ← change this
HF_FILE = "landcover_unet_model.h5"            # ← change if filename differs

print("⏳  Downloading model from HuggingFace...")
MODEL_PATH = hf_hub_download(repo_id=HF_REPO, filename=HF_FILE)
model = load_model(MODEL_PATH)
print("✅  Model loaded successfully!")

# ── Constants ─────────────────────────────────────────────────
CLASS_NAMES   = ['Barren_Land', 'Built-up_Area', 'Crop', 'Forest', 'Water', 'Unclassified']
MPL_COLORS    = ['sandybrown', 'red', 'yellow', 'green', 'blue', 'black']
LEGEND_COLORS = ['#f4a460', '#dc143c', '#ffff00', '#008000', '#0000ff', '#000000']
OVERLAY_COLORS = np.array([
    [244, 164,  96],
    [220,  20,  60],
    [255, 255,   0],
    [  0, 128,   0],
    [  0,   0, 255],
    [  0,   0,   0],
], dtype=np.float32) / 255.0

# ── Preprocessing ─────────────────────────────────────────────
def clean_band(b):
    return np.nan_to_num(b, nan=0.0, posinf=0.0, neginf=0.0)

def preprocess_tif(path):
    with rasterio.open(path) as src:
        B1  = src.read(1).astype('float32')
        B2  = src.read(2).astype('float32')
        B3  = src.read(3).astype('float32')
        B4  = src.read(4).astype('float32')
        B5  = src.read(5).astype('float32')
        B6  = src.read(6).astype('float32')
        B7  = src.read(7).astype('float32')
        B8  = src.read(8).astype('float32')
        B8A = src.read(9).astype('float32')
        B9  = src.read(10).astype('float32')
        SCL = src.read(11).astype('float32')
        B11 = src.read(12).astype('float32')
        B12 = src.read(13).astype('float32')

    B3  = clean_band(B3)
    B4  = clean_band(B4)
    B8  = clean_band(B8)
    B11 = clean_band(B11)

    NDVI = (B8  - B4)  / (B8  + B4  + 1e-8)
    NDBI = (B11 - B8)  / (B11 + B8  + 1e-8)
    NDWI = (B3  - B11) / (B3  + B11 + 1e-8)

    stacked = np.stack(
        [NDVI, NDBI, NDWI, B1, B2, B3, B4, B5, B6, B7, B8, B8A, B9, SCL, B11, B12],
        axis=-1
    )
    return stacked, B4, B3, B2  # stacked + RGB bands

# ── Inference ─────────────────────────────────────────────────
def sliding_window(image, patch_size=64, stride=32):
    H, W, _ = image.shape
    n_cls    = model.output_shape[-1]
    out      = np.zeros((H, W, n_cls), dtype=np.float32)
    cnt      = np.zeros((H, W, 1),     dtype=np.float32)

    for r in range(0, H - patch_size + 1, stride):
        for c in range(0, W - patch_size + 1, stride):
            patch = image[r:r+patch_size, c:c+patch_size]
            pred  = model.predict(patch[np.newaxis], verbose=0)[0]
            out[r:r+patch_size, c:c+patch_size] += pred
            cnt[r:r+patch_size, c:c+patch_size] += 1

    cnt[cnt == 0] = 1
    out /= cnt
    return np.argmax(out, axis=-1), np.max(out, axis=-1)

# ── RGB composite ─────────────────────────────────────────────
def make_rgb(red, green, blue):
    mask = (red + green + blue) > 0
    rgb  = np.dstack((red, green, blue))
    lo   = np.percentile(rgb[mask], 2)
    hi   = np.percentile(rgb[mask], 98)
    img  = np.clip((rgb - lo) / (hi - lo + 1e-8), 0, 1)
    img[~mask] = 1.0
    return img

# ── Figure helpers ────────────────────────────────────────────
def fig_to_b64(fig, dpi=150):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=dpi)
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode()
    plt.close(fig)
    return b64

# ── Plot 1: Segmentation Mask ─────────────────────────────────
def plot_segmentation(mask):
    cmap   = mcolors.ListedColormap(MPL_COLORS)
    bounds = np.arange(len(CLASS_NAMES) + 1) - 0.5
    norm   = mcolors.BoundaryNorm(bounds, cmap.N)

    fig, ax = plt.subplots(figsize=(6, 6))
    ax.imshow(mask, cmap=cmap, norm=norm)
    ax.axis('off')
    ax.set_title('Segmentation Mask', fontsize=14, pad=10)
    patches = [mpatches.Patch(color=MPL_COLORS[i], label=CLASS_NAMES[i]) for i in range(len(CLASS_NAMES))]
    ax.legend(handles=patches, loc='upper right', title='Classes', fontsize=9, title_fontsize=11)
    return fig_to_b64(fig)

# ── Plot 2: RGB + Classified Overlay ─────────────────────────
def plot_overlay(rgb, mask):
    classified = OVERLAY_COLORS[mask]
    overlay    = 0.5 * rgb + 0.5 * classified

    fig, axs = plt.subplots(1, 2, figsize=(18, 9))
    axs[0].imshow(rgb);     axs[0].set_title('Original Image',     fontsize=16); axs[0].axis('off')
    axs[1].imshow(overlay); axs[1].set_title('Classified Overlay', fontsize=16); axs[1].axis('off')
    patches = [mpatches.Patch(color=LEGEND_COLORS[i], label=CLASS_NAMES[i]) for i in range(len(CLASS_NAMES))]
    axs[1].legend(handles=patches, loc='upper right', title='Classes', fontsize=11, title_fontsize=13)
    plt.tight_layout()
    return fig_to_b64(fig)

# ── Plot 3: Annotated ─────────────────────────────────────────
def plot_annotated(rgb, mask, confidence):
    fig, ax = plt.subplots(figsize=(7, 7))
    ax.imshow(rgb)
    ax.set_title('Annotated Land Cover Types', fontsize=13)
    ax.axis('off')

    for cls_name in ['Built-up_Area', 'Crop', 'Water']:
        idx      = CLASS_NAMES.index(cls_name)
        cls_mask = mask == idx
        if not np.any(cls_mask):
            continue

        labeled, _ = scipy.ndimage.label(cls_mask)
        counts     = np.bincount(labeled.flat)[1:]
        if len(counts) == 0:
            continue

        region = labeled == (np.argmax(counts) + 1)
        ys, xs = np.where(region)
        yc, xc = int(np.mean(ys)), int(np.mean(xs))
        conf   = confidence[yc, xc]
        color  = OVERLAY_COLORS[idx]

        ax.scatter(xc, yc, s=80, color=color, edgecolors='white', linewidths=1.5, zorder=4)
        ax.plot([xc, xc + 30], [yc, yc], color=color, lw=2, zorder=3)
        ax.text(
            xc + 33, yc,
            f"{cls_name}: {conf * 100:.1f}%",
            fontsize=10, color='black', ha='left', va='center', weight='bold', zorder=5,
            bbox=dict(boxstyle='round,pad=0.3', fc=color, ec='white', lw=1.5, alpha=0.95)
        )

    plt.tight_layout()
    return fig_to_b64(fig)

# ── Class coverage stats ──────────────────────────────────────
def class_stats(mask):
    total = mask.size
    return {
        name: round(float(np.sum(mask == i)) / total * 100, 2)
        for i, name in enumerate(CLASS_NAMES)
    }

# ── Routes ────────────────────────────────────────────────────
@app.route('/health')
def health():
    return jsonify({'status': 'ok'})

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    f = request.files['file']
    if not f.filename.lower().endswith('.tif'):
        return jsonify({'error': 'Only .tif files are supported'}), 400

    tmp_path = os.path.join(tempfile.gettempdir(), f.filename)
    f.save(tmp_path)

    try:
        image, red, green, blue = preprocess_tif(tmp_path)
        predicted, confidence   = sliding_window(image)

        # Mark no-data pixels as Unclassified
        predicted[~np.any(image != 0, axis=-1)] = 5

        rgb = make_rgb(red, green, blue)

        return jsonify({
            'segmentation_mask': plot_segmentation(predicted),
            'overlay':           plot_overlay(rgb, predicted),
            'annotated':         plot_annotated(rgb, predicted, confidence),
            'class_stats':       class_stats(predicted),
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)