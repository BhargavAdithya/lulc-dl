<a name="top"></a>

<div align="center">

# 🛰️ LandCover AI

### Sentinel-2 Satellite Image Land Use & Land Cover Classification

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://landcover-frontend.vercel.app)
[![Model](https://img.shields.io/badge/Model-HuggingFace-orange?style=for-the-badge&logo=huggingface)](https://huggingface.co/bhargav37/lulc-dl-model)
[![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://landcover-backend.onrender.com/health)
[![Model Server](https://img.shields.io/badge/Model%20Server-HF%20Spaces-yellow?style=for-the-badge&logo=huggingface)](https://huggingface.co/spaces/bhargav37/landcover-model-server)

<br/>

![Banner](https://img.shields.io/badge/Sentinel--2-13%20Band%20TIF-blue?style=flat-square) ![Classes](https://img.shields.io/badge/Classes-6%20Land%20Cover-green?style=flat-square) ![Architecture](https://img.shields.io/badge/Model-U--Net-red?style=flat-square)

</div>

---

## 🌍 About

**LandCoverAI** is a full-stack geospatial web application that classifies land use and land cover from **Sentinel-2 multispectral satellite imagery**. Users upload a 13-band `.TIF` image and receive AI-powered segmentation results across **6 land cover classes** — instantly, in the browser.

The deep learning model behind this app is a **U-Net** trained on Sentinel-2 imagery. → [View Model & Training Details](https://huggingface.co/bhargav37/lulc-dl-model)

---

## ✨ Features

- 📡 **Upload** any Sentinel-2 13-band `.TIF` satellite image
- ⚙️ **Automatic preprocessing** — computes NDVI, NDWI, NDBI indices and stacks 16 input features
- 🧠 **U-Net inference** via sliding window prediction
- 🗺️ **Three visual outputs**, all downloadable:
  - Segmentation Mask
  - RGB + Classified Overlay
  - Annotated image with class labels & confidence scores
- 📊 **Class coverage statistics** with bar chart breakdown
- 🔄 **Sequential loading steps** showing preprocessing → inference → output generation

---

## 🏷️ Land Cover Classes

| Class | Colour |
|---|---|
| 🟫 Barren Land | Sandy Brown |
| 🔴 Built-up Area | Crimson |
| 🟡 Crop | Yellow |
| 🟢 Forest | Green |
| 🔵 Water | Blue |
| ⚫ Unclassified | Black |

---

## 🏗️ Architecture

```
Browser (Next.js)
      ↓  uploads .TIF
Render (Express Backend)
      ↓  forwards file
HuggingFace Spaces (Flask Model Server)
      ↓  preprocesses → predicts → plots
      ↑  returns 3 PNG outputs + stats
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14, TypeScript, CSS |
| **Backend** | Node.js, Express.js |
| **Model Server** | Python, Flask, TensorFlow, Keras |
| **Preprocessing** | Rasterio, NumPy, SciPy |
| **Visualisation** | Matplotlib |
| **Model Storage** | HuggingFace Hub |
| **Frontend Deploy** | Vercel |
| **Backend Deploy** | Render |
| **Model Server Deploy** | HuggingFace Spaces (Docker) |

---

## 🚀 Deployment

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | [landcover-frontend.vercel.app](https://landcover-frontend.vercel.app) |
| Backend API | Render | [landcover-backend.onrender.com](https://landcover-backend.onrender.com/health) |
| Model Server | HF Spaces | [bhargav37/landcover-model-server](https://huggingface.co/spaces/bhargav37/landcover-model-server) |
| DL Model | HF Hub | [bhargav37/lulc-dl-model](https://huggingface.co/bhargav37/lulc-dl-model) |

> ⚠️ **Note:** The backend and model server run on free tiers and may take **30–60 seconds** to wake up after inactivity. Please be patient on the first request.

---

## 🤝 Acknowledgements

<div align="center">

Built under the guidance and support of:

**IIT Tirupati** · **IITT NIF** · **NM-ICPS** · **Siddhartha Academy of Higher Education**

<br/>

*Made with ❤️ for geospatial analysis*

*Powered by **Geointell Labs** · **STAR-PNT Labs***

</div>

---

<div align="center">

[⬆️ Back to Top](#top)

</div>